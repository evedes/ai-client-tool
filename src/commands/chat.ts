import React from 'react';
import { render } from 'ink';
import { loadConfig } from '../lib/config.js';
import { ChatApp } from '../components/ChatApp.js';

interface ChatOptions {
  model?: string;
  config?: string;
  debug?: boolean;
  resume?: string;
}

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
