#!/usr/bin/env node

import { Command } from 'commander';
import { askCommand } from './commands/ask.js';
import { chatCommand } from './commands/chat.js';
import { statsCommand } from './commands/stats.js';
import { sessionsCommand } from './commands/sessions.js';

const program = new Command();

program
  .name('ai-client')
  .description('CLI tool for interacting with Anthropic API')
  .version('1.0.0');

program
  .command('chat')
  .description('Start an interactive chat session')
  .option('--model <model>', 'Override default model')
  .option('--config <path>', 'Path to config file')
  .option('--resume <session-id>', 'Resume a previous conversation session')
  .option('--debug', 'Enable debug logging')
  .action(chatCommand);

program
  .command('ask <prompt>')
  .description('Send a single query and exit')
  .option('--model <model>', 'Override default model')
  .option('--config <path>', 'Path to config file')
  .option('--debug', 'Enable debug logging')
  .action(askCommand);

program
  .command('stats')
  .description('Display usage statistics')
  .option('--config <path>', 'Path to config file')
  .action(statsCommand);

program
  .command('sessions')
  .description('List saved conversation sessions')
  .option('--cleanup', 'Clean up old sessions')
  .option('--older-than <days>', 'Delete sessions older than X days')
  .action(sessionsCommand);

program.parse();
