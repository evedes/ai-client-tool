import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config } from '../types/index.js';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.ai-client', 'config.json');

const DEFAULT_CONFIG: Partial<Config> = {
  defaultModel: 'claude-sonnet-4-5-20250929',
  maxTokens: 8192,
  temperature: 0.7,
  pricing: {
    'claude-sonnet-4-5-20250929': {
      inputPer1k: 0.003,
      outputPer1k: 0.015,
    },
    'claude-haiku-4-5-20251001': {
      inputPer1k: 0.001,
      outputPer1k: 0.005,
    },
    'claude-opus-4-5-20251101': {
      inputPer1k: 0.005,
      outputPer1k: 0.025,
    },
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  },
  history: {
    enabled: true,
    maxMessages: 20,
  },
};

/**
 * Load configuration from file or use defaults.
 * Resolves environment variables with "env:VAR_NAME" pattern.
 * 
 * @param customPath - Optional custom path to config file
 * @returns Parsed and validated Config object
 * @throws Error if API key is missing or config is invalid
 */
export function loadConfig(customPath?: string): Config {
  const configPath = customPath || DEFAULT_CONFIG_PATH;
  
  let rawConfig: any = {};
  
  // Try to load config file if it exists
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      rawConfig = JSON.parse(fileContent);
    } catch (error: any) {
      throw new Error(`Failed to parse config file at ${configPath}: ${error.message}`);
    }
  }
  
  // Merge with defaults
  const config = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    pricing: { ...DEFAULT_CONFIG.pricing, ...rawConfig.pricing },
    retry: { ...DEFAULT_CONFIG.retry, ...rawConfig.retry },
    history: { ...DEFAULT_CONFIG.history, ...rawConfig.history },
  };
  
  // Resolve API key from environment variable if needed
  if (config.apiKey?.startsWith('env:')) {
    const envVar = config.apiKey.slice(4);
    const apiKey = process.env[envVar];
    
    if (!apiKey) {
      throw new Error(
        `Environment variable ${envVar} is not set.\n` +
        `Please set it in your environment or add "apiKey" directly in ${configPath}`
      );
    }
    
    config.apiKey = apiKey;
  }
  
  // If no API key yet, try ANTHROPIC_API_KEY from environment
  if (!config.apiKey && process.env.ANTHROPIC_API_KEY) {
    config.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  
  // Validate required fields
  if (!config.apiKey) {
    throw new Error(
      `API key not found.\n` +
      `Set ANTHROPIC_API_KEY environment variable or add "apiKey" in ${configPath}\n` +
      `Example config: { "apiKey": "env:ANTHROPIC_API_KEY", ... }`
    );
  }
  
  return config as Config;
}

/**
 * Create default config directory if it doesn't exist
 */
export function ensureConfigDirectory(): void {
  const configDir = path.dirname(DEFAULT_CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Get the default config file path
 */
export function getDefaultConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}
