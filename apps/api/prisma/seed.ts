import { MediaType, PrismaClient, Role, WatchStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  { email: 'admin1@kino.local', displayName: 'Admin One', role: Role.ADMIN },
  { email: 'admin2@kino.local', displayName: 'Admin Two', role: Role.ADMIN },
  { email: 'alice@kino.local', displayName: 'Alice', role: Role.USER },
  { email: 'bob@kino.local', displayName: 'Bob', role: Role.USER },
  { email: 'chloe@kino.local', displayName: 'Chloe', role: Role.USER },
  { email: 'david@kino.local', displayName: 'David', role: Role.USER },
  { email: 'emma@kino.local', displayName: 'Emma', role: Role.USER },
  { email: 'felix@kino.local', displayName: 'Felix', role: Role.USER },
  { email: 'gina@kino.local', displayName: 'Gina', role: Role.USER },
  { email: 'hugo@kino.local', displayName: 'Hugo', role: Role.USER },
];

const sampleWorks = [
  { tmdbId: 550, mediaType: MediaType.MOVIE, rating: 5 },
  { tmdbId: 680, mediaType: MediaType.MOVIE, rating: 4 },
  { tmdbId: 13, mediaType: MediaType.MOVIE, rating: 4 },
  { tmdbId: 27205, mediaType: MediaType.MOVIE, rating: 5 },
  { tmdbId: 155, mediaType: MediaType.MOVIE, rating: 5 },
  { tmdbId: 238, mediaType: MediaType.MOVIE, rating: 4 },
  { tmdbId: 1399, mediaType: MediaType.TV, rating: 5 },
  { tmdbId: 94605, mediaType: MediaType.TV, rating: 4 },
  { tmdbId: 66732, mediaType: MediaType.TV, rating: 4 },
  { tmdbId: 1396, mediaType: MediaType.TV, rating: 3 },
  { tmdbId: 95557, mediaType: MediaType.TV, rating: 4 },
  { tmdbId: 66732, mediaType: MediaType.TV, rating: 5 },
];

async function main() {
  const passwordHash = await hash('Kino1234!', 10);
  const createdUsers = await Promise.all(
    users.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {
          displayName: u.displayName,
          role: u.role,
          passwordHash,
        },
        create: {
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          passwordHash,
          bio: `${u.displayName} aime le cinema.`,
          locale: 'fr',
          theme: 'dark',
        },
      }),
    ),
  );

  const regularUsers = createdUsers.filter((u) => u.role === Role.USER);
  const [alice, bob, chloe] = regularUsers;

  if (alice) {
    for (const [idx, work] of sampleWorks.entries()) {
      await prisma.review.upsert({
        where: {
          userId_tmdbId_mediaType: {
            userId: alice.id,
            tmdbId: work.tmdbId,
            mediaType: work.mediaType,
          },
        },
        update: {
          rating: work.rating,
          body: `Seed review #${idx + 1} by ${alice.displayName}`,
          spoiler: false,
        },
        create: {
          userId: alice.id,
          tmdbId: work.tmdbId,
          mediaType: work.mediaType,
          rating: work.rating,
          body: `Seed review #${idx + 1} by ${alice.displayName}`,
          spoiler: false,
        },
      });
      await prisma.userWorkStatus.upsert({
        where: {
          userId_tmdbId_mediaType: {
            userId: alice.id,
            tmdbId: work.tmdbId,
            mediaType: work.mediaType,
          },
        },
        update: { status: WatchStatus.COMPLETED },
        create: {
          userId: alice.id,
          tmdbId: work.tmdbId,
          mediaType: work.mediaType,
          status: WatchStatus.COMPLETED,
        },
      });
    }
  }

  if (alice && bob) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: bob.id, followingId: alice.id } },
      update: {},
      create: { followerId: bob.id, followingId: alice.id },
    });
  }
  if (alice && chloe) {
    await prisma.message.create({
      data: { senderId: alice.id, recipientId: chloe.id, body: 'Hello depuis le seed.' },
    });
  }

  console.log('Seed completed.');
  console.log('Admins: admin1@kino.local / admin2@kino.local');
  console.log('Users: alice@kino.local, bob@kino.local ...');
  console.log('Password for all seeded accounts: Kino1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
