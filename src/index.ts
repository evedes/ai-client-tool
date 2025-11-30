#!/usr/bin/env node

/**
 * AI Client Tool - CLI Entry Point
 * 
 * Command-line interface for interacting with Anthropic's Claude AI models.
 * Provides interactive chat, single-shot queries, usage statistics, and session management.
 * 
 * @module ai-client
 * @version 1.0.0
 * 
 * @example
 * ```bash
 * # Single-shot query
 * ai-client ask "What is the capital of France?"
 * 
 * # Interactive chat
 * ai-client chat
 * 
 * # Resume previous session
 * ai-client chat --resume abc-123-uuid
 * 
 * # View usage statistics
 * ai-client stats
 * 
 * # List saved sessions
 * ai-client sessions
 * ```
 */

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
