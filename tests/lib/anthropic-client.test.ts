import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicClient } from '@/lib/anthropic-client.js';
import Anthropic from '@anthropic-ai/sdk';
import type { Config, Message } from '@/types/index.js';
import { RateLimitError, ServerError, AuthError, AIClientError } from '@/lib/errors.js';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn();
  return {
    default: MockAnthropic
  };
});

// Mock retry module to avoid delays in tests
vi.mock('@/lib/retry.js', () => ({
  withRetry: vi.fn(async (operation) => {
    // Just execute the operation directly without retry logic in tests
    return await operation();
  })
}));

describe('AnthropicClient', () => {
  let client: AnthropicClient;
  let mockCreate: ReturnType<typeof vi.fn>;
  const mockConfig: Config = {
    apiKey: 'sk-test-key-12345',
    defaultModel: 'claude-sonnet-4-5-20250929',
    maxTokens: 8192,
    temperature: 0.7,
    pricing: {
      'claude-sonnet-4-5-20250929': {
        inputPer1k: 0.003,
        outputPer1k: 0.015
      },
      'claude-haiku-4-5-20251001': {
        inputPer1k: 0.001,
        outputPer1k: 0.005
      }
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000
    },
    history: {
      enabled: true,
      maxMessages: 20
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock for Anthropic client
    mockCreate = vi.fn();
    const MockedAnthropic = Anthropic as unknown as ReturnType<typeof vi.fn>;
    MockedAnthropic.mockImplementation(function(this: any) {
      return {
        messages: {
          create: mockCreate
        }
      };
    });
    
    client = new AnthropicClient(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeInstanceOf(AnthropicClient);
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'sk-test-key-12345'
      });
    });

    it('should use API key from config', () => {
      const customConfig = { ...mockConfig, apiKey: 'sk-custom-key' };
      new AnthropicClient(customConfig);
      
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'sk-custom-key'
      });
    });
  });

  describe('sendMessage', () => {
    const mockMessages: Message[] = [
      { role: 'user', content: 'Hello, Claude!', timestamp: Date.now() }
    ];

    describe('successful requests', () => {
      it('should send message and return response with usage', async () => {
        const mockResponse = {
          content: [{ type: 'text', text: 'Hello! How can I help you?' }],
          usage: { input_tokens: 100, output_tokens: 200 }
        };
        mockCreate.mockResolvedValue(mockResponse);

        const result = await client.sendMessage(mockMessages);

        expect(result.content).toBe('Hello! How can I help you?');
        expect(result.usage.inputTokens).toBe(100);
        expect(result.usage.outputTokens).toBe(200);
        expect(result.usage.inputCost).toBeCloseTo(0.0003, 6);   // 100/1000 * 0.003
        expect(result.usage.outputCost).toBeCloseTo(0.003, 6);   // 200/1000 * 0.015
        expect(result.usage.totalCost).toBeCloseTo(0.0033, 6);
      });

      it('should call API with correct parameters', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 50, output_tokens: 50 }
        });

        await client.sendMessage(mockMessages);

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8192,
          temperature: 0.7,
          messages: [{ role: 'user', content: 'Hello, Claude!' }]
        });
      });

      it('should handle multiple messages', async () => {
        const multiMessages: Message[] = [
          { role: 'user', content: 'First message', timestamp: Date.now() },
          { role: 'assistant', content: 'First response', timestamp: Date.now() },
          { role: 'user', content: 'Second message', timestamp: Date.now() }
        ];
        
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Second response' }],
          usage: { input_tokens: 150, output_tokens: 100 }
        });

        await client.sendMessage(multiMessages);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [
              { role: 'user', content: 'First message' },
              { role: 'assistant', content: 'First response' },
              { role: 'user', content: 'Second message' }
            ]
          })
        );
      });

      it('should filter out system messages', async () => {
        const messagesWithSystem: Message[] = [
          { role: 'system', content: 'You are a helpful assistant', timestamp: Date.now() },
          { role: 'user', content: 'Hello', timestamp: Date.now() }
        ];
        
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Hi' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        });

        await client.sendMessage(messagesWithSystem);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: 'user', content: 'Hello' }]
          })
        );
      });

      it('should handle empty text content', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: '' }],
          usage: { input_tokens: 10, output_tokens: 0 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.content).toBe('');
      });

      it('should handle non-text content blocks', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'image', source: {} }],
          usage: { input_tokens: 10, output_tokens: 10 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.content).toBe('');
      });

      it('should handle empty content array', async () => {
        mockCreate.mockResolvedValue({
          content: [],
          usage: { input_tokens: 10, output_tokens: 0 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.content).toBe('');
      });
    });

    describe('usage calculation', () => {
      it('should calculate costs correctly for sonnet model', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 1000, output_tokens: 2000 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.usage).toEqual({
          inputTokens: 1000,
          outputTokens: 2000,
          inputCost: 0.003,   // 1000/1000 * 0.003
          outputCost: 0.030,  // 2000/1000 * 0.015
          totalCost: 0.033
        });
      });

      it('should calculate costs for haiku model', async () => {
        const haikuConfig = {
          ...mockConfig,
          defaultModel: 'claude-haiku-4-5-20251001'
        };
        const haikuClient = new AnthropicClient(haikuConfig);

        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 1000, output_tokens: 1000 }
        });

        const result = await haikuClient.sendMessage(mockMessages);

        expect(result.usage).toEqual({
          inputTokens: 1000,
          outputTokens: 1000,
          inputCost: 0.001,   // 1000/1000 * 0.001
          outputCost: 0.005,  // 1000/1000 * 0.005
          totalCost: 0.006
        });
      });

      it('should handle zero tokens', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: '' }],
          usage: { input_tokens: 0, output_tokens: 0 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.usage).toEqual({
          inputTokens: 0,
          outputTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0
        });
      });

      it('should handle very small token counts with precision', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Hi' }],
          usage: { input_tokens: 5, output_tokens: 3 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.usage.inputCost).toBeCloseTo(0.000015, 6);  // 5/1000 * 0.003
        expect(result.usage.outputCost).toBeCloseTo(0.000045, 6); // 3/1000 * 0.015
        expect(result.usage.totalCost).toBeCloseTo(0.00006, 6);
      });

      it('should handle large token counts', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Long response' }],
          usage: { input_tokens: 50000, output_tokens: 100000 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result.usage).toEqual({
          inputTokens: 50000,
          outputTokens: 100000,
          inputCost: 0.15,    // 50000/1000 * 0.003
          outputCost: 1.5,    // 100000/1000 * 0.015
          totalCost: 1.65
        });
      });

      it('should throw error for missing pricing', async () => {
        const noPricingConfig = {
          ...mockConfig,
          defaultModel: 'unknown-model',
          pricing: {}
        };
        const noPricingClient = new AnthropicClient(noPricingConfig);

        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 100, output_tokens: 100 }
        });

        await expect(noPricingClient.sendMessage(mockMessages))
          .rejects.toThrow('Pricing not configured for model: unknown-model');
      });
    });

    describe('error handling', () => {
      it('should classify and throw AuthError on 401', async () => {
        const error: any = new Error('Unauthorized');
        error.status = 401;
        mockCreate.mockRejectedValue(error);

        await expect(client.sendMessage(mockMessages))
          .rejects.toThrow(AuthError);
      });

      it('should classify and throw RateLimitError on 429', async () => {
        const error: any = new Error('Too many requests');
        error.status = 429;
        mockCreate.mockRejectedValue(error);

        await expect(client.sendMessage(mockMessages))
          .rejects.toThrow(RateLimitError);
      });

      it('should classify and throw ServerError on 500', async () => {
        const error: any = new Error('Internal server error');
        error.status = 500;
        mockCreate.mockRejectedValue(error);

        await expect(client.sendMessage(mockMessages))
          .rejects.toThrow(ServerError);
      });

      it('should classify generic errors', async () => {
        const error = new Error('Unknown error');
        mockCreate.mockRejectedValue(error);

        await expect(client.sendMessage(mockMessages))
          .rejects.toThrow(AIClientError);
      });

      it('should preserve error messages', async () => {
        const error: any = new Error('Custom error message');
        error.status = 500;
        mockCreate.mockRejectedValue(error);

        try {
          await client.sendMessage(mockMessages);
          expect.fail('Should have thrown error');
        } catch (e: any) {
          expect(e).toBeInstanceOf(ServerError);
          expect(e.message).toContain('Custom error message');
        }
      });
    });

    describe('onRetry callback', () => {
      it('should accept onRetry callback', async () => {
        const onRetry = vi.fn();
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        });

        await client.sendMessage(mockMessages, onRetry);

        expect(mockCreate).toHaveBeenCalled();
        // Note: onRetry won't be called since we mocked withRetry to not actually retry
      });

      it('should work without onRetry callback', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        });

        const result = await client.sendMessage(mockMessages);

        expect(result).toBeDefined();
        expect(result.content).toBe('Response');
      });
    });

    describe('edge cases', () => {
      it('should handle empty messages array', async () => {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 5, output_tokens: 10 }
        });

        await client.sendMessage([]);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: []
          })
        );
      });

      it('should handle messages with only system role', async () => {
        const systemOnlyMessages: Message[] = [
          { role: 'system', content: 'System prompt', timestamp: Date.now() }
        ];
        
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        });

        await client.sendMessage(systemOnlyMessages);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: []
          })
        );
      });

      it('should handle very long content', async () => {
        const longContent = 'a'.repeat(10000);
        const longMessages: Message[] = [
          { role: 'user', content: longContent, timestamp: Date.now() }
        ];
        
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response to long message' }],
          usage: { input_tokens: 5000, output_tokens: 100 }
        });

        const result = await client.sendMessage(longMessages);

        expect(result.content).toBe('Response to long message');
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: 'user', content: longContent }]
          })
        );
      });

      it('should handle special characters in content', async () => {
        const specialMessages: Message[] = [
          { role: 'user', content: '🚀 Hello! <script>alert("test")</script>', timestamp: Date.now() }
        ];
        
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 20, output_tokens: 10 }
        });

        await client.sendMessage(specialMessages);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: 'user', content: '🚀 Hello! <script>alert("test")</script>' }]
          })
        );
      });
    });
  });
});
