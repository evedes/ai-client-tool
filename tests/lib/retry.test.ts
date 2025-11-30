import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '@/lib/retry.js';
import { RateLimitError, ServerError, AuthError, NetworkError } from '@/lib/errors.js';
import type { RetryConfig } from '@/types/index.js';
import type { Mock } from 'vitest';

describe('withRetry', () => {
  let mockOperation: Mock;
  let mockOnRetry: Mock;
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 10000
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockOperation = vi.fn();
    mockOnRetry = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('successful operations', () => {
    it('should succeed on first attempt', async () => {
      const expectedResult = { data: 'success' };
      mockOperation.mockResolvedValueOnce(expectedResult);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should succeed on second attempt after retryable error', async () => {
      const expectedResult = { data: 'success' };
      mockOperation
        .mockRejectedValueOnce(new RateLimitError())
        .mockResolvedValueOnce(expectedResult);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should succeed on third attempt after multiple retryable errors', async () => {
      const expectedResult = { data: 'success' };
      mockOperation
        .mockRejectedValueOnce(new ServerError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValueOnce(expectedResult);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(expectedResult);
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockOnRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry behavior', () => {
    it('should retry on RateLimitError', async () => {
      mockOperation.mockRejectedValue(new RateLimitError());

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });

    it('should retry on ServerError', async () => {
      mockOperation.mockRejectedValue(new ServerError());

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(ServerError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should retry on NetworkError', async () => {
      mockOperation.mockRejectedValue(new NetworkError());

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(NetworkError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not retry on AuthError', async () => {
      mockOperation.mockRejectedValue(new AuthError());

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(AuthError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('should respect maxRetries limit', async () => {
      const config: RetryConfig = {
        maxRetries: 2,
        baseDelayMs: 100,
        maxDelayMs: 10000
      };
      mockOperation.mockRejectedValue(new RateLimitError());

      const promise = withRetry(mockOperation, config, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(mockOnRetry).toHaveBeenCalledTimes(2);
    });

    it('should not retry when maxRetries is 0', async () => {
      const config: RetryConfig = {
        maxRetries: 0,
        baseDelayMs: 100,
        maxDelayMs: 10000
      };
      mockOperation.mockRejectedValue(new RateLimitError());

      const promise = withRetry(mockOperation, config, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;
      
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
      expect(mockOnRetry).not.toHaveBeenCalled();
    });
  });

  describe('exponential backoff', () => {
    it('should apply exponential backoff correctly', async () => {
      mockOperation.mockRejectedValue(new RateLimitError());

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;

      // Check that onRetry was called with increasing delays
      expect(mockOnRetry).toHaveBeenCalledTimes(3);
      
      // First retry: baseDelayMs * 2^0 = 100ms (+ jitter)
      const [attempt1, delay1] = mockOnRetry.mock.calls[0];
      expect(attempt1).toBe(1);
      expect(delay1).toBeGreaterThanOrEqual(100);
      expect(delay1).toBeLessThan(350); // 100 + max jitter (250)

      // Second retry: baseDelayMs * 2^1 = 200ms (+ jitter)
      const [attempt2, delay2] = mockOnRetry.mock.calls[1];
      expect(attempt2).toBe(2);
      expect(delay2).toBeGreaterThanOrEqual(200);
      expect(delay2).toBeLessThan(450); // 200 + max jitter (250)

      // Third retry: baseDelayMs * 2^2 = 400ms (+ jitter)
      const [attempt3, delay3] = mockOnRetry.mock.calls[2];
      expect(attempt3).toBe(3);
      expect(delay3).toBeGreaterThanOrEqual(400);
      expect(delay3).toBeLessThan(650); // 400 + max jitter (250)
    });

    it('should cap delay at maxDelayMs', async () => {
      const config: RetryConfig = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 2000
      };
      mockOperation.mockRejectedValue(new RateLimitError());

      const promise = withRetry(mockOperation, config, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;

      // Check later retries are capped
      // Retry 3: 1000 * 2^2 = 4000ms, should be capped to 2000ms
      const [attempt3, delay3] = mockOnRetry.mock.calls[2];
      expect(attempt3).toBe(3);
      expect(delay3).toBeLessThan(2250); // maxDelayMs (2000) + max jitter (250)

      // Retry 4: 1000 * 2^3 = 8000ms, should be capped to 2000ms
      const [attempt4, delay4] = mockOnRetry.mock.calls[3];
      expect(attempt4).toBe(4);
      expect(delay4).toBeLessThan(2250); // maxDelayMs (2000) + max jitter (250)
    });

    it('should add jitter to delays', async () => {
      mockOperation.mockRejectedValue(new RateLimitError());

      // Run multiple times to check jitter randomness
      const delays: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        vi.clearAllMocks();
        mockOnRetry.mockClear();
        
        const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
        promise.catch(() => {}); // Suppress unhandled rejection
        await vi.runAllTimersAsync();

        if (mockOnRetry.mock.calls.length > 0) {
          delays.push(mockOnRetry.mock.calls[0][1]);
        }
      }

      // Check that delays vary (jitter is working)
      const uniqueDelays = new Set(delays);
      // With random jitter, we should see variation
      // (This test might occasionally fail due to randomness, but very unlikely)
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry with correct attempt number and delay', async () => {
      mockOperation
        .mockRejectedValueOnce(new RateLimitError())
        .mockRejectedValueOnce(new RateLimitError())
        .mockResolvedValueOnce({ data: 'success' });

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockOnRetry).toHaveBeenCalledTimes(2);
      
      // First retry
      expect(mockOnRetry.mock.calls[0][0]).toBe(1);
      expect(mockOnRetry.mock.calls[0][1]).toBeGreaterThan(0);
      
      // Second retry
      expect(mockOnRetry.mock.calls[1][0]).toBe(2);
      expect(mockOnRetry.mock.calls[1][1]).toBeGreaterThan(0);
    });

    it('should work without onRetry callback', async () => {
      mockOperation
        .mockRejectedValueOnce(new RateLimitError())
        .mockResolvedValueOnce({ data: 'success' });

      const promise = withRetry(mockOperation, defaultConfig);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ data: 'success' });
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle operation returning undefined', async () => {
      mockOperation.mockResolvedValueOnce(undefined);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeUndefined();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle operation returning null', async () => {
      mockOperation.mockResolvedValueOnce(null);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should preserve error details through retries', async () => {
      const customError = new RateLimitError('Custom rate limit message');
      mockOperation.mockRejectedValue(customError);

      const promise = withRetry(mockOperation, defaultConfig, mockOnRetry);
      const expectation = expect(promise).rejects.toThrow(RateLimitError);
      await vi.runAllTimersAsync();
      await expectation;
      
      // Verify error message is preserved
      try {
        await promise;
      } catch (error: any) {
        expect(error.message).toContain('Custom rate limit message');
      }
    });
  });
});
