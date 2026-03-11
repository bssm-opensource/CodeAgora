#!/usr/bin/env node
/**
 * CodeAgora V3 CLI
 * Multi-agent code review pipeline
 */

import { Command } from 'commander';
import { runPipeline } from '../pipeline/orchestrator.js';
import { loadConfig } from '../config/loader.js';
import path from 'path';
import fs from 'fs/promises';

const program = new Command();

program
  .name('codeagora')
  .description('Multi-LLM collaborative code review CLI')
  .version('3.0.0');

program
  .command('review')
  .description('Run code review pipeline on a diff file')
  .argument('<diff-path>', 'Path to the diff file')
  .option('--dry-run', 'Validate config without running review')
  .action(async (diffPath: string, options: { dryRun?: boolean }) => {
    try {
      const resolvedPath = path.resolve(diffPath);

      // Check diff file exists
      try {
        await fs.access(resolvedPath);
      } catch {
        console.error(`Error: Diff file not found: ${resolvedPath}`);
        process.exit(1);
      }

      if (options.dryRun) {
        console.log('Validating config...');
        const config = await loadConfig();
        console.log('Config valid.');
        console.log(`  Reviewers: ${Array.isArray(config.reviewers) ? config.reviewers.length : config.reviewers.count}`);
        console.log(`  Supporters: ${config.supporters.pool.length}`);
        console.log(`  Max rounds: ${config.discussion.maxRounds}`);
        return;
      }

      console.log(`Starting review: ${resolvedPath}`);
      console.log('---');

      const result = await runPipeline({ diffPath: resolvedPath });

      if (result.status === 'success') {
        console.log(`Review complete!`);
        console.log(`  Session: ${result.date}/${result.sessionId}`);
        console.log(`  Output: .ca/sessions/${result.date}/${result.sessionId}/`);
      } else {
        console.error(`Review failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Fatal error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Validate and display current config')
  .action(async () => {
    try {
      const config = await loadConfig();
      console.log('Config: .ca/config.json');
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Config error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
