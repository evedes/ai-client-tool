#!/usr/bin/env node

import { Command } from 'commander';
import { askCommand } from './commands/ask.js';

const program = new Command();

program
  .name('ai-client')
  .description('CLI tool for interacting with Anthropic API')
  .version('1.0.0');

program
  .command('ask <prompt>')
  .description('Send a single query and exit')
  .option('--model <model>', 'Override default model')
  .option('--config <path>', 'Path to config file')
  .option('--debug', 'Enable debug logging')
  .action(askCommand);

program.parse();
