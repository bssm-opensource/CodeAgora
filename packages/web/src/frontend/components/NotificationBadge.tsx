/**
 * NotificationBadge — Unread count indicator.
 * Renders a red circle with the count. Hidden when count is 0.
 */

import React from 'react';

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps): React.JSX.Element | null {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <span className="notification-badge" aria-label={`${count} unread notifications`}>
      {display}
    </span>
  );
}
