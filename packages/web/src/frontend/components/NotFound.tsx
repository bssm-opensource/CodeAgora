import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound(): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: 'var(--color-text-secondary)',
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: 'var(--color-danger)' }}>404</h1>
      <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>Page not found</p>
      <p style={{ margin: '0.5rem 0' }}>The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        style={{
          marginTop: '1rem',
          color: 'var(--color-accent)',
          textDecoration: 'none',
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
