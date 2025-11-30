/**
 * Core Type Definitions for AI Client Tool
 * 
 * This module provides comprehensive type definitions for configuration,
 * conversations, usage tracking, and API interactions with Claude.
 */

/**
 * Message role in a conversation.
 * - `user`: Messages from the human user
 * - `assistant`: Responses from Claude
 * - `system`: System-level instructions (filtered before API calls)
 */
export type Role = 'user' | 'assistant' | 'system';

/**
 * A single message in a conversation with timestamp.
 */
export interface Message {
  /** Role of the message sender */
  role: Role;
  /** Text content of the message */
  content: string;
  /** Unix timestamp in milliseconds when message was created */
  timestamp: number;
}

/**
 * Complete conversation with metadata and message history.
 * Used for session persistence and resumption.
 */
export interface Conversation {
  /** Unique UUID for this conversation */
  id: string;
  /** Array of all messages in chronological order */
  messages: Message[];
  /** Unix timestamp when conversation was created */
  createdAt: number;
  /** Unix timestamp of last modification */
  updatedAt: number;
}

/**
 * Token usage and cost statistics for a single API request.
 */
export interface UsageStats {
  /** Number of input tokens consumed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Cost of input tokens in USD */
  inputCost: number;
  /** Cost of output tokens in USD */
  outputCost: number;
  /** Total cost for this request in USD */
  totalCost: number;
}

/**
 * Cumulative statistics across multiple requests or entire session.
 * Persisted globally across all CLI invocations.
 */
export interface SessionStats {
  /** Total input tokens across all requests */
  totalInputTokens: number;
  /** Total output tokens across all requests */
  totalOutputTokens: number;
  /** Total cost in USD across all requests */
  totalCost: number;
  /** Number of API requests made */
  requestCount: number;
}

/**
 * Pricing configuration for a specific model.
 * Costs are per 1,000 tokens.
 */
export interface ModelPricing {
  /** USD per 1K input tokens */
  inputPer1k: number;
  /** USD per 1K output tokens */
  outputPer1k: number;
}

/**
 * Configuration for retry behavior on transient failures.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (caps exponential backoff) */
  maxDelayMs: number;
}

/**
 * Configuration for conversation history management.
 */
export interface HistoryConfig {
  /** Whether to include conversation history in context */
  enabled: boolean;
  /** Maximum number of messages to include in sliding window */
  maxMessages: number;
}

/**
 * Complete application configuration.
 * Can be loaded from ~/.ai-client/config.json or provided programmatically.
 * 
 * @example
 * ```json
 * {
 *   "apiKey": "env:ANTHROPIC_API_KEY",
 *   "defaultModel": "claude-sonnet-4-5-20250929",
 *   "maxTokens": 8192,
 *   "temperature": 0.7,
 *   "pricing": {
 *     "claude-sonnet-4-5-20250929": {
 *       "inputPer1k": 0.003,
 *       "outputPer1k": 0.015
 *     }
 *   },
 *   "retry": {
 *     "maxRetries": 3,
 *     "baseDelayMs": 1000,
 *     "maxDelayMs": 8000
 *   },
 *   "history": {
 *     "enabled": true,
 *     "maxMessages": 20
 *   }
 * }
 * ```
 */
export interface Config {
  /** Anthropic API key or env variable reference (e.g., "env:ANTHROPIC_API_KEY") */
  apiKey: string;
  /** Model ID to use (e.g., "claude-sonnet-4-5-20250929") */
  defaultModel: string;
  /** Maximum tokens to generate in response */
  maxTokens: number;
  /** Sampling temperature (0.0 = deterministic, 1.0 = creative) */
  temperature: number;
  /** Pricing configuration for all models */
  pricing: Record<string, ModelPricing>;
  /** Retry strategy configuration */
  retry: RetryConfig;
  /** Conversation history management */
  history: HistoryConfig;
}
