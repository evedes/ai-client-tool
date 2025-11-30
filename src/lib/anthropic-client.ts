/**
 * Anthropic API Client Wrapper
 * Provides simplified interface for sending messages and tracking usage
 */

import Anthropic from '@anthropic-ai/sdk';
import { Config, Message, UsageStats } from '../types/index.js';
import { classifyError } from './errors.js';

/**
 * Client for interacting with Anthropic's Claude API
 * Handles message sending, response parsing, and cost calculation
 */
export class AnthropicClient {
  private client: Anthropic;
  private config: Config;

  /**
   * Initialize Anthropic client with configuration
   * @param config - Application configuration including API key and model settings
   */
  constructor(config: Config) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Send messages to Anthropic API and receive response
   * @param messages - Array of conversation messages (user/assistant)
   * @returns Object containing response content and usage statistics
   * @throws AIClientError - Classified error based on failure type
   */
  async sendMessage(
    messages: Message[]
  ): Promise<{ content: string; usage: UsageStats }> {
    try {
      // Convert our Message format to Anthropic SDK format
      const apiMessages = messages.map((m) => ({
        role: m.role as 'user' | 'assistant', // Filter out 'system' role
        content: m.content,
      }));

      // Call Anthropic API
      const response = await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: apiMessages,
      });

      // Extract text content from response
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n');

      // Calculate usage statistics and costs
      const usage = this.calculateUsage(
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      return { content, usage };
    } catch (error: any) {
      // Classify error for consistent handling upstream
      throw classifyError(error);
    }
  }

  /**
   * Calculate token usage and associated costs
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens generated
   * @returns Usage statistics including token counts and costs
   * @throws Error if pricing not configured for current model
   */
  private calculateUsage(
    inputTokens: number,
    outputTokens: number
  ): UsageStats {
    const pricing = this.config.pricing[this.config.defaultModel];

    if (!pricing) {
      throw new Error(
        `Pricing not configured for model: ${this.config.defaultModel}`
      );
    }

    // Calculate costs based on per-1k token pricing
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
