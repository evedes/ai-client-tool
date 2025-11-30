# Contributing to AI Client Tool

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, professional, and inclusive. We're all here to build something useful.

## Getting Started

### Prerequisites

- Node.js 24+
- Git
- A GitHub account
- Familiarity with TypeScript and CLI applications

### Setup Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-client-tool.git
   cd ai-client-tool
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/evedes/ai-client-tool.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Run tests to verify setup:**
   ```bash
   npm test
   ```

6. **Build the project:**
   ```bash
   npm run build
   ```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions or modifications
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test tests/lib/your-test.test.ts

# Run in watch mode
npm test -- --watch
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add new feature X"
```

**Commit message format:**
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat: add support for custom models

Allows users to define custom Claude models in their configuration
with custom pricing.

Closes #42
```

```
fix: handle null error in classifyError function

Adds null/undefined check to prevent crashes when error object
is missing.
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Code Style Guide

### TypeScript

- Use **strict mode** (enabled by default)
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Export types from `src/types/index.ts`

### Naming Conventions

- **Files:** kebab-case (`cost-tracker.ts`)
- **Classes:** PascalCase (`CostTracker`)
- **Functions:** camelCase (`calculateCost`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_CONFIG`)
- **Interfaces:** PascalCase (`Config`, `Message`)

### Formatting

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** 100 characters max
- **Trailing commas:** Use in multiline objects/arrays

### Import Order

1. Node.js built-ins
2. External packages
3. Internal modules (using `@/` alias)

```typescript
import * as fs from 'fs';
import * as path from 'path';

import Anthropic from '@anthropic-ai/sdk';
import { Command } from 'commander';

import { loadConfig } from '@/lib/config.js';
import { AnthropicClient } from '@/lib/anthropic-client.js';
```

### Comments

- Use JSDoc for public functions
- Explain **why**, not **what**
- Keep comments up to date
- Avoid obvious comments

```typescript
/**
 * Applies exponential backoff with jitter to retry delays.
 * Jitter prevents thundering herd problem when multiple clients retry simultaneously.
 */
function calculateDelay(attempt: number): number {
  // ...
}
```

## Testing Guidelines

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies

```typescript
describe('CostTracker', () => {
  it('should accumulate costs across multiple requests', () => {
    // Arrange
    const tracker = new CostTracker();
    
    // Act
    tracker.addUsage({ inputTokens: 100, outputTokens: 200, totalCost: 0.003 });
    tracker.addUsage({ inputTokens: 50, outputTokens: 100, totalCost: 0.0015 });
    
    // Assert
    expect(tracker.getStats().totalCost).toBeCloseTo(0.0045);
  });
});
```

### Test Organization

- One test file per source file
- Group related tests with `describe`
- Use `beforeEach` for setup
- Clean up with `afterEach` if needed

### Coverage Requirements

- **Critical modules:** 100% coverage (retry, errors, cost-tracker)
- **Core modules:** 80%+ coverage (config, anthropic-client, conversation)
- **Commands:** 70%+ coverage
- **UI components:** 50%+ coverage (Ink testing is complex)

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass locally
- [ ] Coverage requirements met
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] All tests passing

## Related Issues
Closes #123
```

### Review Process

1. Automated tests run on all PRs
2. Maintainer reviews code
3. Address feedback if requested
4. Once approved, PR is merged
5. Delete your feature branch

## Project Structure

```
ai-client-tool/
├── src/
│   ├── commands/       # CLI command handlers
│   ├── lib/           # Core business logic
│   ├── components/    # Ink UI components
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── tests/             # Test files (mirrors src/)
├── examples/          # Configuration examples
├── docs/              # Additional documentation
└── specs/             # Project specifications
```

## Areas to Contribute

### High Priority

- [ ] Add support for streaming responses
- [ ] Implement conversation search/filter
- [ ] Add export functionality (Markdown, JSON, PDF)
- [ ] Create GitHub Actions CI/CD workflow
- [ ] Add shell completion (bash, zsh, fish)

### Medium Priority

- [ ] Add conversation tagging
- [ ] Implement cost budgets/alerts
- [ ] Add model comparison mode
- [ ] Support for prompt templates
- [ ] Multi-language support

### Documentation

- [ ] Video tutorials
- [ ] More usage examples
- [ ] API documentation with TypeDoc
- [ ] Architecture diagrams
- [ ] Performance optimization guide

### Testing

- [ ] Integration tests for CLI commands
- [ ] E2E tests with real API calls (mocked)
- [ ] Performance benchmarks
- [ ] Load testing

## Questions or Need Help?

- 📖 Read the [README](./README.md)
- 🐛 Check [existing issues](https://github.com/evedes/ai-client-tool/issues)
- 💬 Start a [discussion](https://github.com/evedes/ai-client-tool/discussions)
- 📧 Contact maintainers

## Recognition

All contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Forever appreciated ❤️

---

**Thank you for contributing to AI Client Tool!**
