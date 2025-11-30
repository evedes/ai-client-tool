#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('ai-client')
  .description('CLI tool for interacting with Anthropic API')
  .version('1.0.0');

program.parse();
