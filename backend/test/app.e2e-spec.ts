import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: async () => undefined,
        onModuleDestroy: async () => undefined,
        $connect: async () => undefined,
        $disconnect: async () => undefined,
        user: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
        },
        patient: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
        appointment: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
        treatmentNote: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
        exercisePlan: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
        exerciseItem: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          aggregate: async () => ({ _max: { sortOrder: null } }),
        },
        progressRecord: {
          findMany: async () => [],
          findUnique: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          ok: true,
          service: 'thera-care-api',
        });
      });
  });

  it('/users (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/users').expect(401);
  });

  it('/patients (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/patients').expect(401);
  });

  it('/appointments (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/appointments').expect(401);
  });

  it('/treatment-notes (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/treatment-notes').expect(401);
  });

  it('/exercise-plans (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/exercise-plans').expect(401);
  });

  it('/progress (GET) without token returns 401', () => {
    return request(app.getHttpServer()).get('/progress').expect(401);
  });
});
