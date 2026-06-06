import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RecommendationsController } from '../src/recommendations/recommendations.controller';
import { RecommendationsService } from '../src/recommendations/recommendations.service';
import { HomeController } from '../src/home/home.controller';
import { HomeService } from '../src/home/home.service';
import { OptionalJwtAuthGuard } from '../src/common/guards/optional-jwt.guard';
import { EngagementController } from '../src/engagement/engagement.controller';
import { EngagementService } from '../src/engagement/engagement.service';
import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';

class TestJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { sub: 'user-test', email: 'test@kino.local', role: 'USER' };
    return true;
  }
}

class TestOptionalJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { sub: 'user-test', email: 'test@kino.local', role: 'USER' };
    return true;
  }
}

describe('Targeted API e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        UsersController,
        RecommendationsController,
        HomeController,
        EngagementController,
        NotificationsController,
      ],
      providers: [
        AppService,
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(
              async (
                email: string,
                _password: string,
                displayName: string,
              ) => ({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: { email, displayName },
              }),
            ),
            login: jest.fn(async () => ({
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
            })),
            refresh: jest.fn(),
            logout: jest.fn(),
            issueTokens: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            me: jest.fn(async () => ({ id: 'user-test', displayName: 'Test' })),
            updateMe: jest.fn(),
            exportData: jest.fn(async () => ({ ok: true })),
            exportCsv: jest.fn(async () => 'kind,id,tmdbId\nstatus,s1,1'),
            publicProfile: jest.fn(),
            profileLists: jest.fn(async () => [
              { id: 'list-public', name: 'Public picks', isPublic: true },
            ]),
            followers: jest.fn(),
            following: jest.fn(),
            follow: jest.fn(),
            unfollow: jest.fn(),
            deleteMe: jest.fn(async () => ({ ok: true })),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3001' },
        },
        {
          provide: RecommendationsService,
          useValue: {
            tonight: jest.fn(async () => ({
              personalized: false,
              source: 'random',
              results: [
                {
                  id: 550,
                  title: 'Fight Club',
                  mediaType: 'movie',
                  score: 8.4,
                },
              ],
            })),
            swipe: jest.fn(async () => ({ ok: true })),
          },
        },
        {
          provide: HomeService,
          useValue: {
            getHome: jest.fn(async () => ({
              trending: { movies: [], tv: [] },
              latestRatings: [],
              recentWatched: [],
              categories: [],
            })),
          },
        },
        {
          provide: EngagementService,
          useValue: {
            summary: jest.fn(async () => ({
              authenticated: true,
              weekly: {
                reviews: 2,
                completed: 3,
                targetReviews: 3,
                targetCompleted: 5,
              },
              streakDays: 4,
              recommendationRefreshAt: new Date().toISOString(),
            })),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            list: jest.fn(async () => []),
            registerPushToken: jest.fn(async (_userId, token, platform) => ({ token, platform })),
            removePushToken: jest.fn(async () => ({ ok: true })),
            markRead: jest.fn(async () => ({ ok: true })),
            markAllRead: jest.fn(async () => ({ ok: true })),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtGuard)
      .overrideGuard(OptionalJwtAuthGuard)
      .useClass(TestOptionalJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1 returns health string', () => {
    return request(app.getHttpServer())
      .get('/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /v1/healthz returns a monitoring payload', async () => {
    const res = await request(app.getHttpServer()).get('/v1/healthz').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /v1/auth/register rejects weak password', () => {
    const body: RegisterDto = {
      email: 'u@x.com',
      displayName: 'u',
      password: 'weak',
    };
    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(body)
      .expect(400);
  });

  it('POST /v1/auth/register rejects invalid email with an explicit message', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: 'not-an-email',
        displayName: 'User',
        password: 'StrongP4ssword',
      })
      .expect(400);
    expect(res.body.message).toContain('Adresse e-mail invalide');
  });

  it('POST /v1/auth/register returns token payload when valid', async () => {
    const body: RegisterDto = {
      email: 'u@x.com',
      displayName: 'User',
      password: 'StrongP4ssword',
    };
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(body)
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /v1/auth/logout revokes a refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: 'refresh-token-valid' })
      .expect(201);
    expect(res.body).toBeDefined();
  });

  it('GET /v1/users/export.csv returns downloadable csv', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/export.csv')
      .set('Authorization', 'Bearer any')
      .expect(200);
    expect(res.text).toContain('kind,id,tmdbId');
    expect(String(res.headers['content-type'])).toContain('text/csv');
  });

  it('DELETE /v1/users/me removes the current account', async () => {
    const res = await request(app.getHttpServer())
      .delete('/v1/users/me')
      .set('Authorization', 'Bearer any')
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /v1/users/:id/lists returns profile-visible lists', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/user-test/lists')
      .expect(200);
    expect(res.body).toEqual([
      { id: 'list-public', name: 'Public picks', isPublic: true },
    ]);
  });

  it('GET /v1/reco/tonight returns recommendation payload', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/reco/tonight?type=movie&limit=5')
      .expect(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('POST /v1/reco/swipe accepts smash/pass input', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/reco/swipe')
      .set('Authorization', 'Bearer any')
      .send({ tmdbId: 550, type: 'movie', choice: 'SMASH' })
      .expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('GET /v1/home returns aggregate sections', async () => {
    const res = await request(app.getHttpServer()).get('/v1/home').expect(200);
    expect(res.body).toHaveProperty('trending');
    expect(res.body).toHaveProperty('categories');
  });

  it('GET /v1/engagement/summary returns streak and weekly counters', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/engagement/summary')
      .expect(200);
    expect(res.body).toHaveProperty('streakDays');
    expect(res.body).toHaveProperty('weekly');
  });

  it('POST /v1/notifications/push-token registers a native device', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/notifications/push-token')
      .set('Authorization', 'Bearer any')
      .send({ token: 'ExponentPushToken[test-device-token]', platform: 'android' })
      .expect(201);
    expect(res.body.platform).toBe('android');
  });
});
