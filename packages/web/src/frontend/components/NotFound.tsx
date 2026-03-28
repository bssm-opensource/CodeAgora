import React from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../theme.js';

export function NotFound(): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      color: colors.muted,
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0, color: colors.error }}>404</h1>
      <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>Page not found</p>
      <p style={{ margin: '0.5rem 0' }}>The page you're looking for doesn't exist.</p>
      <Link 
        to="/" 
        style={{ 
          marginTop: '1rem', 
          color: colors.primary, 
          textDecoration: 'none',
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}