import { PrismaClient } from '@prisma/client';
import { addMinutes, addDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding...');

  // Мастер Анна
  const anna = await prisma.user.upsert({
    where: { phone: '+79001234567' },
    update: {},
    create: {
      phone: '+79001234567',
      name: 'Анна Петрова',
      timezone: 'Europe/Moscow',
    },
  });

  // Витрина
  await prisma.storefront.upsert({
    where: { userId: anna.id },
    update: {},
    create: {
      userId: anna.id,
      slug: 'anna-manicure',
      title: 'Маникюр Анна',
      description: 'Профессиональный маникюр и педикюр',
      isActive: true,
    },
  });

  // Подписка (free)
  await prisma.subscription.upsert({
    where: { userId: anna.id },
    update: {},
    create: {
      userId: anna.id,
      plan: 'free',
      status: 'active',
    },
  });

  // Рабочие часы (пн–сб 10:00–20:00)
  const workDays = [1, 2, 3, 4, 5, 6];
  for (const day of workDays) {
    await prisma.workingHours.upsert({
      where: { userId_dayOfWeek: { userId: anna.id, dayOfWeek: day } },
      update: {},
      create: { userId: anna.id, dayOfWeek: day, startTime: '10:00', endTime: '20:00' },
    });
  }

  // 3 услуги
  const manicure = await prisma.service.upsert({
    where: { id: 'seed-service-1' },
    update: {},
    create: {
      id: 'seed-service-1',
      userId: anna.id,
      name: 'Маникюр классический',
      durationMin: 60,
      priceKopecks: 150000,
      bufferMin: 10,
    },
  });

  const pedicure = await prisma.service.upsert({
    where: { id: 'seed-service-2' },
    update: {},
    create: {
      id: 'seed-service-2',
      userId: anna.id,
      name: 'Педикюр',
      durationMin: 90,
      priceKopecks: 200000,
      bufferMin: 15,
    },
  });

  const combo = await prisma.service.upsert({
    where: { id: 'seed-service-3' },
    update: {},
    create: {
      id: 'seed-service-3',
      userId: anna.id,
      name: 'Маникюр + педикюр',
      durationMin: 150,
      priceKopecks: 320000,
      bufferMin: 15,
    },
  });

  // 5 клиентов
  const clientsData = [
    { id: 'seed-client-1', phone: '+79101111111', name: 'Мария Иванова' },
    { id: 'seed-client-2', phone: '+79102222222', name: 'Елена Сидорова' },
    { id: 'seed-client-3', phone: '+79103333333', name: 'Ольга Козлова' },
    { id: 'seed-client-4', phone: '+79104444444', name: 'Наталья Новикова' },
    { id: 'seed-client-5', phone: '+79105555555', name: 'Татьяна Морозова' },
  ];

  const clients = await Promise.all(
    clientsData.map((c) =>
      prisma.client.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          userId: anna.id,
          phone: c.phone,
          name: c.name,
          consentGiven: true,
          consentAt: new Date(),
          tags: [],
        },
      }),
    ),
  );

  // 10 записей (следующие 7 дней)
  const services = [manicure, pedicure, combo];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let appointmentCount = 0;
  for (let dayOffset = 0; dayOffset < 7 && appointmentCount < 10; dayOffset++) {
    const date = addDays(today, dayOffset + 1);
    const startHour = 10 + (dayOffset % 4) * 2;
    const baseTime = setMinutes(setHours(date, startHour), 0);

    const client = clients[appointmentCount % clients.length]!;
    const service = services[appointmentCount % services.length]!;
    const startsAt = baseTime;
    const endsAt = addMinutes(startsAt, service.durationMin);

    await prisma.appointment.upsert({
      where: { id: `seed-appt-${appointmentCount + 1}` },
      update: {},
      create: {
        id: `seed-appt-${appointmentCount + 1}`,
        userId: anna.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: dayOffset < 2 ? 'confirmed' : 'pending',
        source: dayOffset % 2 === 0 ? 'web' : 'master',
      },
    });
    appointmentCount++;

    if (appointmentCount < 10) {
      const client2 = clients[(appointmentCount) % clients.length]!;
      const service2 = services[(appointmentCount) % services.length]!;
      const startsAt2 = addMinutes(endsAt, service.bufferMin + 30);
      const endsAt2 = addMinutes(startsAt2, service2.durationMin);

      await prisma.appointment.upsert({
        where: { id: `seed-appt-${appointmentCount + 1}` },
        update: {},
        create: {
          id: `seed-appt-${appointmentCount + 1}`,
          userId: anna.id,
          clientId: client2.id,
          serviceId: service2.id,
          startsAt: startsAt2,
          endsAt: endsAt2,
          status: 'pending',
          source: 'web',
        },
      });
      appointmentCount++;
    }
  }

  console.info(`✅ Seed complete: user=${anna.id}, services=3, clients=5, appointments=${appointmentCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
