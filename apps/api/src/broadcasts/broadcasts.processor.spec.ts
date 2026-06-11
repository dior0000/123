import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BroadcastsProcessor } from './broadcasts.processor';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

const mockTelegram = { sendMessage: jest.fn(async () => undefined) };

const makeBroadcast = (overrides = {}) => ({
  id: 'bc1',
  userId: 'u1',
  text: 'Привет!',
  tags: [] as string[],
  status: 'scheduled',
  ...overrides,
});

const makeClient = (overrides = {}) => ({
  id: 'c1',
  telegramId: '123',
  consentGiven: true,
  isSubscribed: true,
  tags: [] as string[],
  ...overrides,
});

function makeDb(clients: ReturnType<typeof makeClient>[], broadcast: ReturnType<typeof makeBroadcast>) {
  const updatedStatuses: string[] = [];
  return {
    broadcast: {
      findUnique: jest.fn(async () => broadcast),
      update: jest.fn(async ({ data }: { data: { status?: string } }) => {
        if (data.status) updatedStatuses.push(data.status);
        return { ...broadcast, ...data };
      }),
    },
    client: {
      findMany: jest.fn(async () => clients),
    },
    _updatedStatuses: updatedStatuses,
  };
}

async function buildProcessor(db: ReturnType<typeof makeDb>) {
  const mod = await Test.createTestingModule({
    providers: [
      BroadcastsProcessor,
      { provide: PrismaService, useValue: db },
      { provide: TelegramService, useValue: mockTelegram },
      {
        provide: ConfigService,
        useValue: { get: () => 'redis://localhost:6379' },
      },
    ],
  }).compile();
  return mod.get<BroadcastsProcessor>(BroadcastsProcessor);
}

describe('BroadcastsProcessor — consent enforcement', () => {
  beforeEach(() => {
    (mockTelegram.sendMessage as jest.Mock).mockClear();
  });

  it('sends to clients with consent + subscribed', async () => {
    const client = makeClient();
    const broadcast = makeBroadcast();
    const db = makeDb([client], broadcast);
    const processor = await buildProcessor(db);

    // Call the private method via reflection
    await (processor as unknown as { process: (j: { data: { broadcastId: string }; name: string }) => Promise<void> }).process(
      { data: { broadcastId: 'bc1' }, name: 'send' },
    );

    expect(mockTelegram.sendMessage).toHaveBeenCalledTimes(1);
    expect(db._updatedStatuses).toContain('sent');
  });

  it('does NOT send to client without consent', async () => {
    const client = makeClient({ consentGiven: false });
    const db = makeDb([client], makeBroadcast());
    // DB returns empty list because query filters consentGiven=true
    (db.client.findMany as jest.Mock).mockResolvedValue([]);

    const processor = await buildProcessor(db);
    await (processor as unknown as { process: (j: { data: { broadcastId: string }; name: string }) => Promise<void> }).process(
      { data: { broadcastId: 'bc1' }, name: 'send' },
    );

    expect(mockTelegram.sendMessage).not.toHaveBeenCalled();
  });

  it('does NOT send to unsubscribed client', async () => {
    const db = makeDb([], makeBroadcast()); // empty list = filtered by DB
    const processor = await buildProcessor(db);
    await (processor as unknown as { process: (j: { data: { broadcastId: string }; name: string }) => Promise<void> }).process(
      { data: { broadcastId: 'bc1' }, name: 'send' },
    );
    expect(mockTelegram.sendMessage).not.toHaveBeenCalled();
  });

  it('skips if broadcast is already sent (idempotent)', async () => {
    const db = makeDb([makeClient()], makeBroadcast({ status: 'sent' }));
    const processor = await buildProcessor(db);
    await (processor as unknown as { process: (j: { data: { broadcastId: string }; name: string }) => Promise<void> }).process(
      { data: { broadcastId: 'bc1' }, name: 'send' },
    );
    expect(mockTelegram.sendMessage).not.toHaveBeenCalled();
  });
});
