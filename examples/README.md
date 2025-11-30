# Configuration Examples

This directory contains example configuration files for different use cases.

## Available Examples

### 1. Minimal Configuration (`minimal-config.json`)
The bare minimum required to run the AI Client Tool. Uses all default values.

**Use case:** Quick start, testing

```bash
cp examples/minimal-config.json ~/.ai-client/config.json
```

### 2. Development Configuration (`development-config.json`)
Optimized for development with faster, cheaper model and reduced retry attempts.

**Features:**
- Uses Claude Haiku (faster, more economical)
- Reduced token limits for faster responses
- Shorter retry delays
- Smaller conversation history

**Use case:** Local development, testing, iteration

```bash
cp examples/development-config.json ~/.ai-client/config.json
```

### 3. Production Configuration (`production-config.json`)
Production-ready settings with comprehensive retry logic and full pricing configuration.

**Features:**
- Uses Claude Sonnet (balanced performance)
- Maximum token limits
- Aggressive retry strategy
- Large conversation history
- Complete pricing for all models

**Use case:** Production deployments, CI/CD, critical applications

```bash
cp examples/production-config.json ~/.ai-client/config.json
```

### 4. Multi-Model Configuration (`multi-model-config.json`)
Demonstrates how to configure multiple Claude models with descriptions.

**Features:**
- Pricing for all three Claude model tiers
- Model descriptions for reference
- Flexible model switching

**Use case:** Projects using different models for different tasks

```bash
cp examples/multi-model-config.json ~/.ai-client/config.json
```

### 5. Custom Pricing Configuration (`custom-pricing-config.json`)
Shows how to add custom models and pricing (e.g., for enterprise plans).

**Features:**
- Custom model definitions
- Override default pricing
- Support for non-standard models

**Use case:** Enterprise plans, custom deployments, price overrides

```bash
cp examples/custom-pricing-config.json ~/.ai-client/config.json
```

## Configuration Reference

### apiKey
Your Anthropic API key. Use `env:VARIABLE_NAME` to reference environment variables.

```json
"apiKey": "env:ANTHROPIC_API_KEY"
```

### defaultModel
The Claude model to use when not specified in the command.

Options:
- `claude-sonnet-4-5-20250929` - Balanced (recommended)
- `claude-haiku-4-5-20251001` - Fast and economical
- `claude-opus-4-5-20251101` - Most capable

### retry Configuration
Controls automatic retry behavior for transient failures.

```json
"retry": {
  "maxRetries": 3,      // Number of retry attempts
  "baseDelayMs": 1000,  // Initial delay between retries
  "maxDelayMs": 8000    // Maximum delay (for exponential backoff)
}
```

### history Configuration
Manages conversation history and context windows.

```json
"history": {
  "enabled": true,     // Enable conversation history
  "maxMessages": 20    // Maximum messages in context (sliding window)
}
```

### pricing
Token pricing per model in USD per 1,000 tokens.

```json
"pricing": {
  "model-name": {
    "inputPer1k": 0.003,   // Input cost per 1K tokens
    "outputPer1k": 0.015   // Output cost per 1K tokens
  }
}
```

## Using a Configuration

1. **Copy the example:**
   ```bash
   cp examples/minimal-config.json ~/.ai-client/config.json
   ```

2. **Edit as needed:**
   ```bash
   nano ~/.ai-client/config.json
   ```

3. **Verify configuration:**
   ```bash
   ai-client ask "test" --debug
   ```

## Environment Variables

All examples use environment variables for API keys. Set your key before using:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

Or add to your shell profile (`~/.zshrc`, `~/.bashrc`):

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-..."' >> ~/.zshrc
source ~/.zshrc
```

## Custom Configurations

Feel free to mix and match settings from these examples to create your own custom configuration. All settings are optional except `apiKey`.

## Pricing Updates

Anthropic's pricing may change. Always verify current rates at:
https://www.anthropic.com/pricing

Update your config accordingly.
