// Core type definitions for AI Client Tool

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

export interface Config {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  pricing: Record<string, ModelPricing>;
  retry: RetryConfig;
  history: HistoryConfig;
}
