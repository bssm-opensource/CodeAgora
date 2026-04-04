/**
 * Session Metadata type
 */

export interface SessionMetadata {
  sessionId: string; // 001, 002, etc.
  date: string; // YYYY-MM-DD
  timestamp: number;
  diffPath: string;
  status: 'in_progress' | 'completed' | 'failed' | 'interrupted';
  startedAt: number;
  completedAt?: number;
  /** SHA-256 prefix of the diff content (cache key component) */
  diffHash?: string;
  /** SHA-256 prefix of the reviewer config (cache key component) */
  configHash?: string;
}
