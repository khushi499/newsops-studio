import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from './config/prisma.js';
import { authenticate, authorize } from './middleware/auth.js';
import { writeAuditLog } from './middleware/audit.js';
import { httpRequests, responseTime, metricsRegistry } from './metrics.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*'}));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.use((req, res, next) => {
  const end = responseTime.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'newsops-backend' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
  await writeAuditLog(user.id, 'LOGIN', 'USER', user.id, `User ${user.email} logged in`);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  const [articleCount, publishedCount, sourceCount, commentCount, bookmarkCount] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.source.count(),
    prisma.comment.count(),
    prisma.bookmark.count()
  ]);

  const latestArticles = await prisma.article.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { source: true, author: true }
  });

  res.json({
    totals: { articleCount, publishedCount, sourceCount, commentCount, bookmarkCount },
    latestArticles
  });
});

app.get('/api/articles/public', async (req, res) => {
  const { category, search } = req.query;
  const articles = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      ...(category ? { category: String(category) } : {}),
      ...(search ? { OR: [
        { title: { contains: String(search), mode: 'insensitive' } },
        { summary: { contains: String(search), mode: 'insensitive' } }
      ] } : {})
    },
    include: { source: true, author: true, comments: true, bookmarks: true },
    orderBy: { publishedAt: 'desc' }
  });
  res.json(articles);
});

app.get('/api/articles', authenticate, async (_req, res) => {
  const articles = await prisma.article.findMany({
    include: { source: true, author: true, comments: true, bookmarks: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(articles);
});

app.post('/api/articles', authenticate, authorize('ADMIN', 'EDITOR'), async (req, res) => {
  const schema = z.object({
    title: z.string().min(5),
    summary: z.string().min(10),
    content: z.string().min(20),
    category: z.string().min(2),
    sourceId: z.coerce.number(),
    tags: z.array(z.string()).default([]),
    imageUrl: z.string().optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT')
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid article input' });

  const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  const article = await prisma.article.create({
    data: {
      ...parsed.data,
      slug,
      authorId: req.user.id,
      publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null
    },
    include: { source: true, author: true }
  });
  await writeAuditLog(req.user.id, 'CREATE', 'ARTICLE', article.id, article.title);
  res.status(201).json(article);
});

app.put('/api/articles/:id', authenticate, authorize('ADMIN', 'EDITOR'), async (req, res) => {
  const article = await prisma.article.update({
    where: { id: Number(req.params.id) },
    data: {
      ...req.body,
      publishedAt: req.body.status === 'PUBLISHED' ? new Date() : undefined
    }
  });
  await writeAuditLog(req.user.id, 'UPDATE', 'ARTICLE', article.id, article.title);
  res.json(article);
});

app.delete('/api/articles/:id', authenticate, authorize('ADMIN', 'EDITOR'), async (req, res) => {
  await prisma.article.delete({ where: { id: Number(req.params.id) } });
  await writeAuditLog(req.user.id, 'DELETE', 'ARTICLE', req.params.id, 'Article removed');
  res.json({ message: 'Article deleted' });
});

app.get('/api/sources', authenticate, async (_req, res) => {
  const sources = await prisma.source.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(sources);
});

app.post('/api/sources', authenticate, authorize('ADMIN', 'EDITOR'), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    url: z.string().url(),
    category: z.string().min(2),
    reliability: z.coerce.number().min(1).max(5)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid source input' });
  const source = await prisma.source.create({ data: parsed.data });
  await writeAuditLog(req.user.id, 'CREATE', 'SOURCE', source.id, source.name);
  res.status(201).json(source);
});

app.get('/api/comments/:articleId', async (req, res) => {
  const comments = await prisma.comment.findMany({
    where: { articleId: Number(req.params.articleId) },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(comments);
});

app.post('/api/comments/:articleId', authenticate, async (req, res) => {
  const schema = z.object({ content: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid comment' });

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      articleId: Number(req.params.articleId),
      userId: req.user.id
    },
    include: { user: true }
  });
  await writeAuditLog(req.user.id, 'CREATE', 'COMMENT', comment.id, 'Comment added');
  res.status(201).json(comment);
});

app.get('/api/bookmarks', authenticate, async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: req.user.id },
    include: { article: { include: { source: true, author: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(bookmarks);
});

app.post('/api/bookmarks/:articleId', authenticate, async (req, res) => {
  const bookmark = await prisma.bookmark.upsert({
    where: { userId_articleId: { userId: req.user.id, articleId: Number(req.params.articleId) } },
    update: {},
    create: { userId: req.user.id, articleId: Number(req.params.articleId) }
  });
  await writeAuditLog(req.user.id, 'CREATE', 'BOOKMARK', bookmark.id, `Bookmarked article ${req.params.articleId}`);
  res.status(201).json(bookmark);
});

app.delete('/api/bookmarks/:articleId', authenticate, async (req, res) => {
  await prisma.bookmark.delete({
    where: { userId_articleId: { userId: req.user.id, articleId: Number(req.params.articleId) } }
  });
  await writeAuditLog(req.user.id, 'DELETE', 'BOOKMARK', req.params.articleId, 'Bookmark removed');
  res.json({ message: 'Bookmark removed' });
});

app.get('/api/audit/logs', authenticate, authorize('ADMIN'), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(logs);
});

app.get('/api/users', authenticate, authorize('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
  res.json(users);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NewsOps backend running on port ${PORT}`);
});
