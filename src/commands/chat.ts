import * as readline from 'readline';
import { loadConfig } from '../lib/config.js';
import { AnthropicClient } from '../lib/anthropic-client.js';
import { ConversationManager } from '../lib/conversation.js';
import { AuthError, RateLimitError, NetworkError, ServerError } from '../lib/errors.js';

interface ChatOptions {
  model?: string;
  config?: string;
  debug?: boolean;
}

export async function chatCommand(options: ChatOptions): Promise<void> {
  try {
    const config = loadConfig(options.config);
    
    if (options.model) {
      config.defaultModel = options.model;
    }
    
    if (options.debug) {
      console.log(`[DEBUG] Using model: ${config.defaultModel}`);
      console.log(`[DEBUG] Max tokens: ${config.maxTokens}`);
      console.log(`[DEBUG] Temperature: ${config.temperature}`);
      console.log(`[DEBUG] History enabled: ${config.history.enabled}`);
      console.log(`[DEBUG] Max messages in context: ${config.history.maxMessages}`);
    }
    
    const client = new AnthropicClient(config);
    const conversationManager = new ConversationManager(config.history);
    
    // Session statistics tracking
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let requestCount = 0;
    
    console.log(`Model: ${config.defaultModel}`);
    console.log('Type /reset to clear history, /stats for statistics, /exit to quit.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'you> '
    });
    
    rl.prompt();
    
    rl.on('line', async (input) => {
      const userInput = input.trim();
      
      // Handle empty input
      if (!userInput) {
        rl.prompt();
        return;
      }
      
      // Handle special commands
      if (userInput === '/exit') {
        console.log('\nSession Stats:');
        console.log(`- Input tokens:  ${totalInputTokens}`);
        console.log(`- Output tokens: ${totalOutputTokens}`);
        console.log(`- Total cost:    $${totalCost.toFixed(4)}`);
        console.log(`- Requests:      ${requestCount}`);
        console.log('\nGoodbye!');
        rl.close();
        process.exit(0);
        return;
      }
      
      if (userInput === '/reset') {
        conversationManager.reset();
        totalCost = 0;
        totalInputTokens = 0;
        totalOutputTokens = 0;
        requestCount = 0;
        console.log('Conversation reset.\n');
        rl.prompt();
        return;
      }
      
      if (userInput === '/stats') {
        console.log('\nSession Stats:');
        console.log(`- Input tokens:  ${totalInputTokens}`);
        console.log(`- Output tokens: ${totalOutputTokens}`);
        console.log(`- Total cost:    $${totalCost.toFixed(4)}`);
        console.log(`- Requests:      ${requestCount}`);
        console.log();
        rl.prompt();
        return;
      }
      
      if (userInput === '/history') {
        const messages = conversationManager.getMessages();
        console.log(`\nConversation History (${messages.length} messages in context):`);
        messages.forEach((msg, i) => {
          const role = msg.role === 'user' ? 'you' : 'claude';
          const preview = msg.content.length > 60 
            ? msg.content.substring(0, 60) + '...' 
            : msg.content;
          console.log(`  ${i + 1}. [${role}] ${preview}`);
        });
        console.log();
        rl.prompt();
        return;
      }
      
      // Handle unknown commands
      if (userInput.startsWith('/')) {
        console.log(`Unknown command: ${userInput}`);
        console.log('Available commands: /reset, /stats, /history, /exit\n');
        rl.prompt();
        return;
      }
      
      // Add user message to conversation
      conversationManager.addMessage('user', userInput);
      
      // Show loading indicator
      process.stdout.write('claude> Thinking...');
      
      try {
        const { content, usage } = await client.sendMessage(
          conversationManager.getMessages(),
          (attempt, delay) => {
            if (options.debug) {
              console.log(`\n[DEBUG] Retry attempt ${attempt} after ${Math.round(delay)}ms`);
            }
          }
        );
        
        // Clear the "Thinking..." line
        process.stdout.write('\r\x1b[K');
        
        // Add assistant response to conversation
        conversationManager.addMessage('assistant', content);
        
        // Update session statistics
        totalInputTokens += usage.inputTokens;
        totalOutputTokens += usage.outputTokens;
        totalCost += usage.totalCost;
        requestCount += 1;
        
        // Display response
        console.log(`claude> ${content}`);
        console.log();
        console.log(`Usage: ${usage.inputTokens} in / ${usage.outputTokens} out tokens — $${usage.totalCost.toFixed(4)} (session: $${totalCost.toFixed(4)})`);
        console.log();
        
      } catch (error: any) {
        // Clear the "Thinking..." line
        process.stdout.write('\r\x1b[K');
        
        if (error instanceof AuthError) {
          console.log('claude> Error: Authentication failed.');
          console.log('Check your ANTHROPIC_API_KEY in your environment or ~/.ai-client/config.json\n');
        } else if (error instanceof RateLimitError) {
          console.log('claude> Error: Rate limited by Anthropic API.');
          console.log('Please wait a moment and try again.\n');
        } else if (error instanceof NetworkError) {
          console.log('claude> Error: Network error occurred.');
          console.log('Check your internet connection and try again.\n');
        } else if (error instanceof ServerError) {
          console.log('claude> Error: Anthropic service error.');
          console.log('Please try again in a moment.\n');
        } else {
          console.log(`claude> Error: ${error.message}\n`);
        }
        
        if (options.debug) {
          console.log('[DEBUG] Full error:');
          console.error(error);
          console.log();
        }
      }
      
      rl.prompt();
    });
    
    rl.on('close', () => {
      console.log('\nSession Stats:');
      console.log(`- Input tokens:  ${totalInputTokens}`);
      console.log(`- Output tokens: ${totalOutputTokens}`);
      console.log(`- Total cost:    $${totalCost.toFixed(4)}`);
      console.log(`- Requests:      ${requestCount}`);
      console.log('\nGoodbye!');
      process.exit(0);
    });
    
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}
