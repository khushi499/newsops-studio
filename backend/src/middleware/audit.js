import { prisma } from '../config/prisma.js';

export async function writeAuditLog(userId, action, entity, entityId, details) {
  if (!userId) return;
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        details: details || null
      }
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
}
