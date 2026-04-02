/**
 * NotificationCenter — Bell icon dropdown for recent notifications.
 * Fetches from /api/notifications, shows unread badge, toggles a dropdown panel,
 * and supports "mark all read" and individual mark-read actions.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import { NotificationBadge } from './NotificationBadge.js';
import { NotificationItem } from './NotificationItem.js';
import type { Notification } from './NotificationItem.js';

// ============================================================================
// Component
// ============================================================================

export function NotificationCenter(): React.JSX.Element {
  const { data: notifications, refetch } = useApi<Notification[]>('/api/notifications');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  // --------------------------------------------------
  // Close dropdown on outside click
  // --------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // --------------------------------------------------
  // Close dropdown on Escape key
  // --------------------------------------------------
  useEffect(() => {
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------
  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      refetch();
    },
    [refetch],
  );

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    refetch();
  }, [refetch]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="notification-center" ref={containerRef}>
      <button
        className="notification-center__trigger"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {/* Bell icon (SVG) */}
        <svg
          className="notification-center__bell"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <NotificationBadge count={unreadCount} />
      </button>

      {open && (
        <div className="notification-center__dropdown" role="region" aria-label="Notifications">
          <div className="notification-center__header">
            <h3 className="notification-center__title">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-center__mark-all"
                onClick={markAllRead}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-center__list">
            {items.length === 0 ? (
              <p className="notification-center__empty">No notifications yet</p>
            ) : (
              items.map((n) => (
                <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
