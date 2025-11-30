import { describe, it, expect } from 'vitest';
import {
  AIClientError,
  AuthError,
  RateLimitError,
  ServerError,
  ValidationError,
  NetworkError,
  classifyError,
  isRetryable
} from '@/lib/errors.js';

describe('Error Classes', () => {
  describe('AIClientError', () => {
    it('should create error with message and status code', () => {
      const error = new AIClientError('Test error', 500);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIClientError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AIClientError');
      expect(error.stack).toBeDefined();
    });

    it('should create error without status code', () => {
      const error = new AIClientError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('AuthError', () => {
    it('should create auth error with default message', () => {
      const error = new AuthError();
      
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.message).toContain('Authentication failed');
      expect(error.message).toContain('ANTHROPIC_API_KEY');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });

    it('should create auth error with custom message', () => {
      const error = new AuthError('Custom auth error');
      
      expect(error.message).toBe('Custom auth error');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with default message', () => {
      const error = new RateLimitError();
      
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toContain('Rate limited');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create rate limit error with custom message', () => {
      const error = new RateLimitError('Custom rate limit message');
      
      expect(error.message).toBe('Custom rate limit message');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('ServerError', () => {
    it('should create server error with default message and status', () => {
      const error = new ServerError();
      
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(ServerError);
      expect(error.message).toContain('Anthropic service error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ServerError');
    });

    it('should create server error with custom message', () => {
      const error = new ServerError('Custom server error');
      
      expect(error.message).toBe('Custom server error');
      expect(error.statusCode).toBe(500);
    });

    it('should create server error with custom status code', () => {
      const error = new ServerError('Service unavailable', 503);
      
      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NetworkError', () => {
    it('should create network error with default message', () => {
      const error = new NetworkError();
      
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain('Network error');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('NetworkError');
    });

    it('should create network error with custom message', () => {
      const error = new NetworkError('Connection refused');
      
      expect(error.message).toBe('Connection refused');
    });
  });
});

describe('classifyError', () => {
  describe('already classified errors', () => {
    it('should return AuthError as-is', () => {
      const originalError = new AuthError('Already auth error');
      const classified = classifyError(originalError);
      
      expect(classified).toBe(originalError);
      expect(classified).toBeInstanceOf(AuthError);
    });

    it('should return RateLimitError as-is', () => {
      const originalError = new RateLimitError('Already rate limit error');
      const classified = classifyError(originalError);
      
      expect(classified).toBe(originalError);
      expect(classified).toBeInstanceOf(RateLimitError);
    });

    it('should return any AIClientError subclass as-is', () => {
      const originalError = new NetworkError('Already network error');
      const classified = classifyError(originalError);
      
      expect(classified).toBe(originalError);
      expect(classified).toBeInstanceOf(NetworkError);
    });
  });

  describe('HTTP status code classification', () => {
    it('should classify 401 as AuthError', () => {
      const error: any = { status: 401, message: 'Unauthorized' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(AuthError);
      expect(classified.statusCode).toBe(401);
    });

    it('should classify 403 as AuthError', () => {
      const error: any = { status: 403, message: 'Forbidden' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(AuthError);
      expect(classified.statusCode).toBe(401);
    });

    it('should classify 429 as RateLimitError', () => {
      const error: any = { status: 429, message: 'Too many requests' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(RateLimitError);
      expect(classified.statusCode).toBe(429);
    });

    it('should classify 500 as ServerError', () => {
      const error: any = { status: 500, message: 'Internal server error' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ServerError);
      expect(classified.statusCode).toBe(500);
      expect(classified.message).toBe('Internal server error');
    });

    it('should classify 502 as ServerError', () => {
      const error: any = { status: 502, message: 'Bad gateway' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ServerError);
      expect(classified.statusCode).toBe(502);
    });

    it('should classify 503 as ServerError', () => {
      const error: any = { status: 503, message: 'Service unavailable' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ServerError);
      expect(classified.statusCode).toBe(503);
    });

    it('should classify 400 as ValidationError', () => {
      const error: any = { status: 400, message: 'Bad request' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ValidationError);
      expect(classified.statusCode).toBe(400);
      expect(classified.message).toBe('Bad request');
    });

    it('should classify 404 as ValidationError', () => {
      const error: any = { status: 404, message: 'Not found' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ValidationError);
      expect(classified.statusCode).toBe(400);
    });

    it('should classify 422 as ValidationError', () => {
      const error: any = { status: 422, message: 'Unprocessable entity' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ValidationError);
      expect(classified.statusCode).toBe(400);
    });
  });

  describe('statusCode property support', () => {
    it('should handle statusCode property instead of status', () => {
      const error: any = { statusCode: 429, message: 'Rate limited' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(RateLimitError);
      expect(classified.statusCode).toBe(429);
    });

    it('should prefer status over statusCode', () => {
      const error: any = { status: 429, statusCode: 500, message: 'Test' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(RateLimitError);
    });
  });

  describe('network error code classification', () => {
    it('should classify ECONNREFUSED as NetworkError', () => {
      const error: any = { code: 'ECONNREFUSED', message: 'Connection refused' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.message).toBe('Connection refused');
    });

    it('should classify ETIMEDOUT as NetworkError', () => {
      const error: any = { code: 'ETIMEDOUT', message: 'Timeout' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.message).toBe('Timeout');
    });
  });

  describe('unknown errors', () => {
    it('should classify unknown error as AIClientError', () => {
      const error: any = { message: 'Something went wrong' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(AIClientError);
      expect(classified.message).toBe('Something went wrong');
    });

    it('should handle error without message', () => {
      const error: any = { foo: 'bar' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(AIClientError);
      expect(classified.message).toBe('Unknown error');
    });

    it('should handle null error', () => {
      const classified = classifyError(null);
      
      expect(classified).toBeInstanceOf(AIClientError);
      expect(classified.message).toBe('Unknown error');
    });

    it('should handle undefined error', () => {
      const classified = classifyError(undefined);
      
      expect(classified).toBeInstanceOf(AIClientError);
      expect(classified.message).toBe('Unknown error');
    });
  });
});

describe('isRetryable', () => {
  describe('retryable errors', () => {
    it('should mark RateLimitError as retryable', () => {
      const error = new RateLimitError();
      expect(isRetryable(error)).toBe(true);
    });

    it('should mark ServerError as retryable', () => {
      const error = new ServerError();
      expect(isRetryable(error)).toBe(true);
    });

    it('should mark ServerError with 502 as retryable', () => {
      const error = new ServerError('Bad gateway', 502);
      expect(isRetryable(error)).toBe(true);
    });

    it('should mark ServerError with 503 as retryable', () => {
      const error = new ServerError('Service unavailable', 503);
      expect(isRetryable(error)).toBe(true);
    });

    it('should mark NetworkError as retryable', () => {
      const error = new NetworkError();
      expect(isRetryable(error)).toBe(true);
    });
  });

  describe('non-retryable errors', () => {
    it('should mark AuthError as not retryable', () => {
      const error = new AuthError();
      expect(isRetryable(error)).toBe(false);
    });

    it('should mark ValidationError as not retryable', () => {
      const error = new ValidationError('Bad input');
      expect(isRetryable(error)).toBe(false);
    });

    it('should mark generic AIClientError as not retryable', () => {
      const error = new AIClientError('Generic error');
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle error instance checks correctly', () => {
      // Create instances of each retryable error type
      const errors = [
        new RateLimitError(),
        new ServerError(),
        new NetworkError()
      ];

      errors.forEach(error => {
        expect(isRetryable(error)).toBe(true);
      });
    });

    it('should handle inheritance correctly', () => {
      // All retryable errors are also AIClientErrors
      const error = new RateLimitError();
      expect(error).toBeInstanceOf(AIClientError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(isRetryable(error)).toBe(true);
    });
  });
});
