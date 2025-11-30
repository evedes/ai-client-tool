#!/usr/bin/env node

import { Command } from 'commander';
import { askCommand } from './commands/ask.js';
import { chatCommand } from './commands/chat.js';

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
  .option('--debug', 'Enable debug logging')
  .action(chatCommand);

program
  .command('ask <prompt>')
  .description('Send a single query and exit')
  .option('--model <model>', 'Override default model')
  .option('--config <path>', 'Path to config file')
  .option('--debug', 'Enable debug logging')
  .action(askCommand);

program.parse();
