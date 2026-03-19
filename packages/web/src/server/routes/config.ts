/**
 * Config API Routes
 * Load and update CodeAgora configuration.
 */

import { Hono } from 'hono';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { ConfigSchema } from '@codeagora/core/types/config.js';

const CA_ROOT = '.ca';

export const configRoutes = new Hono();

/**
 * GET /api/config — Load and return current config.
 */
configRoutes.get('/', async (c) => {
  const config = await loadConfig();

  if (!config) {
    return c.json({ error: 'No configuration file found' }, 404);
  }

  return c.json(config);
});

/**
 * PUT /api/config — Validate with ConfigSchema (zod) and write to config file.
 */
configRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const result = ConfigSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { error: 'Invalid configuration', details: result.error.issues },
      400,
    );
  }

  const configPath = await getExistingConfigPath();
  const targetPath = configPath ?? path.join(CA_ROOT, 'config.json');

  await writeFile(targetPath, JSON.stringify(result.data, null, 2), 'utf-8');

  return c.json({ status: 'saved', path: targetPath });
});

/**
 * Try to find an existing config file (JSON or YAML).
 */
async function getExistingConfigPath(): Promise<string | null> {
  const jsonPath = path.join(CA_ROOT, 'config.json');
  const yamlPath = path.join(CA_ROOT, 'config.yaml');

  try {
    await readFile(jsonPath, 'utf-8');
    return jsonPath;
  } catch {
    // Try YAML
  }

  try {
    await readFile(yamlPath, 'utf-8');
    return yamlPath;
  } catch {
    // No config file exists
  }

  return null;
}

/**
 * Load config from JSON or YAML file.
 */
async function loadConfig(): Promise<unknown | null> {
  const jsonPath = path.join(CA_ROOT, 'config.json');
  const yamlPath = path.join(CA_ROOT, 'config.yaml');

  try {
    const content = await readFile(jsonPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Try YAML
  }

  try {
    const content = await readFile(yamlPath, 'utf-8');
    // YAML parsing: for now return raw string wrapped in object
    // Full YAML support can be added via js-yaml dependency later
    return { _raw: content, _format: 'yaml' };
  } catch {
    return null;
  }
}
