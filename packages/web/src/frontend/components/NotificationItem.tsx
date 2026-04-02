/**
 * NotificationItem — Single notification row in the dropdown.
 * Shows type icon, message, relative time, optional verdict badge, and read state.
 * Urgent items receive a highlighted background.
 */

import React from 'react';

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

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

const TYPE_ICONS: Record<Notification['type'], string> = {
  review_complete: '\u2705',    // check mark
  review_failed: '\u274C',      // cross mark
  verdict_reject: '\u26D4',     // no entry
  verdict_needs_human: '\u26A0', // warning
};

const VERDICT_CLASSES: Record<string, string> = {
  ACCEPT: 'notification-verdict--accept',
  REJECT: 'notification-verdict--reject',
  NEEDS_HUMAN: 'notification-verdict--needs-human',
};

/**
 * Format an ISO date string as a relative time (e.g. "3m ago", "2h ago").
 */
function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

// ============================================================================
// Component
// ============================================================================

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps): React.JSX.Element {
  const { id, type, message, verdict, urgent, read, createdAt } = notification;

  const className = [
    'notification-item',
    !read ? 'notification-item--unread' : '',
    urgent ? 'notification-item--urgent' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick(): void {
    if (!read) {
      onMarkRead(id);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${read ? '' : 'Unread: '}${message}`}
    >
      <span className="notification-item__icon" aria-hidden="true">
        {TYPE_ICONS[type]}
      </span>
      <div className="notification-item__body">
        <p className="notification-item__message">{message}</p>
        <div className="notification-item__meta">
          <time className="notification-item__time" dateTime={createdAt}>
            {timeAgo(createdAt)}
          </time>
          {verdict && (
            <span className={`notification-verdict ${VERDICT_CLASSES[verdict] ?? ''}`}>
              {verdict}
            </span>
          )}
        </div>
      </div>
      {!read && <span className="notification-item__dot" aria-hidden="true" />}
    </div>
  );
}
