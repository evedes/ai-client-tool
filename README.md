# AI Client CLI Tool

> A powerful, developer-friendly terminal CLI for interacting with Anthropic's Claude AI models

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./tests)

## Features

- 🤖 **Interactive Chat** - Persistent conversation sessions with context management
- 💰 **Real-time Cost Tracking** - Accurate token and cost calculation per request
- 🔄 **Smart Retry Logic** - Exponential backoff with jitter for transient failures
- 🎨 **Beautiful Terminal UI** - Powered by Ink and React for a modern CLI experience
- 💾 **Session Persistence** - Save and resume conversations across sessions
- 📊 **Usage Statistics** - Track your API usage and costs over time
- ⚙️ **Flexible Configuration** - YAML/JSON config with environment variable support
- 🔐 **Secure** - API keys never hardcoded, supports environment variables

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands Reference](#commands-reference)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

## Installation

### Prerequisites

- **Node.js 24+** - Download from [nodejs.org](https://nodejs.org/)
- **Anthropic API Key** - Get yours at [console.anthropic.com](https://console.anthropic.com/)

### From Source

```bash
# Clone the repository
git clone https://github.com/evedes/ai-client-tool.git
cd ai-client-tool

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Verify Installation

```bash
ai-client --version
# Output: 1.0.0
```

## Quick Start

### 1. Set Your API Key

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

Or create a config file at `~/.ai-client/config.json`:

```json
{
  "apiKey": "env:ANTHROPIC_API_KEY"
}
```

### 2. Ask a Single Question

```bash
ai-client ask "What is the capital of France?"
```

### 3. Start an Interactive Chat

```bash
ai-client chat
```

### 4. View Your Usage Statistics

```bash
ai-client stats
```

### 5. Resume a Previous Conversation

```bash
# List all sessions
ai-client sessions

# Resume a specific session
ai-client chat --session-id <session-id>
```

## Configuration

The AI Client Tool uses a configuration file located at `~/.ai-client/config.json`. If no config file exists, default values are used.

### Configuration File Structure

```json
{
  "apiKey": "env:ANTHROPIC_API_KEY",
  "defaultModel": "claude-sonnet-4-5-20250929",
  "maxTokens": 8192,
  "temperature": 0.7,
  "retry": {
    "maxRetries": 3,
    "baseDelayMs": 1000,
    "maxDelayMs": 8000
  },
  "history": {
    "enabled": true,
    "maxMessages": 20
  },
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
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | Your Anthropic API key. Use `env:VAR_NAME` syntax for environment variables |
| `defaultModel` | string | `claude-sonnet-4-5-20250929` | The Claude model to use by default |
| `maxTokens` | number | `8192` | Maximum tokens in the response |
| `temperature` | number | `0.7` | Sampling temperature (0.0-1.0) |
| `retry.maxRetries` | number | `3` | Number of retry attempts for transient errors |
| `retry.baseDelayMs` | number | `1000` | Base delay between retries in milliseconds |
| `retry.maxDelayMs` | number | `8000` | Maximum delay between retries |
| `history.enabled` | boolean | `true` | Enable conversation history |
| `history.maxMessages` | number | `20` | Maximum messages to keep in context (sliding window) |
| `pricing` | object | (see above) | Token pricing per model (USD per 1K tokens) |

### Environment Variables

You can reference environment variables in your config using the `env:VAR_NAME` syntax:

```json
{
  "apiKey": "env:ANTHROPIC_API_KEY",
  "defaultModel": "env:CLAUDE_MODEL"
}
```

### Configuration Examples

See the [examples](./examples) directory for:
- `minimal-config.json` - Bare minimum configuration
- `development-config.json` - Development-friendly settings
- `production-config.json` - Production-optimized settings
- `multi-model-config.json` - Using multiple Claude models
- `custom-pricing-config.json` - Custom pricing configuration

## Usage

### Basic Commands

#### Ask a Single Question

```bash
# Simple query
ai-client ask "Explain quantum computing"

# With specific model
ai-client ask "Write a haiku" --model claude-haiku-4-5-20251001

# Save to file
ai-client ask "Generate a README" > output.md
```

#### Interactive Chat

```bash
# Start new chat session
ai-client chat

# Resume previous session
ai-client chat --session-id abc-123-def

# Use specific model
ai-client chat --model claude-opus-4-5-20251101
```

**Interactive Chat Commands:**
- Type your message and press Enter to send
- Type `/exit` or `/quit` to leave the chat
- Press `Ctrl+C` to force quit
- Type `/help` for available commands

#### View Statistics

```bash
# Show session stats
ai-client stats

# Show detailed breakdown
ai-client stats --verbose

# Reset statistics
ai-client stats --reset
```

#### Manage Sessions

```bash
# List all saved sessions
ai-client sessions

# Show session details
ai-client sessions --id abc-123-def

# Delete a session
ai-client sessions --delete abc-123-def
```

### Advanced Usage

#### Custom Configuration Path

```bash
ai-client ask "Hello" --config ./custom-config.json
```

#### Debug Mode

```bash
ai-client ask "Test" --debug
```

#### Disable History

```bash
ai-client chat --no-history
```

#### Set Custom Temperature

```bash
ai-client ask "Be creative" --temperature 0.9
```

## Commands Reference

### `ai-client ask <prompt>`

Send a single prompt to Claude and receive a response.

**Options:**
- `-m, --model <model>` - Override the default model
- `-t, --temperature <number>` - Set temperature (0.0-1.0)
- `-c, --config <path>` - Use custom config file
- `--max-tokens <number>` - Override max tokens
- `--debug` - Enable debug output

**Example:**
```bash
ai-client ask "What's the weather like?" --temperature 0.5
```

### `ai-client chat`

Start an interactive chat session with conversation history.

**Options:**
- `-s, --session-id <id>` - Resume a specific session
- `-m, --model <model>` - Override the default model
- `-c, --config <path>` - Use custom config file
- `--no-history` - Disable conversation history
- `--debug` - Enable debug output

**Example:**
```bash
ai-client chat --session-id my-project-notes
```

### `ai-client stats`

Display usage statistics and cost tracking.

**Options:**
- `-v, --verbose` - Show detailed breakdown
- `-r, --reset` - Reset all statistics
- `-c, --config <path>` - Use custom config file

**Example:**
```bash
ai-client stats --verbose
```

### `ai-client sessions`

Manage saved conversation sessions.

**Options:**
- `-l, --list` - List all sessions (default)
- `-i, --id <session-id>` - Show session details
- `-d, --delete <session-id>` - Delete a session
- `-c, --config <path>` - Use custom config file

**Example:**
```bash
ai-client sessions --delete old-session-123
```

## Troubleshooting

### Common Issues

#### Authentication Failed

**Error:** `Authentication failed. Check your ANTHROPIC_API_KEY in config.`

**Solutions:**
1. Verify your API key is set:
   ```bash
   echo $ANTHROPIC_API_KEY
   ```
2. Check your config file:
   ```bash
   cat ~/.ai-client/config.json
   ```
3. Ensure the env variable syntax is correct: `"apiKey": "env:ANTHROPIC_API_KEY"`
4. Get a new key at [console.anthropic.com](https://console.anthropic.com/)

#### Rate Limited

**Error:** `Rate limited by Anthropic API. Retrying with backoff...`

**Solutions:**
- The CLI automatically retries with exponential backoff
- Wait 60 seconds before making more requests
- Consider upgrading your Anthropic plan
- Reduce request frequency

#### Invalid Configuration

**Error:** `Failed to parse config file`

**Solutions:**
1. Validate your JSON syntax:
   ```bash
   cat ~/.ai-client/config.json | jq .
   ```
2. Check for trailing commas (not allowed in JSON)
3. Ensure quotes are properly escaped
4. Use the config examples as templates

#### Session Not Found

**Error:** `Session not found: abc-123-def`

**Solutions:**
1. List available sessions:
   ```bash
   ai-client sessions
   ```
2. Check session files:
   ```bash
   ls ~/.ai-client/sessions/
   ```
3. Verify the session ID is complete (UUID format)

#### Permission Denied

**Error:** `EACCES: permission denied, open '~/.ai-client/config.json'`

**Solutions:**
```bash
# Fix directory permissions
chmod 700 ~/.ai-client/

# Fix config file permissions
chmod 600 ~/.ai-client/config.json

# Fix session files
chmod 600 ~/.ai-client/sessions/*.json
```

#### Network Errors

**Error:** `Network error occurred. Check your connection.`

**Solutions:**
1. Check your internet connection
2. Verify Anthropic API status: [status.anthropic.com](https://status.anthropic.com)
3. Try with a different network
4. Check firewall/proxy settings

#### Cost Calculation Issues

**Problem:** Costs seem incorrect

**Solutions:**
1. Verify pricing in config matches [Anthropic's current rates](https://www.anthropic.com/pricing)
2. Check model name spelling: `claude-sonnet-4-5-20250929`
3. View detailed stats: `ai-client stats --verbose`
4. Ensure pricing is set for all models you're using

### Debug Mode

For more detailed error information, run any command with `--debug`:

```bash
ai-client ask "test" --debug
```

### Getting Help

- 📖 [Full Documentation](https://github.com/evedes/ai-client-tool)
- 🐛 [Report Issues](https://github.com/evedes/ai-client-tool/issues)
- 💬 [Discussions](https://github.com/evedes/ai-client-tool/discussions)

## Development

### Setup Development Environment

```bash
# Clone and install
git clone https://github.com/evedes/ai-client-tool.git
cd ai-client-tool
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build
```

### Project Structure

```
ai-client-tool/
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── ask.ts        # Single-shot queries
│   │   ├── chat.ts       # Interactive chat
│   │   ├── stats.ts      # Usage statistics
│   │   └── sessions.ts   # Session management
│   ├── lib/              # Core library code
│   │   ├── anthropic-client.ts  # API client wrapper
│   │   ├── config.ts            # Configuration management
│   │   ├── conversation.ts      # Conversation state
│   │   ├── cost-tracker.ts      # Cost tracking
│   │   ├── errors.ts            # Error classification
│   │   └── retry.ts             # Retry logic
│   ├── components/       # Ink UI components
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # CLI entry point
├── tests/               # Test files (100% coverage)
├── examples/            # Configuration examples
└── docs/               # Additional documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test tests/lib/cost-tracker.test.ts

# Watch mode for development
npm test -- --watch

# UI mode
npm run test:ui
```

### Code Style

- **TypeScript** - Strict mode enabled
- **ESM** - ES modules with `.js` extensions in imports
- **Formatting** - 2-space indentation, single quotes
- **Linting** - Follow existing patterns

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Testing Guidelines

- Write tests for all new features
- Maintain 100% coverage on critical modules
- Use Vitest for testing
- Mock external dependencies (Anthropic API, file system)
- Follow existing test patterns

## Testing

This project has comprehensive test coverage using Vitest:

- **146 tests** across 6 test suites
- **100% statement coverage**
- **98.66% branch coverage**
- All external dependencies mocked

Run tests:
```bash
npm test
```

See [Testing Guide](./docs/testing.md) for more details.

## Architecture

### Key Design Decisions

1. **Retry Logic**: Exponential backoff with jitter to handle transient API failures gracefully
2. **Sliding Window History**: Configurable context management to stay within token limits
3. **Cost Tracking**: Real-time calculation to give users transparency on API costs
4. **Session Persistence**: JSON-based storage for simple, debuggable session management
5. **Error Classification**: Smart error handling to distinguish retryable from permanent failures

### Technology Stack

- **TypeScript 5.3** - Type safety and developer experience
- **Node.js 24+** - Modern JavaScript runtime
- **Commander.js** - CLI framework
- **Ink** - React for terminal UIs
- **Anthropic SDK** - Official API client
- **Vitest** - Fast, modern testing framework

## License

MIT © Eduardo Vedes

---

## FAQ

**Q: Which Claude models are supported?**  
A: All Claude models are supported. Current defaults are Sonnet 4.5, Haiku 4.5, and Opus 4.5.

**Q: Does this tool make actual API calls?**  
A: Yes, it calls the Anthropic API. API usage and costs apply.

**Q: Where are conversations stored?**  
A: Sessions are stored in `~/.ai-client/sessions/` as JSON files.

**Q: Can I use this in CI/CD pipelines?**  
A: Yes! Use the `ask` command for scriptable, non-interactive usage.

**Q: How accurate is the cost tracking?**  
A: Cost calculations are based on Anthropic's published pricing and actual token counts from API responses.

**Q: Can I customize the pricing?**  
A: Yes, edit the `pricing` section in your config file to match your plan's rates.

---

**Made with ❤️ by developers, for developers**
