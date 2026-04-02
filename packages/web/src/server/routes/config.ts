/**
 * Config API Routes
 * Load and update CodeAgora configuration.
 *
 * LIMITATION: YAML comments are lost on round-trip. When a YAML config is
 * loaded, edited in the dashboard, and saved back, any inline or block
 * comments present in the original .yaml file will be discarded.
 */

import { Hono } from 'hono';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { ConfigSchema } from '@codeagora/core/types/config.js';
import { yamlToJson, configToYaml } from '@codeagora/core/config/converter.js';

const CA_ROOT = '.ca';

export const configRoutes = new Hono();

/**
 * GET /api/config — Load and return current config.
 * For YAML configs, converts to JSON via yamlToJson() and includes _source metadata.
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
 * When _source is 'yaml' or the existing config file is YAML, serializes back
 * to YAML via configToYaml(). The _source field is stripped before validation.
 *
 * LIMITATION: YAML comments are lost on round-trip — configToYaml() generates
 * a fresh YAML output without preserving original comments.
 */
configRoutes.put('/', async (c) => {
  const body = await c.req.json();

  // Extract and strip _source metadata before validation
  const sourceHint = body._source as string | undefined;
  const { _source: _, ...configBody } = body;

  const result = ConfigSchema.safeParse(configBody);

  if (!result.success) {
    return c.json(
      { error: 'Invalid configuration', details: result.error.issues },
      400,
    );
  }

  const configPath = await getExistingConfigPath();
  const isYaml =
    sourceHint === 'yaml' ||
    configPath?.endsWith('.yaml') ||
    configPath?.endsWith('.yml');

  if (isYaml) {
    const targetPath = configPath ?? path.join(CA_ROOT, 'config.yaml');
    const yamlContent = configToYaml(result.data as object);
    await writeFile(targetPath, yamlContent, 'utf-8');
  } else {
    const targetPath = configPath ?? path.join(CA_ROOT, 'config.json');
    await writeFile(targetPath, JSON.stringify(result.data, null, 2), 'utf-8');
  }

  return c.json({ status: 'saved' });
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
 * YAML files are converted to a JSON object via yamlToJson(), with _source: 'yaml'
 * metadata attached so the PUT handler knows to write back as YAML.
 *
 * LIMITATION: YAML comments are not preserved in the returned object.
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
    const yamlContent = await readFile(yamlPath, 'utf-8');
    const converted = yamlToJson(yamlContent);
    const parsed = JSON.parse(converted.content);
    return { ...parsed, _source: 'yaml' };
  } catch {
    return null;
  }
}
