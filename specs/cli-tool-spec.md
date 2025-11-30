# AI Client CLI Tool – Technical Specification (Node.js/TypeScript)

## 1. Overview

Build a terminal-based CLI application using **Node.js** and **TypeScript** that interacts with the Anthropic API. The tool provides:

1. **Conversation history** – Multi-turn chat with context management.
2. **Cost tracking** – Token usage and per-query cost display.
3. **API error handling** – Robust error categorization and user-friendly messages.
4. **Retry logic** – Exponential backoff for transient failures.

---

## 2. Technology Stack

- **Runtime**: Node.js 24+ (for native fetch support, modern ESM)
- **Language**: TypeScript 5+
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js) (argument parsing & routing)
- **Interactive UI**: [Ink](https://github.com/vadimdemedes/ink) (React-based terminal UI for `chat` command)
- **API Client**: [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk)
- **Storage**: JSON files in `~/.ai-client/` (no database dependency initially)
- **Build/Run**: `tsx` for development, `tsc` + `node` for production

### 2.1 Why Ink?

Ink provides a superior interactive experience for the `chat` command:
- **Real-time feedback**: Spinners during API calls, streaming text display
- **Rich formatting**: Colored syntax highlighting, boxed stats, multi-column layouts
- **Composable UI**: Reusable React components for messages, stats panels, input prompts
- **Better UX**: Clear visual separation between user/assistant messages

**Note**: The `ask` command (single-shot) will use simple `console.log` – no need for Ink overhead there.

---

## 3. Project Structure

```
ai-client-tool/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── commands/
│   │   ├── chat.ts              # Interactive chat command (uses Ink)
│   │   ├── ask.ts               # Single-shot query command (plain console)
│   │   └── stats.ts             # Display statistics command
│   ├── components/              # Ink React components
│   │   ├── ChatApp.tsx          # Main chat UI component
│   │   ├── Message.tsx          # User/assistant message display
│   │   ├── UsageStats.tsx       # Real-time cost/token display
│   │   ├── Spinner.tsx          # Loading indicator during API calls
│   │   └── InputPrompt.tsx      # User input field
│   ├── lib/
│   │   ├── anthropic-client.ts  # Anthropic API wrapper with retry
│   │   ├── conversation.ts      # Conversation manager
│   │   ├── cost-tracker.ts      # Token and cost calculation
│   │   ├── config.ts            # Configuration loader
│   │   ├── errors.ts            # Custom error types
│   │   └── retry.ts             # Exponential backoff utility
│   ├── types/
│   │   └── index.ts             # Shared TypeScript interfaces
│   └── utils/
│       ├── storage.ts           # File I/O helpers
│       └── logger.ts            # Debug logging utility
├── package.json
├── tsconfig.json
├── README.md
└── .env.example
```

---

## 4. Data Models (TypeScript Interfaces)

### 4.1 Core Types

```typescript
// src/types/index.ts

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string;
  timestamp: number; // epoch milliseconds
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface Config {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  pricing: Record<string, ModelPricing>;
  retry: RetryConfig;
  history: HistoryConfig;
}

export interface ModelPricing {
  inputPer1k: number;   // USD per 1K input tokens
  outputPer1k: number;  // USD per 1K output tokens
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface HistoryConfig {
  enabled: boolean;
  maxMessages: number;  // Max messages to include in context
}
```

---

## 5. Configuration

### 5.1 Config File Location

- Default: `~/.ai-client/config.json`
- Override via `--config <path>` flag

### 5.2 Config File Schema

```json
{
  "apiKey": "env:ANTHROPIC_API_KEY",
  "defaultModel": "claude-sonnet-4-5-20250929",
  "maxTokens": 1024,
  "temperature": 0.7,
  "pricing": {
    "claude-sonnet-4-5-20250929": {
      "inputPer1k": 0.003,
      "outputPer1k": 0.015
    },
    "claude-haiku-4-5-20251001": {
      "inputPer1k": 0.001,
      "outputPer1k": 0.005
    },
    "claude-opus-4-5-20251101": {
      "inputPer1k": 0.005,
      "outputPer1k": 0.025
    }
  },
  "retry": {
    "maxRetries": 3,
    "baseDelayMs": 1000,
    "maxDelayMs": 8000
  },
  "history": {
    "enabled": true,
    "maxMessages": 20
  }
}
```

### 5.3 Config Loading Logic

```typescript
// src/lib/config.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.ai-client', 'config.json');

export function loadConfig(customPath?: string): Config {
  const configPath = customPath || DEFAULT_CONFIG_PATH;
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // Resolve API key from env if prefixed with "env:"
  if (rawConfig.apiKey?.startsWith('env:')) {
    const envVar = rawConfig.apiKey.slice(4);
    rawConfig.apiKey = process.env[envVar];
    
    if (!rawConfig.apiKey) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
  }
  
  return rawConfig as Config;
}
```

---

## 6. Error Handling

### 6.1 Custom Error Types

```typescript
// src/lib/errors.ts

export class AIClientError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class AuthError extends AIClientError {
  constructor(message = 'Authentication failed. Check your ANTHROPIC_API_KEY.') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends AIClientError {
  constructor(message = 'Rate limited by Anthropic API.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends AIClientError {
  constructor(message = 'Anthropic service error.', statusCode = 500) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

export class ValidationError extends AIClientError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AIClientError {
  constructor(message = 'Network error occurred.') {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### 6.2 Error Classification

```typescript
// src/lib/errors.ts (continued)

export function classifyError(error: any): AIClientError {
  if (error instanceof AIClientError) {
    return error;
  }
  
  const statusCode = error.status || error.statusCode;
  
  if (statusCode === 401 || statusCode === 403) {
    return new AuthError();
  }
  
  if (statusCode === 429) {
    return new RateLimitError();
  }
  
  if (statusCode >= 500 && statusCode < 600) {
    return new ServerError(error.message, statusCode);
  }
  
  if (statusCode >= 400 && statusCode < 500) {
    return new ValidationError(error.message || 'Bad request');
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new NetworkError();
  }
  
  return new AIClientError(error.message || 'Unknown error');
}

export function isRetryable(error: AIClientError): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof ServerError ||
    error instanceof NetworkError
  );
}
```

---

## 7. Retry Logic with Exponential Backoff

### 7.1 Retry Utility

```typescript
// src/lib/retry.ts

import { isRetryable } from './errors';
import { RetryConfig } from '../types';

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === config.maxRetries) {
        throw error;
      }
      
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      );
      
      const jitter = Math.random() * 250; // 0-250ms jitter
      const totalDelay = delay + jitter;
      
      onRetry?.(attempt + 1, totalDelay);
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError!;
}
```

---

## 8. Anthropic Client Wrapper

### 8.1 Client Implementation

```typescript
// src/lib/anthropic-client.ts

import Anthropic from '@anthropic-ai/sdk';
import { Message, Config, UsageStats } from '../types';
import { classifyError } from './errors';
import { withRetry } from './retry';

export class AnthropicClient {
  private client: Anthropic;
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }
  
  async sendMessage(
    messages: Message[],
    onRetry?: (attempt: number, delay: number) => void
  ): Promise<{ content: string; usage: UsageStats }> {
    const operation = async () => {
      try {
        const response = await this.client.messages.create({
          model: this.config.defaultModel,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        });
        
        const content = response.content[0].type === 'text'
          ? response.content[0].text
          : '';
        
        const usage = this.calculateUsage(
          response.usage.input_tokens,
          response.usage.output_tokens
        );
        
        return { content, usage };
      } catch (error: any) {
        throw classifyError(error);
      }
    };
    
    return withRetry(operation, this.config.retry, onRetry);
  }
  
  private calculateUsage(inputTokens: number, outputTokens: number): UsageStats {
    const pricing = this.config.pricing[this.config.defaultModel];
    
    if (!pricing) {
      throw new Error(`Pricing not configured for model: ${this.config.defaultModel}`);
    }
    
    const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
    const outputCost = (outputTokens / 1000) * pricing.outputPer1k;
    
    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }
}
```

---

## 9. Conversation Manager

### 9.1 Implementation

```typescript
// src/lib/conversation.ts

import { Conversation, Message, HistoryConfig } from '../types';
import * as crypto from 'crypto';

export class ConversationManager {
  private conversation: Conversation;
  private historyConfig: HistoryConfig;
  
  constructor(historyConfig: HistoryConfig) {
    this.historyConfig = historyConfig;
    this.conversation = this.createNewConversation();
  }
  
  private createNewConversation(): Conversation {
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.conversation.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    this.conversation.updatedAt = Date.now();
  }
  
  getMessages(): Message[] {
    if (!this.historyConfig.enabled) {
      return this.conversation.messages.slice(-1);
    }
    
    const maxMessages = this.historyConfig.maxMessages;
    return this.conversation.messages.slice(-maxMessages);
  }
  
  reset(): void {
    this.conversation = this.createNewConversation();
  }
  
  getConversation(): Conversation {
    return this.conversation;
  }
}
```

---

## 10. Cost Tracker

### 10.1 Implementation

```typescript
// src/lib/cost-tracker.ts

import { SessionStats, UsageStats } from '../types';

export class CostTracker {
  private stats: SessionStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requestCount: 0,
  };
  
  addUsage(usage: UsageStats): void {
    this.stats.totalInputTokens += usage.inputTokens;
    this.stats.totalOutputTokens += usage.outputTokens;
    this.stats.totalCost += usage.totalCost;
    this.stats.requestCount += 1;
  }
  
  getStats(): SessionStats {
    return { ...this.stats };
  }
  
  formatUsage(usage: UsageStats): string {
    return `Usage: ${usage.inputTokens} in / ${usage.outputTokens} out tokens — $${usage.totalCost.toFixed(4)} (session: $${this.stats.totalCost.toFixed(4)})`;
  }
  
  formatStats(): string {
    return `
Session Stats:
- Input tokens:  ${this.stats.totalInputTokens}
- Output tokens: ${this.stats.totalOutputTokens}
- Total cost:    $${this.stats.totalCost.toFixed(4)}
- Requests:      ${this.stats.requestCount}
    `.trim();
  }
}
```

---

## 11. CLI Commands

### 11.1 Entry Point

```typescript
// src/index.ts

#!/usr/bin/env node

import { Command } from 'commander';
import { chatCommand } from './commands/chat';
import { askCommand } from './commands/ask';
import { statsCommand } from './commands/stats';

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

program
  .command('stats')
  .description('Display usage statistics')
  .option('--config <path>', 'Path to config file')
  .action(statsCommand);

program.parse();
```

### 11.2 Chat Command (with Ink)

```typescript
// src/commands/chat.ts

import React from 'react';
import { render } from 'ink';
import { loadConfig } from '../lib/config';
import { ChatApp } from '../components/ChatApp';

interface ChatOptions {
  model?: string;
  config?: string;
  debug?: boolean;
}

export async function chatCommand(options: ChatOptions): Promise<void> {
  try {
    const config = loadConfig(options.config);
    if (options.model) {
      config.defaultModel = options.model;
    }
    
    // Render the Ink-based chat UI
    render(React.createElement(ChatApp, { config, debug: options.debug }));
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}
```

### 11.2.1 Chat UI Component

```tsx
// src/components/ChatApp.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AnthropicClient } from '../lib/anthropic-client';
import { ConversationManager } from '../lib/conversation';
import { CostTracker } from '../lib/cost-tracker';
import { Config, Message } from '../types';

interface Props {
  config: Config;
  debug?: boolean;
}

export const ChatApp: React.FC<Props> = ({ config, debug }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ totalCost: 0, requests: 0 });
  
  const client = new AnthropicClient(config);
  const conversationManager = new ConversationManager(config.history);
  const costTracker = new CostTracker();
  
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Handle special commands
    if (userMessage === '/exit') {
      exit();
      return;
    }
    
    if (userMessage === '/reset') {
      setMessages([]);
      return;
    }
    
    if (userMessage === '/stats') {
      // Display stats in-place (already shown in UI)
      return;
    }
    
    // Add user message
    conversationManager.addMessage('user', userMessage);
    setMessages([...conversationManager.getMessages()]);
    
    setIsLoading(true);
    
    try {
      const { content, usage } = await client.sendMessage(
        conversationManager.getMessages()
      );
      
      conversationManager.addMessage('assistant', content);
      costTracker.addUsage(usage);
      
      setMessages([...conversationManager.getMessages()]);
      setSessionStats({
        totalCost: costTracker.getStats().totalCost,
        requests: costTracker.getStats().requestCount,
      });
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useInput((input, key) => {
    if (key.return) {
      handleSubmit();
    }
  });
  
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Model: {config.defaultModel}
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>
          Cost: ${sessionStats.totalCost.toFixed(4)} | Requests: {sessionStats.requests}
        </Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <Box key={i} marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'green' : 'blue'}>
              {msg.role === 'user' ? 'you' : 'claude'}&gt; 
            </Text>
            <Text> {msg.content}</Text>
          </Box>
        ))}
      </Box>
      
      {isLoading && (
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" /> Thinking...
          </Text>
        </Box>
      )}
      
      <Box>
        <Text bold color="green">you&gt; </Text>
        <TextInput value={input} onChange={setInput} />
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>Commands: /reset /stats /exit</Text>
      </Box>
    </Box>
  );
};
```

### 11.3 Ask Command

```typescript
// src/commands/ask.ts

import { loadConfig } from '../lib/config';
import { AnthropicClient } from '../lib/anthropic-client';
import { CostTracker } from '../lib/cost-tracker';

interface AskOptions {
  model?: string;
  config?: string;
  debug?: boolean;
}

export async function askCommand(prompt: string, options: AskOptions): Promise<void> {
  try {
    const config = loadConfig(options.config);
    if (options.model) {
      config.defaultModel = options.model;
    }
    
    const client = new AnthropicClient(config);
    const costTracker = new CostTracker();
    
    const { content, usage } = await client.sendMessage(
      [{ role: 'user', content: prompt, timestamp: Date.now() }],
      (attempt, delay) => {
        if (options.debug) {
          console.log(`[DEBUG] Retry ${attempt} after ${Math.round(delay)}ms`);
        }
      }
    );
    
    costTracker.addUsage(usage);
    
    console.log(content);
    console.log('\n' + costTracker.formatUsage(usage));
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}
```

### 11.4 Stats Command

```typescript
// src/commands/stats.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface StatsOptions {
  config?: string;
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  // Placeholder: Load persisted stats if available
  const statsPath = path.join(os.homedir(), '.ai-client', 'stats.json');
  
  if (!fs.existsSync(statsPath)) {
    console.log('No usage statistics found.');
    return;
  }
  
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  
  console.log(`
Global Stats:
- Total input tokens:  ${stats.totalInputTokens || 0}
- Total output tokens: ${stats.totalOutputTokens || 0}
- Total cost:          $${(stats.totalCost || 0).toFixed(4)}
- Total requests:      ${stats.requestCount || 0}
  `.trim());
}
```

---

## 12. Package Configuration

### 12.1 package.json

```json
{
  "name": "ai-client-tool",
  "version": "1.0.0",
  "description": "CLI tool for interacting with Anthropic API",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "ai-client": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "eslint src/**/*.ts"
  },
  "keywords": ["cli", "anthropic", "ai", "chatbot"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "commander": "^12.0.0",
    "ink": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.0.0"
  }
}
```

### 12.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 13. Setup and Usage

### 13.1 Installation

```bash
# Clone repository
git clone https://github.com/evedes/ai-client-tool.git
cd ai-client-tool

# Install dependencies
npm install

# Build
npm run build

# Link for global usage (optional)
npm link
```

### 13.2 Configuration

Create `~/.ai-client/config.json`:

```bash
mkdir -p ~/.ai-client
cat > ~/.ai-client/config.json << 'EOF'
{
  "apiKey": "env:ANTHROPIC_API_KEY",
  "defaultModel": "claude-sonnet-4-5-20250929",
  "maxTokens": 1024,
  "temperature": 0.7,
  "pricing": {
    "claude-sonnet-4-5-20250929": {
      "inputPer1k": 0.003,
      "outputPer1k": 0.015
    },
    "claude-haiku-4-5-20251001": {
      "inputPer1k": 0.001,
      "outputPer1k": 0.005
    },
    "claude-opus-4-5-20251101": {
      "inputPer1k": 0.005,
      "outputPer1k": 0.025
    }
  },
  "retry": {
    "maxRetries": 3,
    "baseDelayMs": 1000,
    "maxDelayMs": 8000
  },
  "history": {
    "enabled": true,
    "maxMessages": 20
  }
}
EOF
```

Set your API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 13.3 Usage Examples

```bash
# Interactive chat
ai-client chat

# Single query
ai-client ask "Explain TypeScript generics"

# Use different model
ai-client chat --model claude-haiku-4-5-20251001

# Enable debug mode
ai-client chat --debug

# View stats
ai-client stats
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

- **Cost calculation**: Verify token-to-cost conversion accuracy.
- **Retry logic**: Mock timers, test exponential backoff formula.
- **Error classification**: Test HTTP status → error type mapping.
- **Config loading**: Test env var resolution and file parsing.

### 14.2 Integration Tests

- **Mock Anthropic API**: Use `nock` or similar to intercept HTTP calls.
- **CLI invocation**: Test command parsing and output formatting.

### 14.3 Example Test (Vitest)

```typescript
// tests/cost-tracker.test.ts

import { describe, it, expect } from 'vitest';
import { CostTracker } from '../src/lib/cost-tracker';

describe('CostTracker', () => {
  it('should calculate costs correctly', () => {
    const tracker = new CostTracker();
    
    tracker.addUsage({
      inputTokens: 1000,
      outputTokens: 2000,
      inputCost: 0.003,
      outputCost: 0.030,
      totalCost: 0.033,
    });
    
    const stats = tracker.getStats();
    expect(stats.totalInputTokens).toBe(1000);
    expect(stats.totalOutputTokens).toBe(2000);
    expect(stats.totalCost).toBe(0.033);
    expect(stats.requestCount).toBe(1);
  });
});
```

---

## 15. Ink vs. Readline Trade-offs

### When to Use Ink
- ✅ Rich, interactive multi-turn conversations
- ✅ Real-time status updates (spinners, progress bars)
- ✅ Complex layouts (multi-column stats, panels)
- ✅ Better visual hierarchy and formatting

### When to Use Readline/Console
- ✅ Simple one-shot commands (`ask`, `stats`)
- ✅ Minimal dependencies
- ✅ Faster startup time
- ✅ Works in restricted environments (CI/CD, Docker)

### Hybrid Recommendation
Use Ink for `chat` command only, keep `ask` and `stats` as plain console output.

## 16. Future Enhancements

- **Session persistence**: Save/restore conversation history across runs.
- **Streaming responses**: Use Anthropic's streaming API with Ink's real-time rendering.
- **Multi-model support**: Switch models mid-conversation via `/model` command.
- **Token estimation**: Pre-calculate context size before API call.
- **Prompt templates**: Allow users to define reusable system prompts.
- **Export conversations**: Save chat history as Markdown or JSON.
- **Syntax highlighting**: Use `ink-markdown` for formatted code blocks in responses.

---

## 17. Security Considerations

- **API key storage**: Never commit config files with API keys. Use `.gitignore`.
- **File permissions**: Set `chmod 600` on `~/.ai-client/config.json`.
- **Logging**: Avoid logging full prompts or API keys, even in debug mode.
- **Input sanitization**: Validate user input to prevent injection attacks.

---

## 18. Implementation Roadmap

This project should be broken into **5 phases** with clear milestones and dependencies.

### Phase 1: Foundation (MVP) 🎯
**Goal**: Basic working CLI with single-shot queries

- **Ticket 1.1**: Project setup
  - Initialize Node.js/TypeScript project
  - Configure `package.json`, `tsconfig.json`, `.gitignore`
  - Set up Commander.js CLI skeleton
  - Install core dependencies (`@anthropic-ai/sdk`, `commander`)
  - **Deliverable**: `npm run dev` runs basic CLI with `--help`

- **Ticket 1.2**: Configuration system
  - Implement `config.ts` with env var resolution
  - Create default config schema and validation
  - Add config file loading from `~/.ai-client/config.json`
  - **Deliverable**: Config loads API key from env or file

- **Ticket 1.3**: Error handling foundation
  - Create custom error types (`errors.ts`)
  - Implement error classification by status code
  - Add `isRetryable()` helper
  - **Deliverable**: Error types and classification logic

- **Ticket 1.4**: Basic Anthropic client
  - Implement `AnthropicClient` class (without retry)
  - Add `sendMessage()` method
  - Handle response parsing
  - **Deliverable**: Can send single message to Anthropic API

- **Ticket 1.5**: `ask` command (MVP)
  - Implement single-shot `ask <prompt>` command
  - Display plain text response
  - Basic error handling (no retry yet)
  - **Deliverable**: `ai-client ask "hello"` works

**Milestone 1**: Basic CLI working end-to-end ✅

---

### Phase 2: Resilience & Cost Tracking 💰
**Goal**: Add retry logic and cost visibility

- **Ticket 2.1**: Retry logic with exponential backoff
  - Implement `retry.ts` with `withRetry()` function
  - Add jitter and max delay capping
  - Test with mocked failures
  - **Deliverable**: Retry utility with unit tests

- **Ticket 2.2**: Integrate retry into client
  - Update `AnthropicClient` to use `withRetry()`
  - Add retry callback for debug logging
  - Handle all retryable errors
  - **Deliverable**: Client automatically retries transient failures

- **Ticket 2.3**: Cost tracking system
  - Implement `CostTracker` class
  - Add token counting and cost calculation
  - Update `AnthropicClient` to return usage stats
  - **Deliverable**: Track tokens and costs per request

- **Ticket 2.4**: Display costs in `ask` command
  - Show token usage and cost after each response
  - Format with 4 decimal places
  - Add `--debug` flag for detailed output
  - **Deliverable**: `ask` command shows cost info

**Milestone 2**: Robust single-shot CLI with cost tracking ✅

---

### Phase 3: Conversation History 💬
**Goal**: Multi-turn chat with context management

- **Ticket 3.1**: Conversation manager
  - Implement `ConversationManager` class
  - Add message storage and retrieval
  - Implement sliding window context management
  - **Deliverable**: Conversation state management

- **Ticket 3.2**: Interactive REPL with readline
  - Create basic `chat` command using Node.js `readline`
  - Implement input loop with prompt
  - Handle special commands (`/exit`, `/reset`, `/stats`, `/history`)
  - **Deliverable**: Basic interactive chat (no Ink yet)

- **Ticket 3.3**: Integrate conversation into chat
  - Connect `ConversationManager` to chat loop
  - Send conversation history with each request
  - Display assistant responses
  - **Deliverable**: Multi-turn conversations work

- **Ticket 3.4**: Session statistics (CostTracker class)
  - Create dedicated `CostTracker` class for session-level statistics
  - Add cumulative cost tracking per session
  - Implement `/stats` command in chat
  - Show stats on `/exit`
  - Support reset functionality with `/reset` command
  - **Deliverable**: Session-level cost visibility with dedicated tracker class

**Milestone 3**: Working interactive chat with history ✅

---

### Phase 4: Rich UI with Ink 🎨
**Goal**: Upgrade chat experience with Ink components

- **Ticket 4.1**: Ink setup and basic component
  - Add Ink dependencies (`ink`, `react`, `ink-text-input`, etc.)
  - Create basic `ChatApp.tsx` component
  - Render simple "Hello World" with Ink
  - **Deliverable**: Ink renders in terminal

- **Ticket 4.2**: Chat UI components
  - Build `Message.tsx` component (styled user/assistant messages)
  - Add `UsageStats.tsx` for live cost display
  - Create `Spinner.tsx` for loading states
  - **Deliverable**: Reusable UI components

- **Ticket 4.3**: Replace readline with Ink chat
  - Integrate `TextInput` for user input
  - Wire up state management (messages, loading, stats)
  - Handle special commands in React
  - **Deliverable**: Full Ink-based chat interface

- **Ticket 4.4**: Polish and UX improvements
  - Add colors and formatting
  - Implement smooth loading animations
  - Show real-time cost updates
  - Handle errors gracefully in UI
  - **Deliverable**: Production-ready chat UI

**Milestone 4**: Beautiful interactive chat with Ink ✅

---

### Phase 5: Persistence & Advanced Features 🚀
**Goal**: Session persistence and quality-of-life improvements

- **Ticket 5.1**: Stats persistence
  - Implement `storage.ts` utility
  - Save global stats to `~/.ai-client/stats.json`
  - Create `stats` command to display lifetime stats
  - **Deliverable**: Persistent usage tracking

- **Ticket 5.2**: Conversation persistence
  - Save conversations to `~/.ai-client/sessions/*.json`
  - Add `--resume <session-id>` flag
  - List available sessions
  - **Deliverable**: Resume previous conversations

- **Ticket 5.3**: Testing suite
  - Unit tests for cost calculation, retry logic, errors
  - Mock Anthropic API responses
  - CLI integration tests
  - **Deliverable**: >80% test coverage

- **Ticket 5.4**: Documentation and polish
  - Write comprehensive README with examples
  - Add inline code documentation
  - Create troubleshooting guide
  - **Deliverable**: Production-ready documentation

**Milestone 5**: Feature-complete, production-ready CLI ✅

---

### Phase 6 (Optional): Advanced Features 🌟
**Future enhancements (post-MVP)**

- Streaming responses with real-time token display
- Multi-model switching mid-conversation
- Prompt templates and system message presets
- Export conversations as Markdown/JSON
- Syntax highlighting for code blocks
- Token usage visualization (charts)
- Conversation search and filtering

---

## 19. Dependency Graph

```
Phase 1 (Foundation)
  └─> Phase 2 (Resilience & Cost)
       └─> Phase 3 (Conversation)
            ├─> Phase 4 (Ink UI) [parallel]
            └─> Phase 5 (Persistence) [parallel]
                 └─> Phase 6 (Advanced) [optional]
```

**Key Dependencies:**
- Phase 2 depends on Phase 1 (need basic client first)
- Phase 3 depends on Phase 2 (conversation needs cost tracking)
- Phases 4 & 5 can be developed in parallel after Phase 3
- Phase 4 is optional (readline chat works without Ink)

---

## 20. Effort Estimates

| Phase | Tickets | Estimated Time | Complexity |
|-------|---------|----------------|------------|
| Phase 1 | 5 | 4-6 hours | Low |
| Phase 2 | 4 | 3-4 hours | Medium |
| Phase 3 | 4 | 4-5 hours | Medium |
| Phase 4 | 4 | 5-7 hours | High |
| Phase 5 | 4 | 4-6 hours | Medium |
| **Total** | **21** | **20-28 hours** | - |

**Recommendations:**
- Start with **Phase 1-3** for a working chat tool (11-15 hours)
- Add **Phase 4** if you want the polished UI (optional)
- **Phase 5** adds nice-to-haves but not critical for MVP

---

## 21. Agent Strategy

To efficiently execute this project, create **specialized agents** aligned with domains and phases.

### 21.1 Recommended Agents

#### 0. **@project-architect** (Coordinator/Manager) 🎯
**Scope**: Cross-cutting coordination, architecture decisions, agent orchestration  
**Phases**: All phases (oversight)  
**Responsibilities**:
- **Phase planning**: Break down specs into actionable tickets
- **Agent coordination**: Assign tickets to appropriate agents
- **Handoff management**: Ensure smooth transitions between phases
- **Integration oversight**: Verify components work together
- **Architecture decisions**: Resolve design conflicts between agents
- **Dependency tracking**: Ensure prerequisites are met before starting tickets
- **Code review**: High-level review of critical integrations
- **Risk management**: Identify blockers and coordinate solutions
- **Progress reporting**: Track milestone completion

**Skills**: System design, TypeScript, project management, technical leadership

**When to involve @project-architect**:
- ✅ Starting a new phase (validate readiness)
- ✅ Integration points between agents (e.g., CLI wrapping backend logic)
- ✅ Breaking changes to interfaces/APIs
- ✅ Choosing between alternative implementations
- ✅ Resolving agent conflicts or ambiguities
- ✅ End-of-phase reviews (validate milestone deliverables)

**When NOT to involve**:
- ❌ Simple bug fixes within a single module
- ❌ Routine implementation tasks with clear specs
- ❌ Documentation updates that don't affect architecture

---

#### 1. **@backend-engineer** 
**Scope**: Core business logic, API integration, error handling  
**Phases**: 1, 2, 3  
**Responsibilities**:
- TypeScript project setup and configuration
- Anthropic API client wrapper
- Retry logic with exponential backoff
- Error classification and handling
- Configuration management
- Conversation manager
- Cost tracking logic

**Skills**: Node.js, TypeScript, REST APIs, error handling patterns, async/await

---

#### 2. **@cli-developer**
**Scope**: Command-line interface, argument parsing, user interactions  
**Phases**: 1, 3  
**Responsibilities**:
- Commander.js setup and command routing
- `ask` command (single-shot queries)
- Basic `chat` command with readline
- Special commands (`/reset`, `/stats`, `/exit`)
- CLI UX and help text

**Skills**: Commander.js, Node.js readline, CLI best practices, user input handling

---

#### 3. **@frontend-engineer** (React/Ink specialist)
**Scope**: Terminal UI components with React/Ink  
**Phases**: 4  
**Responsibilities**:
- Ink component architecture
- ChatApp main component
- Message rendering with colors/formatting
- Loading states and spinners
- Real-time stats display
- Input handling with `ink-text-input`
- State management in React

**Skills**: React, Ink, TypeScript, component design, terminal UIs

---

#### 4. **@devops-engineer**
**Scope**: Build pipeline, packaging, distribution  
**Phases**: 1, 5  
**Responsibilities**:
- Package.json scripts (build, dev, test)
- TypeScript configuration
- npm/bin setup for global installation
- Storage utilities for file I/O
- Session persistence logic
- Stats file management

**Skills**: Node.js tooling, npm packaging, file systems, build tools

---

#### 5. **@qa-engineer**
**Scope**: Testing, validation, quality assurance  
**Phases**: 5  
**Responsibilities**:
- Unit tests (Vitest)
- Mock Anthropic API responses
- Test retry logic and error handling
- Integration tests for CLI commands
- Coverage reports
- Edge case validation

**Skills**: Vitest, testing patterns, mocking, test-driven development

---

#### 6. **@technical-writer** (Optional)
**Scope**: Documentation and user guides  
**Phases**: 5, ongoing  
**Responsibilities**:
- README.md with installation and usage
- API documentation and JSDoc comments
- Troubleshooting guide
- Configuration examples
- Release notes

**Skills**: Technical writing, Markdown, documentation best practices

---

### 21.2 Agent Assignment by Phase

| Phase | Coordinator | Primary Agent | Supporting Agents |
|-------|-------------|--------------|-------------------|
| **Phase 1** | @project-architect | @backend-engineer | @cli-developer, @devops-engineer |
| **Phase 2** | @project-architect | @backend-engineer | @devops-engineer |
| **Phase 3** | @project-architect | @cli-developer | @backend-engineer |
| **Phase 4** | @project-architect | @frontend-engineer | @backend-engineer |
| **Phase 5** | @project-architect | @devops-engineer | @qa-engineer, @backend-engineer |
| **Documentation** | @project-architect | @technical-writer | All agents |

---

### 21.3 Workflow Pattern

**With @project-architect coordination:**

**Phase 1-2-3 (Foundation → Resilience → Conversation)**:
```
@project-architect → Reviews spec, creates tickets, assigns agents
                   ↓
@backend-engineer → Implements core logic
                   ↓
@project-architect → Reviews interfaces/exports for next phase
                   ↓
@cli-developer → Wraps in CLI commands
                   ↓
@project-architect → Integration review (CLI + backend)
                   ↓
@devops-engineer → Ensures build/packaging works
                   ↓
@project-architect → Phase milestone validation
```

**Phase 4 (Ink UI)**:
```
@project-architect → Validates Phase 3 complete, plans UI architecture
                   ↓
@frontend-engineer → Builds React components
                   ↓
@project-architect → Reviews component interfaces
                   ↓
@backend-engineer → Integrates with existing client
                   ↓
@cli-developer → Updates chat command entry point
                   ↓
@project-architect → End-to-end integration test
```

**Phase 5 (Polish)**:
```
@project-architect → Reviews Phase 4, plans final polish
                   ↓
@qa-engineer → Writes comprehensive tests
              ↓
@devops-engineer → Implements persistence
                  ↓
@project-architect → Reviews test coverage & storage strategy
                  ↓
@technical-writer → Documents everything
                  ↓
@project-architect → Final release review
```

---

### 21.4 Agent Communication Protocol

**Standard ticket workflow:**

1. **@project-architect** reviews spec and creates ticket with:
   - Clear requirements and acceptance criteria
   - Assigned primary agent
   - List of dependencies (completed tickets)
   - Integration points with other agents
   - Review checkpoints

2. **Primary agent** implements the feature:
   - Follows spec and ticket requirements
   - Exposes clean interfaces for other agents
   - Documents public APIs/exports
   - Flags any architectural concerns to @project-architect

3. **@project-architect** reviews critical integration points:
   - Validates interfaces match downstream needs
   - Ensures no breaking changes to existing code
   - Approves handoff to next agent

4. **Supporting agents** integrate or extend:
   - Use exposed interfaces from previous work
   - Flag integration issues to @project-architect

5. **@qa-engineer** validates (Phase 5):
   - Writes tests based on requirements
   - Reports bugs back to original agent

**Example for Ticket 2.1 (Retry Logic)**:
- **Coordinator**: @project-architect
- **Owner**: @backend-engineer
- **Review checkpoints**: 
  - @project-architect validates retry interface before integration
  - @cli-developer provides feedback on usability
- **Tester**: @qa-engineer (will mock failures in Phase 5)

**Handoff example (Phase 1 → Phase 2)**:
```
@project-architect: "Phase 1 complete. Reviewing AnthropicClient interface..."
                    "✅ sendMessage() signature looks good for retry wrapper"
                    "@backend-engineer: Please proceed with Ticket 2.1"
                    
@backend-engineer: "Retry logic implemented in withRetry() utility"
                   "Updated AnthropicClient to use it"
                   "@project-architect: Ready for review"
                   
@project-architect: "Reviewed. Interface clean. No breaking changes."
                    "@cli-developer: Phase 2 complete, you can proceed with chat command"
```

---

### 21.5 Value Proposition of @project-architect

**Benefits:**
- ✅ **Prevents rework**: Catches integration issues early before code is written
- ✅ **Reduces conflicts**: Makes architectural decisions before agents diverge
- ✅ **Cleaner handoffs**: Validates deliverables before next phase starts
- ✅ **Better interfaces**: Ensures exported APIs meet downstream needs
- ✅ **Risk mitigation**: Identifies blockers and dependencies proactively
- ✅ **Quality gate**: Acts as final reviewer for milestone completion
- ✅ **Knowledge continuity**: Maintains high-level view across all phases

**Cost:**
- ❌ Extra review cycles add time (but save debugging time later)
- ❌ One more agent to coordinate (but reduces inter-agent conflicts)

**Recommendation**: 
- **Use @project-architect** if:
  - Team has 3+ specialized agents
  - Project duration > 2 weeks
  - Multiple integration points between agents
  - First time building this type of system

- **Skip if**:
  - Single developer doing everything
  - Very small project (<1 week)
  - All agents are highly experienced with this stack

---

### 21.6 Minimal Agent Setup (Lean Team)

If you want to minimize agents, consolidate to **3 core agents**:

1. **@fullstack-developer** (combines backend + cli + frontend)
   - Phases 1-4
   - Handles TypeScript, Commander.js, Ink, API integration

2. **@platform-engineer** (combines devops + qa)
   - Phase 5
   - Handles build, tests, persistence

3. **@technical-writer** (optional)
   - Documentation throughout

**Note**: Even in lean setup, consider @project-architect for phase transitions and integration reviews.

---

### 21.7 Agent Context Requirements

Each agent should have access to:
- This spec document
- Phase-specific sections (relevant to their work)
- Type definitions from `src/types/index.ts`
- Previous phase deliverables (if building on top)

**Context optimization**:
- **@project-architect** needs: Full spec (all sections), dependency graph, current phase status
- **@backend-engineer** needs: Sections 4-10 (data models, core logic)
- **@cli-developer** needs: Sections 11 (commands), section 8 (client interfaces)
- **@frontend-engineer** needs: Section 11.2.1 (Ink components), section 10 (cost tracker)
- **@qa-engineer** needs: Section 14 (testing strategy), all type definitions
- **@technical-writer** needs: Full spec, all implemented code

---

### 21.8 Decision Matrix: When to Use @project-architect

| Scenario | Use Architect? | Reason |
|----------|---------------|---------|
| Starting a new phase | ✅ Yes | Validate prerequisites, plan tickets |
| Agent needs clarification on requirements | ✅ Yes | Architectural authority |
| Integration between 2+ agents | ✅ Yes | Coordinate interfaces |
| Breaking API changes | ✅ Yes | Impact assessment needed |
| Bug fix in single module | ❌ No | Agent can fix directly |
| Adding JSDoc comments | ❌ No | Documentation task only |
| Implementing already-specified function | ❌ No | Clear requirements exist |
| Choosing between library A vs B | ✅ Yes | Strategic decision |
| Refactoring internal implementation | ⚠️ Maybe | If affects other agents |
| End-of-phase milestone | ✅ Yes | Quality gate validation |

---

## 22. References

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [@anthropic-ai/sdk GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Ink Components](https://github.com/vadimdemedes/ink#useful-components)
- [Node.js Readline](https://nodejs.org/api/readline.html) (for comparison)
