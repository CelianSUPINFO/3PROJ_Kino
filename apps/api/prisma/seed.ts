import {
  ActivityType,
  MediaType,
  PrismaClient,
  Role,
  SwipeChoice,
  WatchStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const password = 'KinoDemo2026!';
const adminPassword = 'KinoAdmin2026!';

const people = [
  {
    email: 'admin@kino-demo.fr',
    name: 'Admin Kino',
    role: Role.ADMIN,
    bio: 'Je veille sur la communaute Kino.',
    website: 'https://kino-web-ten.vercel.app',
  },
  {
    email: 'lea@kino-demo.fr',
    name: 'Lea Martin',
    role: Role.USER,
    bio: 'Thrillers, cinema coreen et seances du dimanche.',
    website: 'https://letterboxd.com',
  },
  {
    email: 'yanis@kino-demo.fr',
    name: 'Yanis Cohen',
    role: Role.USER,
    bio: 'Je note severement, mais toujours avec amour.',
  },
  {
    email: 'ines@kino-demo.fr',
    name: 'Ines Laurent',
    role: Role.USER,
    bio: 'Series ambitieuses et belles images.',
  },
  {
    email: 'tom@kino-demo.fr',
    name: 'Tom Bernard',
    role: Role.USER,
    bio: 'Science-fiction, animation et bandes originales.',
  },
  {
    email: 'maya@kino-demo.fr',
    name: 'Maya Dupont',
    role: Role.USER,
    bio: 'Une salle obscure, du popcorn, et tout va bien.',
  },
  {
    email: 'hugo@kino-demo.fr',
    name: 'Hugo Petit',
    role: Role.USER,
    bio: 'Classiques, polars et decouvertes improbables.',
  },
  {
    email: 'sarah@kino-demo.fr',
    name: 'Sarah Moreau',
    role: Role.USER,
    bio: 'Je cherche toujours la prochaine pepite.',
  },
  {
    email: 'nolan@kino-demo.fr',
    name: 'Nolan Garcia',
    role: Role.USER,
    bio: 'Films de genre et discussions beaucoup trop longues.',
  },
  {
    email: 'emma@kino-demo.fr',
    name: 'Emma Roux',
    role: Role.USER,
    bio: 'Comedies, romances et excellents generiques.',
  },
  {
    email: 'adam@kino-demo.fr',
    name: 'Adam Fontaine',
    role: Role.USER,
    bio: 'Fan de series et de cinema independant.',
  },
  {
    email: 'zoe@kino-demo.fr',
    name: 'Zoe Mercier',
    role: Role.USER,
    bio: 'Documentaires, animation japonaise et festivals.',
  },
] as const;

const works = [
  { id: 550, type: MediaType.MOVIE, title: 'Fight Club', runtime: 139 },
  { id: 680, type: MediaType.MOVIE, title: 'Pulp Fiction', runtime: 154 },
  { id: 13, type: MediaType.MOVIE, title: 'Forrest Gump', runtime: 142 },
  { id: 27205, type: MediaType.MOVIE, title: 'Inception', runtime: 148 },
  { id: 155, type: MediaType.MOVIE, title: 'The Dark Knight', runtime: 152 },
  { id: 238, type: MediaType.MOVIE, title: 'Le Parrain', runtime: 175 },
  { id: 603, type: MediaType.MOVIE, title: 'Matrix', runtime: 136 },
  { id: 157336, type: MediaType.MOVIE, title: 'Interstellar', runtime: 169 },
  { id: 496243, type: MediaType.MOVIE, title: 'Parasite', runtime: 133 },
  { id: 372058, type: MediaType.MOVIE, title: 'Your Name.', runtime: 106 },
  { id: 129, type: MediaType.MOVIE, title: 'Le Voyage de Chihiro', runtime: 125 },
  { id: 244786, type: MediaType.MOVIE, title: 'Whiplash', runtime: 107 },
  { id: 1399, type: MediaType.TV, title: 'Game of Thrones', runtime: 60 },
  { id: 94605, type: MediaType.TV, title: 'Arcane', runtime: 42 },
  { id: 1396, type: MediaType.TV, title: 'Breaking Bad', runtime: 47 },
  { id: 60059, type: MediaType.TV, title: 'Better Call Saul', runtime: 47 },
  { id: 37854, type: MediaType.TV, title: 'One Piece', runtime: 24 },
  { id: 66732, type: MediaType.TV, title: 'Stranger Things', runtime: 50 },
  { id: 85552, type: MediaType.TV, title: 'Euphoria', runtime: 55 },
  { id: 84958, type: MediaType.TV, title: 'Loki', runtime: 50 },
] as const;

const reviewBodies = [
  'Une mise en scene precise et une vraie personnalite. Je le reverrai sans hesiter.',
  'Tres solide, porte par des personnages qui restent longtemps en tete.',
  'Quelques longueurs, mais une proposition genereuse et memorable.',
  'La photographie et la musique font enormement pour cette atmosphere.',
  'Un recit captivant qui recompense vraiment attention du spectateur.',
  'Pas parfait, mais suffisamment singulier pour meriter le detour.',
  'Une claque visuelle avec un dernier acte qui fonctionne parfaitement.',
  'Le casting est excellent et chaque episode donne envie de voir le suivant.',
] as const;

const listTemplates = [
  {
    name: 'Mes indispensables',
    description: 'Les oeuvres que je recommande sans hesitation.',
    isPublic: true,
    workIndexes: [0, 4, 8, 13, 14],
  },
  {
    name: 'Pour un dimanche pluvieux',
    description: 'Une selection confortable pour rester sous un plaid.',
    isPublic: true,
    workIndexes: [2, 7, 9, 10, 17],
  },
  {
    name: 'A montrer aux amis',
    description: 'Des valeurs sures pour une soiree en groupe.',
    isPublic: true,
    workIndexes: [1, 3, 6, 11, 13],
  },
  {
    name: 'Ma liste secrete',
    description: 'Des plaisirs coupables que je garde pour moi.',
    isPublic: false,
    workIndexes: [5, 12, 18, 19],
  },
] as const;

async function clearDemoData(demoIds: string[]) {
  await prisma.reviewLike.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.comment.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.report.deleteMany({ where: { reporterId: { in: demoIds } } });
  await prisma.messageReport.deleteMany({ where: { reporterId: { in: demoIds } } });
  await prisma.follow.deleteMany({
    where: {
      OR: [{ followerId: { in: demoIds } }, { followingId: { in: demoIds } }],
    },
  });
  await prisma.message.deleteMany({
    where: {
      OR: [{ senderId: { in: demoIds } }, { recipientId: { in: demoIds } }],
    },
  });
  await prisma.review.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.customList.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.userWorkStatus.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.activity.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.swipeDecision.deleteMany({ where: { userId: { in: demoIds } } });
  await prisma.userBlock.deleteMany({
    where: {
      OR: [{ blockerId: { in: demoIds } }, { blockedId: { in: demoIds } }],
    },
  });
}

async function main() {
  const demoHash = await hash(password, 12);
  const adminHash = await hash(adminPassword, 12);
  const now = Date.now();
  const users = [];

  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const favoriteFilms = [0, 1, 2, 3].map((offset) => {
      const work = works[(index * 2 + offset) % works.length];
      return { tmdbId: work.id, mediaType: work.type, title: work.title };
    });
    users.push(
      await prisma.user.upsert({
        where: { email: person.email },
        update: {
          displayName: person.name,
          role: person.role,
          bio: person.bio,
          website: 'website' in person ? person.website : null,
          favoriteFilms,
          passwordHash: person.role === Role.ADMIN ? adminHash : demoHash,
          emailVerifiedAt: new Date(),
          lastSeenAt: new Date(now - index * 18 * 60 * 1000),
        },
        create: {
          email: person.email,
          displayName: person.name,
          role: person.role,
          bio: person.bio,
          website: 'website' in person ? person.website : null,
          favoriteFilms,
          passwordHash: person.role === Role.ADMIN ? adminHash : demoHash,
          locale: index % 4 === 0 ? 'en' : 'fr',
          theme: index % 3 === 0 ? 'light' : 'dark',
          emailVerifiedAt: new Date(),
          lastSeenAt: new Date(now - index * 18 * 60 * 1000),
        },
      }),
    );
  }

  for (const work of works) {
    await prisma.cachedWork.upsert({
      where: {
        tmdbId_mediaType_language: {
          tmdbId: work.id,
          mediaType: work.type,
          language: 'fr-FR',
        },
      },
      update: { title: work.title, runtime: work.runtime },
      create: {
        tmdbId: work.id,
        mediaType: work.type,
        language: 'fr-FR',
        title: work.title,
        runtime: work.runtime,
        payload: {},
        overview: `Une fiche de demonstration pour ${work.title}.`,
      },
    });
  }

  const demoIds = users.map((user) => user.id);
  await clearDemoData(demoIds);

  for (let followerIndex = 1; followerIndex < users.length; followerIndex += 1) {
    for (let offset = 1; offset <= 4; offset += 1) {
      const following = users[((followerIndex + offset) % (users.length - 1)) + 1];
      if (following.id === users[followerIndex].id) continue;
      await prisma.follow.create({
        data: { followerId: users[followerIndex].id, followingId: following.id },
      });
    }
  }

  const reviews = [];
  for (let userIndex = 1; userIndex < users.length; userIndex += 1) {
    for (let offset = 0; offset < 6; offset += 1) {
      const work = works[(userIndex * 2 + offset) % works.length];
      const body =
        offset === 5 && userIndex % 2 === 0
          ? ''
          : reviewBodies[(userIndex + offset) % reviewBodies.length];
      reviews.push(
        await prisma.review.create({
          data: {
            userId: users[userIndex].id,
            tmdbId: work.id,
            mediaType: work.type,
            rating: 2 + ((userIndex + offset) % 4),
            body,
            spoiler: offset === 4,
            featured: userIndex === 1 && offset === 0,
            createdAt: new Date(now - (userIndex * 6 + offset) * 3_600_000),
          },
        }),
      );
    }
  }

  for (let index = 0; index < reviews.length; index += 1) {
    const review = reviews[index];
    for (let offset = 1; offset <= 2 + (index % 4); offset += 1) {
      const liker = users[((index + offset) % (users.length - 1)) + 1];
      if (liker.id === review.userId) continue;
      await prisma.reviewLike.create({
        data: { reviewId: review.id, userId: liker.id },
      });
    }
    if (index < 30) {
      const commenter = users[((index + 3) % (users.length - 1)) + 1];
      const root = await prisma.comment.create({
        data: {
          reviewId: review.id,
          userId: commenter.id,
          body:
            index % 2 === 0
              ? 'Je partage completement cet avis.'
              : 'Interessant, je ne avais pas vu les choses comme ca.',
          createdAt: new Date(now - index * 1_800_000),
        },
      });
      if (index % 3 === 0) {
        await prisma.comment.create({
          data: {
            reviewId: review.id,
            userId: review.userId,
            parentId: root.id,
            body: 'Merci pour ton retour, la discussion est interessante.',
            createdAt: new Date(now - index * 1_800_000 + 300_000),
          },
        });
      }
    }
  }

  for (let userIndex = 1; userIndex < users.length; userIndex += 1) {
    for (let offset = 0; offset < 10; offset += 1) {
      const work = works[(userIndex + offset) % works.length];
      const statuses = [
        WatchStatus.WATCHLIST,
        WatchStatus.IN_PROGRESS,
        WatchStatus.COMPLETED,
        WatchStatus.COMPLETED,
        WatchStatus.DROPPED,
      ];
      await prisma.userWorkStatus.create({
        data: {
          userId: users[userIndex].id,
          tmdbId: work.id,
          mediaType: work.type,
          status: statuses[(userIndex + offset) % statuses.length],
        },
      });
    }
  }

  const lists = [];
  for (let userIndex = 1; userIndex < users.length; userIndex += 1) {
    for (let listOffset = 0; listOffset < 3; listOffset += 1) {
      const template = listTemplates[(userIndex + listOffset) % listTemplates.length];
      const list = await prisma.customList.create({
        data: {
          userId: users[userIndex].id,
          name: template.name,
          description: template.description,
          isPublic: listOffset < 2,
        },
      });
      lists.push(list);
      for (let position = 0; position < template.workIndexes.length; position += 1) {
        const work = works[(template.workIndexes[position] + userIndex) % works.length];
        await prisma.customListItem.create({
          data: {
            listId: list.id,
            tmdbId: work.id,
            mediaType: work.type,
            position,
          },
        });
      }
    }
  }

  const conversationPairs = [
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [7, 8],
    [9, 10],
  ] as const;
  const conversation = [
    'Tu as vu les recommandations de cette semaine ?',
    'Oui, je pense commencer la serie ce soir.',
    'Dis-moi ce que tu en penses apres le premier episode.',
    'Promis. On se fait aussi un film ce week-end ?',
  ];
  for (let pairIndex = 0; pairIndex < conversationPairs.length; pairIndex += 1) {
    const [left, right] = conversationPairs[pairIndex];
    for (let messageIndex = 0; messageIndex < conversation.length; messageIndex += 1) {
      await prisma.message.create({
        data: {
          senderId: users[messageIndex % 2 === 0 ? left : right].id,
          recipientId: users[messageIndex % 2 === 0 ? right : left].id,
          body: conversation[messageIndex],
          readAt: messageIndex < 3 ? new Date() : null,
          createdAt: new Date(now - (pairIndex * 5 + 4 - messageIndex) * 3_600_000),
        },
      });
    }
  }

  for (let userIndex = 1; userIndex < users.length; userIndex += 1) {
    const user = users[userIndex];
    const work = works[userIndex % works.length];
    await prisma.activity.createMany({
      data: [
        {
          userId: user.id,
          type: ActivityType.REVIEWED,
          payload: { tmdbId: work.id, mediaType: work.type, reviewId: reviews[userIndex].id },
          createdAt: new Date(now - userIndex * 3_600_000),
        },
        {
          userId: user.id,
          type: ActivityType.STATUS_CHANGED,
          payload: { tmdbId: work.id, mediaType: work.type, status: WatchStatus.COMPLETED },
          createdAt: new Date(now - (userIndex + 1) * 3_600_000),
        },
        {
          userId: user.id,
          type: ActivityType.LIST_ADDED,
          payload: { listId: lists[(userIndex - 1) * 3].id, tmdbId: work.id, mediaType: work.type },
          createdAt: new Date(now - (userIndex + 2) * 3_600_000),
        },
      ],
    });
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          type: 'NEW_FOLLOWER',
          payload: { followerId: users[((userIndex + 1) % (users.length - 1)) + 1].id },
          read: userIndex % 2 === 0,
        },
        {
          userId: user.id,
          type: 'REVIEW_LIKED',
          payload: { reviewId: reviews[(userIndex - 1) * 6].id },
          read: false,
        },
      ],
    });
    for (let offset = 0; offset < 4; offset += 1) {
      const swipeWork = works[(userIndex * 3 + offset) % works.length];
      await prisma.swipeDecision.create({
        data: {
          userId: user.id,
          tmdbId: swipeWork.id,
          mediaType: swipeWork.type,
          choice: offset % 3 === 0 ? SwipeChoice.PASS : SwipeChoice.SMASH,
        },
      });
    }
  }

  await prisma.report.create({
    data: {
      reporterId: users[3].id,
      reviewId: reviews[0].id,
      reason: 'Signalement de demonstration a verifier.',
    },
  });

  console.log(
    `Seed completed: ${users.length} accounts, ${reviews.length} reviews, ${lists.length} lists, ${conversationPairs.length} conversations.`,
  );
  console.log('Admin: admin@kino-demo.fr / KinoAdmin2026!');
  console.log('Demo users password: KinoDemo2026!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
