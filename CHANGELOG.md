# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### Added

#### Core Features
- **Interactive Chat** - Terminal-based chat interface with conversation history
- **Single-shot Queries** - Quick `ask` command for one-off questions
- **Session Management** - Save and resume conversations with unique session IDs
- **Usage Statistics** - Real-time cost tracking and token usage monitoring
- **Configuration System** - Flexible JSON-based configuration with environment variable support

#### Technical Features
- **Retry Logic** - Exponential backoff with jitter for handling transient API failures
- **Error Classification** - Smart error handling to distinguish retryable from permanent failures
- **Sliding Window Context** - Configurable conversation history management to stay within token limits
- **Cost Calculation** - Accurate per-request and cumulative cost tracking based on Anthropic pricing
- **Session Persistence** - JSON-based storage for conversation history

#### Developer Experience
- **TypeScript** - Full type safety throughout the codebase
- **Comprehensive Testing** - 146 tests with 100% coverage on critical modules
- **ESM Support** - Modern ES modules with proper TypeScript configuration
- **Beautiful UI** - Terminal interface powered by Ink and React

#### CLI Commands
- `ai-client ask <prompt>` - Send a single query to Claude
- `ai-client chat` - Start an interactive chat session
- `ai-client stats` - View usage statistics and costs
- `ai-client sessions` - Manage saved conversation sessions

#### Configuration
- Support for Claude Sonnet 4.5, Haiku 4.5, and Opus 4.5
- Customizable retry behavior
- Adjustable conversation history window
- Custom pricing configuration
- Environment variable resolution with `env:VAR_NAME` syntax

#### Documentation
- Comprehensive README with installation, usage, and troubleshooting
- Configuration examples for different use cases
- Contributing guidelines
- JSDoc comments on public APIs
- Inline documentation for complex logic

#### Testing
- Vitest test framework with v8 coverage
- 100% statement coverage on core modules
- 98.66% branch coverage overall
- Mocked external dependencies (Anthropic SDK, file system)
- Fast test execution (< 200ms for 146 tests)

### Technical Details

#### Dependencies
- `@anthropic-ai/sdk` ^0.32.0 - Official Anthropic API client
- `commander` ^12.0.0 - CLI framework
- `ink` ^6.5.1 - React for terminal UIs
- `ink-spinner` ^5.0.0 - Loading spinners
- `ink-text-input` ^6.0.0 - Text input component
- `react` ^19.2.0 - UI rendering

#### Dev Dependencies
- `typescript` ^5.3.0 - Type safety
- `vitest` ^4.0.14 - Testing framework
- `@vitest/coverage-v8` ^4.0.14 - Coverage reporting
- `tsx` ^4.7.0 - TypeScript execution

#### Architecture
- **Modular Design** - Separation of concerns across commands, lib, and utils
- **Error Handling** - Custom error classes with classification logic
- **Type Safety** - Strict TypeScript with comprehensive type definitions
- **Testability** - Dependency injection and mocking-friendly design

### Bug Fixes
- Fixed `conversation.ts`: Handle `maxMessages === 0` edge case to prevent returning all messages
- Fixed `errors.ts`: Add null/undefined error handling in `classifyError()` function

### Performance
- Fast startup time
- Minimal dependencies
- Efficient token counting
- Optimized retry delays

### Security
- No hardcoded API keys
- Secure file permissions recommendations
- Environment variable support
- No sensitive data in logs

## [Unreleased]

### Planned Features
- Streaming responses support
- Conversation export (Markdown, JSON, PDF)
- Shell completion (bash, zsh, fish)
- Conversation search and filtering
- Cost budgets and alerts
- Model comparison mode
- Prompt templates
- GitHub Actions CI/CD

### Future Improvements
- Performance benchmarks
- Integration tests with real API
- E2E testing suite
- Enhanced error recovery
- Better progress indicators
- Conversation tagging
- Multi-language support

---

## Release Notes

### v1.0.0 - Initial Release

This is the first stable release of AI Client Tool, featuring a complete CLI interface for interacting with Anthropic's Claude AI models. The tool has been thoroughly tested with 100% coverage on critical modules and includes comprehensive documentation.

**Highlights:**
- ✅ Production-ready with comprehensive error handling
- ✅ Well-tested with 146 automated tests
- ✅ Fully documented with examples and troubleshooting guides
- ✅ Beautiful terminal UI for interactive chat
- ✅ Real-time cost tracking and usage statistics
- ✅ Smart retry logic with exponential backoff

**Getting Started:**
```bash
npm install -g ai-client-tool
export ANTHROPIC_API_KEY="your-key-here"
ai-client ask "Hello, Claude!"
```

For full installation and usage instructions, see the [README](./README.md).

---

[1.0.0]: https://github.com/evedes/ai-client-tool/releases/tag/v1.0.0
