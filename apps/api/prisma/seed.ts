import { MediaType, PrismaClient, Role, WatchStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const password = 'KinoDemo2026!';
const adminPassword = 'KinoAdmin2026!';

const people = [
  ['admin@kino-demo.fr', 'Admin Kino', Role.ADMIN, 'Je veille sur la communauté Kino.'],
  ['lea@kino-demo.fr', 'Léa Martin', Role.USER, 'Thrillers, cinéma coréen et séances du dimanche.'],
  ['yanis@kino-demo.fr', 'Yanis Cohen', Role.USER, 'Je note sévèrement, mais toujours avec amour.'],
  ['ines@kino-demo.fr', 'Inès Laurent', Role.USER, 'Séries ambitieuses et belles images.'],
  ['tom@kino-demo.fr', 'Tom Bernard', Role.USER, 'Science-fiction, animation et bandes originales.'],
  ['maya@kino-demo.fr', 'Maya Dupont', Role.USER, 'Une salle obscure, du popcorn, et tout va bien.'],
  ['hugo@kino-demo.fr', 'Hugo Petit', Role.USER, 'Classiques, polars et découvertes improbables.'],
  ['sarah@kino-demo.fr', 'Sarah Moreau', Role.USER, 'Je cherche toujours la prochaine pépite.'],
  ['nolan@kino-demo.fr', 'Nolan Garcia', Role.USER, 'Films de genre et discussions beaucoup trop longues.'],
  ['emma@kino-demo.fr', 'Emma Roux', Role.USER, 'Comédies, romances et excellents génériques.'],
  ['adam@kino-demo.fr', 'Adam Fontaine', Role.USER, 'Fan de séries et de cinéma indépendant.'],
] as const;

const works = [
  [550, MediaType.MOVIE, 'Fight Club'],
  [680, MediaType.MOVIE, 'Pulp Fiction'],
  [13, MediaType.MOVIE, 'Forrest Gump'],
  [27205, MediaType.MOVIE, 'Inception'],
  [155, MediaType.MOVIE, 'The Dark Knight'],
  [238, MediaType.MOVIE, 'Le Parrain'],
  [603, MediaType.MOVIE, 'Matrix'],
  [1399, MediaType.TV, 'Game of Thrones'],
  [94605, MediaType.TV, 'Arcane'],
  [1396, MediaType.TV, 'Breaking Bad'],
] as const;

const reviewBodies = [
  'Une mise en scène précise et une vraie personnalité. Je le reverrai sans hésiter.',
  'Très solide, porté par des personnages qui restent longtemps en tête.',
  'Quelques longueurs, mais une proposition généreuse et mémorable.',
  'La photographie et la musique font énormément pour l’atmosphère.',
  'Un récit captivant qui récompense vraiment l’attention du spectateur.',
  'Pas parfait, mais suffisamment singulier pour mériter le détour.',
];

async function main() {
  const demoHash = await hash(password, 12);
  const adminHash = await hash(adminPassword, 12);
  const users = [];
  for (const [email, displayName, role, bio] of people) {
    users.push(
      await prisma.user.upsert({
        where: { email },
        update: { displayName, role, bio, passwordHash: role === Role.ADMIN ? adminHash : demoHash },
        create: {
          email,
          displayName,
          role,
          bio,
          passwordHash: role === Role.ADMIN ? adminHash : demoHash,
          locale: 'fr',
          theme: 'dark',
        },
      }),
    );
  }

  for (const [tmdbId, mediaType, title] of works) {
    await prisma.cachedWork.upsert({
      where: { tmdbId_mediaType: { tmdbId, mediaType } },
      update: { title },
      create: { tmdbId, mediaType, title, payload: {}, overview: '' },
    });
  }

  const demoIds = users.map((user) => user.id);
  await prisma.comment.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.report.deleteMany({ where: { reporterId: { in: demoIds } } });
  await prisma.message.deleteMany({ where: { senderId: { in: demoIds } } });

  const reviews = [];
  for (let userIndex = 1; userIndex < users.length; userIndex += 1) {
    const user = users[userIndex];
    const count = 3 + (userIndex % 5);
    for (let offset = 0; offset < count; offset += 1) {
      const [tmdbId, mediaType] = works[(userIndex + offset) % works.length];
      const rating = 3 + ((userIndex + offset) % 3);
      const review = await prisma.review.upsert({
        where: { userId_tmdbId_mediaType: { userId: user.id, tmdbId, mediaType } },
        update: { rating, body: reviewBodies[(userIndex + offset) % reviewBodies.length], spoiler: false },
        create: {
          userId: user.id,
          tmdbId,
          mediaType,
          rating,
          body: reviewBodies[(userIndex + offset) % reviewBodies.length],
          spoiler: false,
        },
      });
      reviews.push(review);
      await prisma.userWorkStatus.upsert({
        where: { userId_tmdbId_mediaType: { userId: user.id, tmdbId, mediaType } },
        update: { status: WatchStatus.COMPLETED },
        create: { userId: user.id, tmdbId, mediaType, status: WatchStatus.COMPLETED },
      });
    }
  }

  for (let i = 1; i < users.length; i += 1) {
    for (let target = 1; target <= Math.min(4, i); target += 1) {
      const following = users[target];
      if (following.id === users[i].id) continue;
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: users[i].id, followingId: following.id } },
        update: {},
        create: { followerId: users[i].id, followingId: following.id },
      });
    }
  }

  for (let i = 0; i < Math.min(reviews.length, 18); i += 1) {
    const author = users[(i + 3) % users.length];
    await prisma.comment.create({
      data: {
        reviewId: reviews[i].id,
        userId: author.id,
        body: i % 2 === 0 ? 'Je partage complètement cet avis.' : 'Intéressant, je ne l’avais pas vu comme ça.',
      },
    });
  }

  if (reviews[0]) {
    await prisma.report.create({
      data: { reporterId: users[3].id, reviewId: reviews[0].id, reason: 'Signalement de démonstration à vérifier.' },
    });
  }
  await prisma.message.create({
    data: { senderId: users[1].id, recipientId: users[2].id, body: 'Tu as vu les recommandations de cette semaine ?' },
  });

  console.log(`Seed completed: ${users.length} demo accounts, ${reviews.length} reviews.`);
  console.log('Admin: admin@kino-demo.fr / KinoAdmin2026!');
  console.log('Demo users password: KinoDemo2026!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
