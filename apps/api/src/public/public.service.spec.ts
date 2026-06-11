import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Minimal in-memory store
const makeDb = () => {
  const storefronts = [
    {
      slug: 'test-master',
      isActive: true,
      userId: 'u1',
      user: { id: 'u1', name: 'Anna', timezone: 'Europe/Moscow' },
    },
  ];
  const services = [
    { id: 'svc1', userId: 'u1', name: 'Маникюр', durationMin: 60, priceKopecks: 150000, bufferMin: 10, isActive: true },
  ];
  const clients: Array<{ id: string; userId: string; phone: string; name: string; telegramId: string | null; consentGiven: boolean; consentAt: Date | null; tags: string[] }> = [];
  const appointments: Array<{
    id: string; userId: string; clientId: string; serviceId: string;
    startsAt: Date; endsAt: Date; status: string; source: string; createdAt: Date;
    client?: (typeof clients)[0];
  }> = [];

  let apptCounter = 0;
  let clientCounter = 0;

  return {
    storefront: {
      findUnique: jest.fn(async ({ where }: { where: { slug: string } }) => {
        return storefronts.find((s) => s.slug === where.slug) ?? null;
      }),
    },
    service: {
      findFirst: jest.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        return services.find((s) => s.id === where.id && s.userId === where.userId) ?? null;
      }),
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return services.filter((s) => s.userId === where.userId && s.isActive);
      }),
    },
    workingHours: {
      findUnique: jest.fn(async () => ({ dayOfWeek: 1, startTime: '10:00', endTime: '20:00', userId: 'u1' })),
    },
    timeOff: { findMany: jest.fn(async () => []) },
    appointment: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async ({ where }: { where: { userId: string; startsAt: Date } }) => {
        const a = appointments.find(
          (a) =>
            a.userId === where.userId &&
            a.startsAt.getTime() === where.startsAt.getTime() &&
            ['pending', 'confirmed'].includes(a.status),
        );
        return a ?? null;
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const appt = {
          id: `appt${++apptCounter}`,
          ...data,
          createdAt: new Date(),
        } as (typeof appointments)[0];
        appointments.push(appt);
        return appt;
      }),
    },
    client: {
      upsert: jest.fn(
        async ({ where, create }: { where: { userId_phone: { userId: string; phone: string } }; create: Record<string, unknown> }) => {
          let c = clients.find(
            (cl) => cl.userId === where.userId_phone.userId && cl.phone === where.userId_phone.phone,
          );
          if (!c) {
            c = { id: `cli${++clientCounter}`, userId: where.userId_phone.userId, ...create } as (typeof clients)[0];
            clients.push(c);
          }
          return c;
        },
      ),
    },
    _appointments: appointments,
  } as unknown as PrismaService & { _appointments: typeof appointments };
};

const mockNotifications: Pick<NotificationsService, 'scheduleNewBooking' | 'scheduleReminder'> = {
  scheduleNewBooking: jest.fn(async () => undefined),
  scheduleReminder: jest.fn(async () => undefined),
};

async function buildService(db: PrismaService) {
  const mod = await Test.createTestingModule({
    providers: [
      PublicService,
      { provide: PrismaService, useValue: db },
      { provide: NotificationsService, useValue: mockNotifications },
    ],
  }).compile();
  return mod.get<PublicService>(PublicService);
}

const VALID_DTO = {
  serviceId: 'svc1',
  clientPhone: '+79001234567',
  clientName: 'Мария',
  startsAt: new Date('2024-09-02T09:00:00.000Z').toISOString(), // 12:00 MSK
  consentGiven: true as const,
};

describe('PublicService', () => {
  let service: PublicService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    service = await buildService(db as unknown as PrismaService);
  });

  describe('getStorefront', () => {
    it('returns storefront and services for active slug', async () => {
      const result = await service.getStorefront('test-master');
      expect(result.storefront.slug).toBe('test-master');
      expect(result.services).toHaveLength(1);
    });

    it('throws 404 for unknown slug', async () => {
      await expect(service.getStorefront('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('book', () => {
    it('creates appointment and returns isNew=true', async () => {
      const result = await service.book('test-master', VALID_DTO);
      expect(result.isNew).toBe(true);
      expect(result.appointmentId).toBeDefined();
      expect((db.appointment.create as jest.Mock).mock.calls).toHaveLength(1);
    });

    it('deduplication: second call within window returns existing, isNew=false', async () => {
      // First booking
      const first = await service.book('test-master', VALID_DTO);
      expect(first.isNew).toBe(true);

      // Mock findFirst to return the created appointment (within dedup window)
      const createdAppt = (db as unknown as ReturnType<typeof makeDb>)._appointments[0]!;
      createdAppt.client = { id: createdAppt.clientId, userId: 'u1', phone: VALID_DTO.clientPhone, name: VALID_DTO.clientName, telegramId: null, consentGiven: true, consentAt: new Date(), tags: [] };
      (db.appointment.findFirst as jest.Mock).mockResolvedValueOnce({
        ...createdAppt,
        createdAt: new Date(), // just now — within 5 min window
      });

      const second = await service.book('test-master', VALID_DTO);
      expect(second.isNew).toBe(false);
      expect(second.appointmentId).toBe(first.appointmentId);
      // Should NOT create a second appointment
      expect((db.appointment.create as jest.Mock).mock.calls).toHaveLength(1);
    });

    it('deduplication: slot conflict outside dedup window throws ConflictException', async () => {
      const old = {
        id: 'old-appt',
        userId: 'u1',
        clientId: 'cli1',
        serviceId: 'svc1',
        startsAt: new Date(VALID_DTO.startsAt),
        endsAt: new Date(VALID_DTO.startsAt),
        status: 'confirmed',
        source: 'web',
        client: { phone: VALID_DTO.clientPhone },
        // older than 5 minutes
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      (db.appointment.findFirst as jest.Mock).mockResolvedValueOnce(old);

      await expect(service.book('test-master', VALID_DTO)).rejects.toThrow(ConflictException);
    });
  });
});
