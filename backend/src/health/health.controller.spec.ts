import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok when database is connected', async () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.check(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
      }),
    );
  });

  it('should return 503 when database query fails', async () => {
    jest.spyOn(prisma, '$queryRaw' as any).mockRejectedValueOnce(new Error('DB Connection Failed'));

    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.check(res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        database: 'disconnected',
      }),
    );
  });
});
