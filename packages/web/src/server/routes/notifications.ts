/**
 * Notification API Routes
 * Manages review notifications stored in .ca/notifications.json.
 */

import { Hono } from 'hono';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  type: 'review_complete' | 'review_failed' | 'verdict_reject' | 'verdict_needs_human';
  sessionId: string;
  verdict?: string;
  message: string;
  urgent: boolean;
  read: boolean;
  createdAt: string;
}

type CreateNotificationData = Omit<Notification, 'id' | 'read' | 'createdAt'>;

// ============================================================================
// Constants
// ============================================================================

const CA_ROOT = '.ca';
const NOTIFICATIONS_FILE = path.join(CA_ROOT, 'notifications.json');
const MAX_NOTIFICATIONS = 100;

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Read all notifications from disk. Returns empty array on failure.
 */
async function readNotifications(): Promise<Notification[]> {
  try {
    const content = await readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(content) as Notification[];
  } catch {
    return [];
  }
}

/**
 * Write notifications to disk, ensuring directory exists.
 */
async function writeNotifications(notifications: Notification[]): Promise<void> {
  await mkdir(CA_ROOT, { recursive: true });
  await writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Append a new notification to the store (FIFO, max 100).
 * Exported for use by other routes (e.g. review completion).
 */
export async function createNotification(data: CreateNotificationData): Promise<Notification> {
  const notification: Notification = {
    id: crypto.randomUUID(),
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const notifications = await readNotifications();
  notifications.unshift(notification);

  // Enforce FIFO cap
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  await writeNotifications(trimmed);

  return notification;
}

// ============================================================================
// Routes
// ============================================================================

export const notificationRoutes = new Hono();

/**
 * GET / — Return all notifications (most recent first).
 */
notificationRoutes.get('/', async (c) => {
  const notifications = await readNotifications();
  return c.json(notifications);
});

/**
 * PUT /:id/read — Mark a single notification as read.
 */
notificationRoutes.put('/:id/read', async (c) => {
  const { id } = c.req.param();
  const notifications = await readNotifications();
  const target = notifications.find((n) => n.id === id);

  if (!target) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  target.read = true;
  await writeNotifications(notifications);

  return c.json(target);
});

/**
 * PUT /read-all — Mark all notifications as read.
 */
notificationRoutes.put('/read-all', async (c) => {
  const notifications = await readNotifications();

  for (const n of notifications) {
    n.read = true;
  }

  await writeNotifications(notifications);

  return c.json({ updated: notifications.length });
});
