import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class TmdbService {
  private readonly base = 'https://api.themoviedb.org/3';
  private readonly key?: string;
  private readonly readAccessToken?: string;
  private readonly genreMap = new Map<
    MediaType,
    { cachedAt: number; values: Record<number, string> }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.key = this.config.get<string>('TMDB_API_KEY');
    this.readAccessToken = this.config.get<string>('TMDB_READ_ACCESS_TOKEN');
    if (!this.key && !this.readAccessToken) {
      throw new Error(
        'TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN doit être défini',
      );
    }
  }

  private client() {
    const headers: Record<string, string> = {};
    const params: Record<string, string> = {};
    if (this.readAccessToken) {
      headers.Authorization = `Bearer ${this.readAccessToken}`;
    } else if (this.key) {
      params.api_key = this.key;
    }
    return axios.create({
      baseURL: this.base,
      headers,
      params,
      timeout: 15000,
    });
  }

  async search(
    query: string,
    page: number,
    year?: number,
    genreId?: number,
    minVote?: number,
    mediaType?: 'movie' | 'tv',
    creator?: string,
  ) {
    if (creator) {
      return this.searchByCreator(creator, query, page, year, minVote, mediaType);
    }
    const c = this.client();
    const { data } = await c.get('/search/multi', {
      params: {
        query,
        page,
        include_adult: false,
        year: year || undefined,
      },
    });
    let results = (data.results ?? []) as Record<string, unknown>[];
    if (mediaType) {
      results = results.filter((r) => r.media_type === mediaType);
    }
    if (genreId) {
      results = results.filter((r) => {
        const ids = (r.genre_ids as number[] | undefined) ?? [];
        return ids.includes(genreId);
      });
    }
    if (typeof minVote === 'number') {
      results = results.filter((r) => {
        const vote = Number(r.vote_average ?? 0);
        return vote >= minVote;
      });
    }
    return {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results,
    };
  }

  private async searchByCreator(
    creator: string,
    query: string,
    page: number,
    year?: number,
    minVote?: number,
    mediaType?: 'movie' | 'tv',
  ) {
    const c = this.client();
    const people = await c.get('/search/person', {
      params: { query: creator, page: 1, include_adult: false },
    });
    const personId = people.data.results?.[0]?.id as number | undefined;
    if (!personId) return { page, total_pages: 1, total_results: 0, results: [] };
    const credits = await c.get(`/person/${personId}/combined_credits`);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const unique = new Map<string, Record<string, unknown>>();
    for (const result of [...(credits.data.crew ?? []), ...(credits.data.cast ?? [])] as Record<string, unknown>[]) {
      const key = `${result.media_type}-${result.id}`;
      if (!unique.has(key)) unique.set(key, result);
    }
    const matching = [...unique.values()]
      .filter((result) => {
        if (mediaType && result.media_type !== mediaType) return false;
        if (typeof minVote === 'number' && Number(result.vote_average ?? 0) < minVote) return false;
        if (year) {
          const releaseYear = String(result.release_date ?? result.first_air_date ?? '').slice(0, 4);
          if (releaseYear !== String(year)) return false;
        }
        if (!normalizedQuery) return true;
        const title = String(result.title ?? result.name ?? '').toLocaleLowerCase();
        return title.includes(normalizedQuery);
      })
      .sort((a, b) => Number(b.popularity ?? 0) - Number(a.popularity ?? 0));
    const pageSize = 20;
    const results = matching.slice((page - 1) * pageSize, page * pageSize);
    return {
      page,
      total_pages: Math.max(1, Math.ceil(matching.length / pageSize)),
      total_results: matching.length,
      results,
    };
  }

  async discover(
    mediaType: MediaType,
    page: number,
    sortBy: string,
    year?: number,
    genreId?: number,
    minVote?: number,
  ) {
    const path =
      mediaType === MediaType.MOVIE ? '/discover/movie' : '/discover/tv';
    const c = this.client();
    const { data } = await c.get(path, {
      params: {
        page,
        sort_by: sortBy,
        primary_release_year: mediaType === MediaType.MOVIE ? year : undefined,
        first_air_date_year: mediaType === MediaType.TV ? year : undefined,
        with_genres: genreId,
        'vote_average.gte': minVote,
      },
    });
    return data;
  }

  async resolveGenres(mediaType: MediaType, ids: number[] | undefined) {
    if (!ids?.length) return [];
    const mapping = await this.getGenreMap(mediaType);
    return ids.map((id) => mapping[id]).filter(Boolean);
  }

  private async getGenreMap(mediaType: MediaType) {
    const cached = this.genreMap.get(mediaType);
    if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
      return cached.values;
    }
    const path =
      mediaType === MediaType.MOVIE ? '/genre/movie/list' : '/genre/tv/list';
    const c = this.client();
    const { data } = await c.get(path);
    const values = Object.fromEntries(
      ((data.genres as { id: number; name: string }[]) ?? []).map((g) => [
        g.id,
        g.name,
      ]),
    );
    this.genreMap.set(mediaType, { cachedAt: Date.now(), values });
    return values;
  }

  async getDetails(mediaType: MediaType, tmdbId: number) {
    const cached = await this.prisma.cachedWork.findUnique({
      where: {
        tmdbId_mediaType: { tmdbId, mediaType },
      },
    });
    const now = Date.now();
    if (cached && now - cached.cachedAt.getTime() < CACHE_MS) {
      return { source: 'cache' as const, data: cached.payload };
    }
    const path =
      mediaType === MediaType.MOVIE ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const c = this.client();
    const { data } = await c.get(path, {
      params: { append_to_response: 'credits,videos' },
    });
    if (!data) {
      throw new NotFoundException('Œuvre introuvable');
    }
    const title =
      mediaType === MediaType.MOVIE
        ? (data.title as string)
        : (data.name as string);
    const releaseDate =
      mediaType === MediaType.MOVIE
        ? (data.release_date as string | null)
        : (data.first_air_date as string | null);
    const runtime =
      mediaType === MediaType.MOVIE
        ? (data.runtime as number | null)
        : ((data.episode_run_time?.[0] as number | undefined) ?? null);
    await this.prisma.cachedWork.upsert({
      where: { tmdbId_mediaType: { tmdbId, mediaType } },
      create: {
        tmdbId,
        mediaType,
        title,
        posterPath: (data.poster_path as string | null) ?? null,
        overview: (data.overview as string) ?? '',
        releaseDate: releaseDate ?? undefined,
        runtime: runtime ?? undefined,
        payload: data as object,
      },
      update: {
        title,
        posterPath: (data.poster_path as string | null) ?? null,
        overview: (data.overview as string) ?? '',
        releaseDate: releaseDate ?? undefined,
        runtime: runtime ?? undefined,
        payload: data as object,
        cachedAt: new Date(),
      },
    });
    return { source: 'live' as const, data };
  }

  posterUrl(path: string | null | undefined) {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/w500${path}`;
  }

  /** Résout les titres depuis le cache TMDB (ou fetch si absent). */
  async resolveTitles(
    works: { tmdbId: number; mediaType: MediaType }[],
  ): Promise<Record<string, string>> {
    if (!works.length) return {};
    const unique = [
      ...new Map(
        works.map((w) => [`${w.mediaType}:${w.tmdbId}`, w] as const),
      ).values(),
    ];
    const cached = await this.prisma.cachedWork.findMany({
      where: {
        OR: unique.map((w) => ({
          tmdbId: w.tmdbId,
          mediaType: w.mediaType,
        })),
      },
      select: { tmdbId: true, mediaType: true, title: true },
    });
    const out: Record<string, string> = {};
    for (const c of cached) {
      out[`${c.mediaType}:${c.tmdbId}`] = c.title;
    }
    const missing = unique.filter((w) => !out[`${w.mediaType}:${w.tmdbId}`]);
    await Promise.all(
      missing.map(async (w) => {
        try {
          const res = await this.getDetails(w.mediaType, w.tmdbId);
          const data = res.data as { title?: string; name?: string };
          out[`${w.mediaType}:${w.tmdbId}`] =
            w.mediaType === MediaType.MOVIE
              ? (data.title ?? `Film #${w.tmdbId}`)
              : (data.name ?? `Série #${w.tmdbId}`);
        } catch {
          out[`${w.mediaType}:${w.tmdbId}`] =
            w.mediaType === MediaType.MOVIE
              ? `Film #${w.tmdbId}`
              : `Série #${w.tmdbId}`;
        }
      }),
    );
    return out;
  }
}
