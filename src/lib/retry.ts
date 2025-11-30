/**
 * Retry utility with exponential backoff
 * Handles transient failures gracefully with configurable retry strategy
 */

import { isRetryable } from './errors.js';
import { RetryConfig } from '../types/index.js';

/**
 * Execute an operation with automatic retry on transient failures
 * @param operation - Async function to execute (and potentially retry)
 * @param config - Retry configuration (maxRetries, baseDelayMs, maxDelayMs)
 * @param onRetry - Optional callback invoked before each retry attempt
 * @returns Promise resolving to operation result
 * @throws Last error if all retries exhausted or non-retryable error encountered
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if error is not retryable or we've exhausted retries
      if (!isRetryable(error) || attempt === config.maxRetries) {
        throw error;
      }

      // Calculate exponential backoff: baseDelayMs * 2^attempt
      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
      
      // Cap at maxDelayMs
      const delay = Math.min(exponentialDelay, config.maxDelayMs);

      // Add random jitter (0-250ms) to prevent thundering herd
      const jitter = Math.random() * 250;
      const totalDelay = delay + jitter;

      // Notify about retry attempt
      onRetry?.(attempt + 1, totalDelay);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError!;
}
