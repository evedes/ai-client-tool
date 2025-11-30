# GitHub Copilot Code Review Instructions

## Overview
When reviewing pull requests for the AI Client Tool project, focus on code quality, TypeScript best practices, and alignment with the project specification.

## Review Priorities

### 1. Specification Compliance
- Verify implementation matches `/specs/cli-tool-spec.md`
- Check that acceptance criteria from GitHub issues are met
- Ensure TypeScript interfaces align with spec definitions
- Validate configuration schema matches documented format

### 2. Code Quality

#### TypeScript Best Practices
- Strict mode compliance (no `any` types without justification)
- Proper use of interfaces and types from `src/types/index.ts`
- ESM import/export syntax with `.js` extensions
- Correct async/await usage
- Proper error handling with typed catches

#### Node.js Standards
- Node 24+ features utilized appropriately
- No deprecated APIs
- Proper file system operations (async where possible)
- Environment variable handling is secure

#### Error Handling
- Custom error classes used appropriately (from `src/lib/errors.ts`)
- Helpful error messages with actionable guidance
- No silent failures
- Proper error propagation

### 3. Security & Best Practices
- No hardcoded API keys or secrets
- Environment variables used correctly
- File paths validated before operations
- User input sanitized appropriately
- No command injection vulnerabilities

### 4. Testing & Validation
- Acceptance criteria tested and documented
- Edge cases considered
- Error paths validated
- Configuration variations tested

### 5. Documentation
- JSDoc comments for public functions
- Complex logic explained with inline comments
- README.md updated if user-facing changes
- Type definitions self-documenting

## Specific Checks by Module

### Configuration (`src/lib/config.ts`)
- ✓ Env variable resolution works with `env:VAR_NAME` pattern
- ✓ Defaults applied correctly
- ✓ Validation throws helpful errors
- ✓ Custom paths supported
- ✓ API key never logged or exposed

### Error Handling (`src/lib/errors.ts`)
- ✓ Custom error classes extend Error properly
- ✓ Error classification logic is accurate
- ✓ Retry logic respects error types
- ✓ Stack traces preserved

### API Client (`src/lib/client.ts`)
- ✓ Anthropic SDK used correctly
- ✓ Rate limiting handled
- ✓ Token counting accurate
- ✓ Cost calculation correct per pricing model
- ✓ Streaming responses handled properly

### CLI Commands (`src/commands/`)
- ✓ Commander.js patterns followed
- ✓ Help text clear and complete
- ✓ Argument parsing robust
- ✓ User feedback informative
- ✓ Exit codes meaningful

### Storage/History (`src/lib/storage.ts`)
- ✓ JSON file handling safe
- ✓ Concurrent access considered
- ✓ File size limits respected
- ✓ Backup/recovery possible

## Code Style

### Formatting
- 2 spaces indentation
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Semicolons required
- Max line length: 100 characters

### Naming Conventions
- Interfaces: PascalCase (e.g., `Config`, `Message`)
- Functions: camelCase (e.g., `loadConfig`, `classifyError`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG`, `MAX_RETRIES`)
- Files: kebab-case (e.g., `config.ts`, `error-handler.ts`)

### Imports
- Standard library imports first
- Third-party imports second
- Local imports last
- Grouped and sorted alphabetically within each section

## Red Flags

### Immediate Rejection
- ❌ Hardcoded secrets or API keys
- ❌ Using `any` type without explanation
- ❌ Unhandled promise rejections
- ❌ Security vulnerabilities
- ❌ Breaking changes without migration path

### Requires Discussion
- ⚠️ Significant deviation from spec
- ⚠️ New dependencies not in original plan
- ⚠️ Performance concerns (synchronous file I/O in hot paths)
- ⚠️ Complex logic without comments
- ⚠️ Breaking API changes

## Review Workflow

1. **First Pass**: Check spec compliance and acceptance criteria
2. **Second Pass**: Review code quality and TypeScript usage
3. **Third Pass**: Security and error handling
4. **Fourth Pass**: Documentation and clarity
5. **Final Check**: Test validation evidence provided

## Questions to Ask

- Does this solve the problem stated in the issue?
- Is the code maintainable by someone unfamiliar with the project?
- Are error messages helpful to end users?
- Will this work across different platforms (macOS, Linux, Windows)?
- Are there edge cases not covered?
- Is the TypeScript type safety maximized?

## Approval Criteria

A PR should be approved when:
- ✓ All acceptance criteria met with evidence
- ✓ Code follows TypeScript and Node.js best practices
- ✓ No security concerns
- ✓ Error handling is robust
- ✓ Documentation is clear
- ✓ Tests/validation provided
- ✓ No breaking changes (or properly documented)

## Model Considerations

This project uses Claude 4.5 models:
- `claude-sonnet-4-5-20250929` (default)
- `claude-haiku-4-5-20251001` (fast/cheap)
- `claude-opus-4-5-20251101` (most capable)

Ensure pricing, model names, and API usage align with current Anthropic documentation.

## References
- Project Spec: `/specs/cli-tool-spec.md`
- Type Definitions: `/src/types/index.ts`
- Agent Definitions: `/.github/agents/`
