import { prisma } from './prisma';

export interface CreateNotificationParams {
  userId: number;
  type: 'like' | 'comment' | 'follow' | 'system';
  title: string;
  content?: string;
  link?: string;
  relatedUserId?: number;
}

/**
 * Create a notification for a user.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, content, link, relatedUserId } = params;

  try {
    await prisma.$executeRaw`
      INSERT INTO notifications ("userId", "type", "title", "content", "link", "relatedUserId", "isRead", "createdAt")
      VALUES (${userId}, ${type}, ${title}, ${content || null}, ${link || null}, ${relatedUserId || null}, false, NOW())
    `;
  } catch (error) {
    console.error('[Notification] Failed to create notification:', error);
    // 静默失败，不阻塞主流程
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function createNotifications(
  paramsList: CreateNotificationParams[],
) {
  for (const params of paramsList) {
    await createNotification(params);
  }
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: number): Promise<number> {
  try {
    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM notifications WHERE "userId" = ${userId} AND "isRead" = false
    `;
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('[Notification] Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: number, userId: number) {
  try {
    await prisma.$executeRaw`
      UPDATE notifications SET "isRead" = true WHERE "id" = ${notificationId} AND "userId" = ${userId}
    `;
  } catch (error) {
    console.error('[Notification] Failed to mark as read:', error);
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: number) {
  try {
    await prisma.$executeRaw`
      UPDATE notifications SET "isRead" = true WHERE "userId" = ${userId} AND "isRead" = false
    `;
  } catch (error) {
    console.error('[Notification] Failed to mark all as read:', error);
  }
}

/**
 * Get paginated notifications for a user.
 */
export async function getNotifications(
  userId: number,
  page: number = 1,
  pageSize: number = 20,
) {
  const offset = (page - 1) * pageSize;

  try {
    const notifications = await prisma.$queryRaw<
      Array<{
        id: number;
        userId: number;
        type: string;
        title: string;
        content: string | null;
        link: string | null;
        relatedUserId: number | null;
        isRead: boolean;
        createdAt: Date;
      }>
    >`
      SELECT id, "userId", type, title, content, link, "relatedUserId", "isRead", "createdAt"
      FROM notifications
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM notifications WHERE "userId" = ${userId}
    `;

    return {
      notifications,
      total: Number(totalResult[0]?.count || 0),
      page,
      pageSize,
    };
  } catch (error) {
    console.error('[Notification] Failed to get notifications:', error);
    return { notifications: [], total: 0, page, pageSize };
  }
}
