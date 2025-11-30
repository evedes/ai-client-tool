/**
 * Custom error types for AI Client Tool
 * Provides classification and retry logic for Anthropic API errors
 */

/**
 * Base error class for all AI client errors
 */
export class AIClientError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AIClientError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error (401/403)
 * Indicates invalid or missing API key
 */
export class AuthError extends AIClientError {
  constructor(message = 'Authentication failed. Check your ANTHROPIC_API_KEY in config.') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

/**
 * Rate limit error (429)
 * Indicates API quota exceeded
 */
export class RateLimitError extends AIClientError {
  constructor(message = 'Rate limited by Anthropic API. Retrying with backoff...') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Server error (5xx)
 * Indicates Anthropic service issues
 */
export class ServerError extends AIClientError {
  constructor(message = 'Anthropic service error. Retrying...', statusCode = 500) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

/**
 * Validation error (400-499, excluding 401/403/429)
 * Indicates invalid request format or parameters
 */
export class ValidationError extends AIClientError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Network error (ECONNREFUSED, ETIMEDOUT, etc.)
 * Indicates connectivity issues
 */
export class NetworkError extends AIClientError {
  constructor(message = 'Network error occurred. Check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Classifies an error into a specific error type based on status code or error code
 * @param error - The error to classify (from Anthropic SDK or network layer)
 * @returns Classified AIClientError subclass
 */
export function classifyError(error: any): AIClientError {
  // Already classified? Return as-is
  if (error instanceof AIClientError) {
    return error;
  }
  
  // Extract status code (handle both 'status' and 'statusCode' properties)
  const statusCode = error.status || error.statusCode;
  
  // HTTP status code classification
  if (statusCode === 401 || statusCode === 403) {
    return new AuthError();
  }
  
  if (statusCode === 429) {
    return new RateLimitError();
  }
  
  if (statusCode >= 500 && statusCode < 600) {
    return new ServerError(error.message, statusCode);
  }
  
  if (statusCode >= 400 && statusCode < 500) {
    return new ValidationError(error.message || 'Bad request');
  }
  
  // Network error codes (Node.js-specific)
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new NetworkError(error.message);
  }
  
  // Unknown error fallback
  return new AIClientError(error.message || 'Unknown error');
}

/**
 * Determines if an error should trigger retry logic
 * @param error - The classified error
 * @returns true if error is retryable (rate limit, server, or network errors)
 */
export function isRetryable(error: AIClientError): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof ServerError ||
    error instanceof NetworkError
  );
}
