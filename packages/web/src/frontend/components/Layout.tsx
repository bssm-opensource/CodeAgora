import React from 'react';
import { Sidebar } from './Sidebar.js';
import { NotificationCenter } from './NotificationCenter.js';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__body">
        <header className="layout__header">
          <NotificationCenter />
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
