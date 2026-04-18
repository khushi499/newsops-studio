import bcrypt from 'bcryptjs';
import { PrismaClient, Role, ArticleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Seed skipped: data already exists.');
    return;
  }

  const passwordMap = {
    admin: await bcrypt.hash('Admin@123', 10),
    editor: await bcrypt.hash('Editor@123', 10),
    analyst: await bcrypt.hash('Analyst@123', 10),
    reader: await bcrypt.hash('Reader@123', 10)
  };

  const admin = await prisma.user.create({ data: { name: 'System Admin', email: 'admin@newsops.com', password: passwordMap.admin, role: Role.ADMIN } });
  const editor = await prisma.user.create({ data: { name: 'News Editor', email: 'editor@newsops.com', password: passwordMap.editor, role: Role.EDITOR } });
  const analyst = await prisma.user.create({ data: { name: 'News Analyst', email: 'analyst@newsops.com', password: passwordMap.analyst, role: Role.ANALYST } });
  const reader = await prisma.user.create({ data: { name: 'Daily Reader', email: 'reader@newsops.com', password: passwordMap.reader, role: Role.READER } });

  const source1 = await prisma.source.create({ data: { name: 'Global Wire', url: 'https://example.com/global', category: 'World', reliability: 5 } });
  const source2 = await prisma.source.create({ data: { name: 'Tech Pulse', url: 'https://example.com/tech', category: 'Technology', reliability: 4 } });

  const article1 = await prisma.article.create({
    data: {
      title: 'AI Startups See Fresh Investment Across Asia',
      slug: 'ai-startups-see-fresh-investment-across-asia',
      summary: 'Investors are backing generative AI infrastructure and regional language tools.',
      content: 'Funding activity has accelerated across multiple AI startup hubs, with investors focusing on infrastructure, regional models, and enterprise automation. Analysts expect sustained momentum over the next two quarters.',
      category: 'Technology',
      tags: ['ai', 'startup', 'investment'],
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
      sourceId: source2.id,
      authorId: editor.id
    }
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'Energy Markets React to Sudden Supply Shift',
      slug: 'energy-markets-react-to-sudden-supply-shift',
      summary: 'Oil and gas prices moved sharply after fresh supply updates from major exporters.',
      content: 'Commodity markets responded quickly to revised export expectations. Traders are watching inflation implications and possible effects on industrial output in the coming weeks.',
      category: 'Business',
      tags: ['energy', 'markets'],
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
      sourceId: source1.id,
      authorId: admin.id
    }
  });

  await prisma.comment.create({ data: { content: 'Great summary of the trend.', articleId: article1.id, userId: analyst.id } });
  await prisma.bookmark.create({ data: { articleId: article1.id, userId: reader.id } });
  await prisma.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'ARTICLE', entityId: String(article1.id), details: article1.title, userId: editor.id },
      { action: 'CREATE', entity: 'ARTICLE', entityId: String(article2.id), details: article2.title, userId: admin.id },
      { action: 'LOGIN_SEED_READY', entity: 'SYSTEM', entityId: null, details: 'Seed data initialized', userId: admin.id }
    ]
  });

  console.log('Seed complete!');
  console.log('Admin: admin@newsops.com / Admin@123');
  console.log('Editor: editor@newsops.com / Editor@123');
  console.log('Analyst: analyst@newsops.com / Analyst@123');
  console.log('Reader: reader@newsops.com / Reader@123');
}

main().finally(async () => prisma.$disconnect());
