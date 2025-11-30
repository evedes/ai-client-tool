/**
 * Chat Command Handler
 * Launches interactive terminal UI for multi-turn conversations
 */

import React from 'react';
import { render } from 'ink';
import { loadConfig } from '../lib/config.js';
import { ChatApp } from '../components/ChatApp.js';

/**
 * Options for the chat command
 */
interface ChatOptions {
  /** Override the default model from config */
  model?: string;
  /** Path to custom config file */
  config?: string;
  /** Enable debug output */
  debug?: boolean;
  /** Session ID to resume previous conversation */
  resume?: string;
}

/**
 * Launches the interactive chat interface powered by Ink.
 * Supports conversation history, session persistence, and real-time cost tracking.
 * 
 * @param options - Command options for model, config, debug, and session resumption
 * 
 * @example
 * ```typescript
 * // Start new chat session
 * await chatCommand({ debug: false });
 * 
 * // Resume previous session
 * await chatCommand({ resume: 'abc-123-uuid' });
 * ```
 */
export async function chatCommand(options: ChatOptions): Promise<void> {
  try {
    const config = loadConfig(options.config);
    
    if (options.model) {
      config.defaultModel = options.model;
    }
    
    if (options.debug) {
      console.log(`[DEBUG] Using model: ${config.defaultModel}`);
      console.log(`[DEBUG] Ink UI enabled`);
      if (options.resume) {
        console.log(`[DEBUG] Resuming session: ${options.resume}`);
      }
    }
    
    render(React.createElement(ChatApp, { 
      config, 
      debug: options.debug,
      sessionId: options.resume
    }));
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}
