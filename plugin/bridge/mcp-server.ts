import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Core path resolution — plugin sits at ./plugin/, core at ./src-v3/
const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const CORE_DIST = join(PROJECT_ROOT, 'src-v3', 'dist');
const SESSIONS_DIR = join(PROJECT_ROOT, '.ca', 'sessions');
const CONFIG_PATH = join(PROJECT_ROOT, '.ca', 'config.json');

// Lazy import core to avoid bundling issues
async function importCore() {
  const core = await import(join(CORE_DIST, 'index.js'));
  return core;
}

const server = new McpServer({
  name: 'codeagora',
  version: '0.1.0',
});

// ─── Tool 1: agora_run_review ───────────────────────────────────────────────

server.tool(
  'agora_run_review',
  'Run multi-agent code review pipeline on a diff file. Returns session ID and verdict.',
  {
    diffPath: z.string().describe('Absolute path to the diff file to review'),
  },
  async ({ diffPath }) => {
    try {
      const { runPipeline } = await importCore();
      const result = await runPipeline({ diffPath });

      // Read the result file if session completed
      let verdict = '';
      if (result.status === 'success') {
        const resultPath = join(SESSIONS_DIR, result.date, result.sessionId, 'result.md');
        try {
          verdict = await readFile(resultPath, 'utf-8');
        } catch {
          verdict = '(result file not found)';
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            sessionId: result.sessionId,
            date: result.date,
            status: result.status,
            error: result.error,
            verdict: verdict.slice(0, 4000), // Truncate for MCP response size
          }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error running review: ${err instanceof Error ? err.message : String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool 2: agora_get_result ───────────────────────────────────────────────

server.tool(
  'agora_get_result',
  'Get the result of a specific review session. Returns verdict, report, and metadata.',
  {
    date: z.string().optional().describe('Session date (YYYY-MM-DD). Defaults to latest.'),
    sessionId: z.string().optional().describe('Session ID (e.g. "004"). Defaults to latest.'),
  },
  async ({ date, sessionId }) => {
    try {
      // Resolve date: use latest if not provided
      let targetDate = date;
      if (!targetDate) {
        const dates = await readdir(SESSIONS_DIR);
        const sorted = dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
        if (sorted.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No sessions found.' }] };
        }
        targetDate = sorted[sorted.length - 1];
      }

      // Resolve sessionId: use latest if not provided
      const dateDir = join(SESSIONS_DIR, targetDate);
      let targetId = sessionId;
      if (!targetId) {
        const sessions = await readdir(dateDir);
        const sorted = sessions.filter(s => /^\d+$/.test(s)).sort((a, b) => Number(a) - Number(b));
        if (sorted.length === 0) {
          return { content: [{ type: 'text' as const, text: `No sessions found for ${targetDate}.` }] };
        }
        targetId = sorted[sorted.length - 1];
      }

      const sessionDir = join(dateDir, targetId);

      // Read all available files
      const files: Record<string, string> = {};
      for (const name of ['metadata.json', 'result.md', 'report.md', 'suggestions.md']) {
        try {
          files[name] = await readFile(join(sessionDir, name), 'utf-8');
        } catch {
          // File doesn't exist for this session
        }
      }

      if (Object.keys(files).length === 0) {
        return { content: [{ type: 'text' as const, text: `Session ${targetDate}/${targetId} not found.` }] };
      }

      // Build response
      const parts: string[] = [`# Session ${targetDate}/${targetId}\n`];

      if (files['metadata.json']) {
        const meta = JSON.parse(files['metadata.json']);
        parts.push(`**Status:** ${meta.status}`);
        parts.push(`**Diff:** ${meta.diffPath}`);
        parts.push(`**Started:** ${new Date(meta.startedAt).toISOString()}`);
        if (meta.completedAt) {
          const duration = ((meta.completedAt - meta.startedAt) / 1000).toFixed(1);
          parts.push(`**Duration:** ${duration}s\n`);
        }
      }

      if (files['result.md']) {
        parts.push('## Head Verdict\n');
        parts.push(files['result.md']);
      }

      if (files['report.md']) {
        parts.push('\n## Moderator Report\n');
        parts.push(files['report.md'].slice(0, 3000));
      }

      if (files['suggestions.md']) {
        parts.push('\n## Suggestions\n');
        parts.push(files['suggestions.md'].slice(0, 2000));
      }

      return {
        content: [{ type: 'text' as const, text: parts.join('\n') }],
      };
    } catch (err) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error reading session: ${err instanceof Error ? err.message : String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool 3: agora_list_sessions ────────────────────────────────────────────

server.tool(
  'agora_list_sessions',
  'List recent review sessions with their status and verdict summary.',
  {
    limit: z.number().optional().default(10).describe('Maximum number of sessions to return'),
  },
  async ({ limit }) => {
    try {
      let dates: string[];
      try {
        dates = (await readdir(SESSIONS_DIR))
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort()
          .reverse();
      } catch {
        return { content: [{ type: 'text' as const, text: 'No sessions directory found. Run a review first.' }] };
      }

      interface SessionEntry {
        date: string;
        id: string;
        status: string;
        diffPath: string;
        duration: string;
      }

      const sessions: SessionEntry[] = [];

      for (const date of dates) {
        if (sessions.length >= limit) break;

        const dateDir = join(SESSIONS_DIR, date);
        let ids: string[];
        try {
          ids = (await readdir(dateDir))
            .filter(s => /^\d+$/.test(s))
            .sort((a, b) => Number(b) - Number(a));
        } catch {
          continue;
        }

        for (const id of ids) {
          if (sessions.length >= limit) break;

          try {
            const metaRaw = await readFile(join(dateDir, id, 'metadata.json'), 'utf-8');
            const meta = JSON.parse(metaRaw);
            const duration = meta.completedAt
              ? `${((meta.completedAt - meta.startedAt) / 1000).toFixed(1)}s`
              : 'in_progress';

            sessions.push({
              date,
              id,
              status: meta.status,
              diffPath: meta.diffPath,
              duration,
            });
          } catch {
            sessions.push({ date, id, status: 'unknown', diffPath: '', duration: '' });
          }
        }
      }

      if (sessions.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No review sessions found.' }] };
      }

      const header = `| Date | ID | Status | Duration | Diff |\n|------|-----|--------|----------|------|\n`;
      const rows = sessions.map(s =>
        `| ${s.date} | ${s.id} | ${s.status} | ${s.duration} | ${s.diffPath.split('/').pop() || s.diffPath} |`
      ).join('\n');

      return {
        content: [{ type: 'text' as const, text: `# Recent Sessions (${sessions.length})\n\n${header}${rows}` }],
      };
    } catch (err) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing sessions: ${err instanceof Error ? err.message : String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Start server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
  process.exit(1);
});
