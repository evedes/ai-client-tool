import { loadConfig } from '../lib/config.js';
import { AnthropicClient } from '../lib/anthropic-client.js';
import { CostTracker } from '../lib/cost-tracker.js';
import { AuthError, RateLimitError, NetworkError } from '../lib/errors.js';

interface AskOptions {
  model?: string;
  config?: string;
  debug?: boolean;
}

export async function askCommand(prompt: string, options: AskOptions): Promise<void> {
  try {
    const config = loadConfig(options.config);
    
    if (options.model) {
      config.defaultModel = options.model;
    }
    
    if (options.debug) {
      console.log(`[DEBUG] Using model: ${config.defaultModel}`);
      console.log(`[DEBUG] Max tokens: ${config.maxTokens}`);
      console.log(`[DEBUG] Temperature: ${config.temperature}`);
    }
    
    const client = new AnthropicClient(config);
    const costTracker = new CostTracker(true); // Load persisted stats
    
    const { content, usage } = await client.sendMessage(
      [{ role: 'user', content: prompt, timestamp: Date.now() }],
      (attempt, delay) => {
        if (options.debug) {
          console.log(`[DEBUG] Retry attempt ${attempt} after ${Math.round(delay)}ms`);
        }
      }
    );
    
    // Update and persist stats
    costTracker.addUsage(usage);
    costTracker.persist();
    
    console.log(content);
    console.log();
    console.log(costTracker.formatUsage(usage));
    
    process.exit(0);
  } catch (error: any) {
    if (error instanceof AuthError) {
      console.error('Error: Authentication failed.');
      console.error('Check your ANTHROPIC_API_KEY in your environment or ~/.ai-client/config.json');
    } else if (error instanceof RateLimitError) {
      console.error('Error: Rate limited by Anthropic API.');
      console.error('Please wait a moment and try again.');
    } else if (error instanceof NetworkError) {
      console.error('Error: Network error occurred.');
      console.error('Check your internet connection and try again.');
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    if (options.debug) {
      console.error('\n[DEBUG] Full error:');
      console.error(error);
    }
    
    process.exit(1);
  }
}
