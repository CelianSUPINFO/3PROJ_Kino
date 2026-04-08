import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_MS = 48 * 60 * 60 * 1000;
const SEARCH_MULTI_CACHE_MS = 15 * 60 * 1000;
const SEARCH_MULTI_CACHE_MAX = 200;

type SearchMultiPayload = {
  page: number;
  total_pages: number;
  total_results: number;
  results: Record<string, unknown>[];
};

@Injectable()
export class TmdbService {
  private readonly base = 'https://api.themoviedb.org/3';
  private readonly key?: string;
  private readonly readAccessToken?: string;
  private readonly genreMap = new Map<
    MediaType,
    { cachedAt: number; values: Record<number, string> }
  >();
  private readonly searchMultiCache = new Map<
    string,
    { cachedAt: number; payload: SearchMultiPayload }
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

  private searchMultiCacheKey(
    query: string,
    page: number,
    year?: number,
    genreId?: number,
    minVote?: number,
    mediaType?: 'movie' | 'tv',
  ) {
    return [
      query.trim().toLowerCase(),
      page,
      year ?? '',
      genreId ?? '',
      minVote ?? '',
      mediaType ?? '',
    ].join('\0');
  }

  async search(
    query: string,
    page: number,
    year?: number,
    genreId?: number,
    minVote?: number,
    mediaType?: 'movie' | 'tv',
  ) {
    const cacheKey = this.searchMultiCacheKey(
      query,
      page,
      year,
      genreId,
      minVote,
      mediaType,
    );
    const cached = this.searchMultiCache.get(cacheKey);
    if (
      cached &&
      Date.now() - cached.cachedAt < SEARCH_MULTI_CACHE_MS
    ) {
      return {
        ...cached.payload,
        results: [...cached.payload.results],
      };
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
    const payload: SearchMultiPayload = {
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results,
    };
    if (this.searchMultiCache.size >= SEARCH_MULTI_CACHE_MAX) {
      const oldest = this.searchMultiCache.keys().next().value as
        | string
        | undefined;
      if (oldest !== undefined) {
        this.searchMultiCache.delete(oldest);
      }
    }
    this.searchMultiCache.set(cacheKey, {
      cachedAt: Date.now(),
      payload,
    });
    return {
      ...payload,
      results: [...results],
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
}
