import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, '..');

await build({
  entryPoints: [resolve(pluginRoot, 'bridge', 'mcp-server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: resolve(pluginRoot, 'bridge', 'mcp-server.cjs'),
  external: [],
  banner: {
    js: '// CodeAgora MCP Server - bundled with esbuild',
  },
  define: {
    'import.meta.dirname': '__dirname',
  },
});

console.log('MCP server built: plugin/bridge/mcp-server.cjs');
