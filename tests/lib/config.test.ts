import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, ensureConfigDirectory, getDefaultConfigPath } from '@/lib/config.js';

// Mock fs module
vi.mock('fs');

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home')
}));

describe('Config', () => {
  const mockHomedir = '/mock/home';
  const defaultConfigPath = path.join(mockHomedir, '.ai-client', 'config.json');
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MY_API_KEY;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    describe('with no config file', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
      });

      it('should throw error when no API key is provided', () => {
        expect(() => loadConfig()).toThrow('API key not found');
        expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY');
      });

      it('should use ANTHROPIC_API_KEY from environment', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-test-key-12345';
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-test-key-12345');
        expect(config.defaultModel).toBe('claude-sonnet-4-5-20250929');
        expect(config.maxTokens).toBe(8192);
        expect(config.temperature).toBe(0.7);
      });

      it('should apply all defaults when no config file exists', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-test-key';
        
        const config = loadConfig();
        
        expect(config.defaultModel).toBe('claude-sonnet-4-5-20250929');
        expect(config.maxTokens).toBe(8192);
        expect(config.temperature).toBe(0.7);
        expect(config.retry).toEqual({
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 8000
        });
        expect(config.history).toEqual({
          enabled: true,
          maxMessages: 20
        });
        expect(config.pricing).toHaveProperty('claude-sonnet-4-5-20250929');
        expect(config.pricing).toHaveProperty('claude-haiku-4-5-20251001');
        expect(config.pricing).toHaveProperty('claude-opus-4-5-20251101');
      });
    });

    describe('with config file', () => {
      it('should load config from file', () => {
        const mockConfig = {
          apiKey: 'sk-file-key-12345',
          defaultModel: 'claude-opus-4-5-20251101',
          maxTokens: 4096
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-file-key-12345');
        expect(config.defaultModel).toBe('claude-opus-4-5-20251101');
        expect(config.maxTokens).toBe(4096);
        // Should still have default temperature
        expect(config.temperature).toBe(0.7);
      });

      it('should use custom config path when provided', () => {
        const customPath = '/custom/config.json';
        const mockConfig = {
          apiKey: 'sk-custom-key',
          defaultModel: 'claude-haiku-4-5-20251001'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig(customPath);
        
        expect(fs.existsSync).toHaveBeenCalledWith(customPath);
        expect(fs.readFileSync).toHaveBeenCalledWith(customPath, 'utf-8');
        expect(config.apiKey).toBe('sk-custom-key');
      });

      it('should throw error on invalid JSON', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json');
        
        expect(() => loadConfig()).toThrow('Failed to parse config file');
      });

      it('should merge config with defaults', () => {
        const mockConfig = {
          apiKey: 'sk-test-key',
          maxTokens: 16384
          // temperature not specified, should use default
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-test-key');
        expect(config.maxTokens).toBe(16384);
        expect(config.temperature).toBe(0.7); // Default
      });

      it('should deep merge nested objects (pricing, retry, history)', () => {
        const mockConfig = {
          apiKey: 'sk-test-key',
          retry: {
            maxRetries: 5 // Override just maxRetries
          },
          history: {
            maxMessages: 50 // Override just maxMessages
          }
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.retry).toEqual({
          maxRetries: 5,
          baseDelayMs: 1000, // Default
          maxDelayMs: 8000 // Default
        });
        expect(config.history).toEqual({
          enabled: true, // Default
          maxMessages: 50
        });
      });
    });

    describe('environment variable resolution', () => {
      it('should resolve env:VAR_NAME syntax', () => {
        process.env.MY_API_KEY = 'sk-from-env-12345';
        
        const mockConfig = {
          apiKey: 'env:MY_API_KEY'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-from-env-12345');
      });

      it('should throw error if env variable is not set', () => {
        const mockConfig = {
          apiKey: 'env:MISSING_VAR'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        expect(() => loadConfig()).toThrow('Environment variable MISSING_VAR is not set');
      });

      it('should not resolve non-env: prefixed values', () => {
        const mockConfig = {
          apiKey: 'sk-literal-key-not-env'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-literal-key-not-env');
      });

      it('should fallback to ANTHROPIC_API_KEY if config has no apiKey', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-fallback-key';
        
        const mockConfig = {
          maxTokens: 4096
          // No apiKey in config
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-fallback-key');
      });

      it('should prefer env:VAR_NAME over ANTHROPIC_API_KEY', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-anthropic-key';
        process.env.CUSTOM_KEY = 'sk-custom-key';
        
        const mockConfig = {
          apiKey: 'env:CUSTOM_KEY'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        expect(config.apiKey).toBe('sk-custom-key');
      });

      it('should handle empty string env variables', () => {
        process.env.EMPTY_KEY = '';
        
        const mockConfig = {
          apiKey: 'env:EMPTY_KEY'
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        expect(() => loadConfig()).toThrow('Environment variable EMPTY_KEY is not set');
      });
    });

    describe('pricing configuration', () => {
      it('should have correct default pricing for all models', () => {
        process.env.ANTHROPIC_API_KEY = 'sk-test-key';
        vi.mocked(fs.existsSync).mockReturnValue(false);
        
        const config = loadConfig();
        
        expect(config.pricing['claude-sonnet-4-5-20250929']).toEqual({
          inputPer1k: 0.003,
          outputPer1k: 0.015
        });
        expect(config.pricing['claude-haiku-4-5-20251001']).toEqual({
          inputPer1k: 0.001,
          outputPer1k: 0.005
        });
        expect(config.pricing['claude-opus-4-5-20251101']).toEqual({
          inputPer1k: 0.005,
          outputPer1k: 0.025
        });
      });

      it('should allow custom pricing in config file', () => {
        const mockConfig = {
          apiKey: 'sk-test-key',
          pricing: {
            'custom-model': {
              inputPer1k: 0.01,
              outputPer1k: 0.02
            }
          }
        };
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        
        const config = loadConfig();
        
        // Should have both custom and default pricing
        expect(config.pricing['custom-model']).toEqual({
          inputPer1k: 0.01,
          outputPer1k: 0.02
        });
        expect(config.pricing['claude-sonnet-4-5-20250929']).toBeDefined();
      });
    });

    describe('validation', () => {
      it('should throw helpful error with config path', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        
        try {
          loadConfig();
          expect.fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('API key not found');
          expect(error.message).toContain(defaultConfigPath);
          expect(error.message).toContain('ANTHROPIC_API_KEY');
        }
      });

      it('should include custom path in error message', () => {
        const customPath = '/custom/path/config.json';
        vi.mocked(fs.existsSync).mockReturnValue(false);
        
        try {
          loadConfig(customPath);
          expect.fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('API key not found');
          expect(error.message).toContain(customPath);
        }
      });
    });
  });

  describe('ensureConfigDirectory', () => {
    it('should create config directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      
      ensureConfigDirectory();
      
      const expectedDir = path.dirname(defaultConfigPath);
      expect(fs.existsSync).toHaveBeenCalledWith(expectedDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      
      ensureConfigDirectory();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getDefaultConfigPath', () => {
    it('should return correct default config path', () => {
      const configPath = getDefaultConfigPath();
      
      expect(configPath).toBe(defaultConfigPath);
      expect(configPath).toContain('.ai-client');
      expect(configPath).toContain('config.json');
    });
  });
});
