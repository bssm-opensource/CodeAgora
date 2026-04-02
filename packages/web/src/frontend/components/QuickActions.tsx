/**
 * QuickActions — Action buttons for common dashboard tasks.
 * Links to the Pipeline and Config pages.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export function QuickActions(): React.JSX.Element {
  return (
    <div className="quick-actions">
      <h3 className="quick-actions__title">Quick Actions</h3>
      <div className="quick-actions__grid">
        <Link to="/pipeline" className="quick-actions__button quick-actions__button--primary">
          <span className="quick-actions__icon" aria-hidden="true">+</span>
          <span className="quick-actions__label">New Review</span>
          <span className="quick-actions__desc">Start a new code review pipeline</span>
        </Link>
        <Link to="/config" className="quick-actions__button quick-actions__button--secondary">
          <span className="quick-actions__icon" aria-hidden="true">#</span>
          <span className="quick-actions__label">Settings</span>
          <span className="quick-actions__desc">Configure reviewers and providers</span>
        </Link>
      </div>
    </div>
  );
}
