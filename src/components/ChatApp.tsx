import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { Message } from './Message.js';
import { UsageStats } from './UsageStats.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { ErrorMessage } from './ErrorMessage.js';
import { AnthropicClient } from '../lib/anthropic-client.js';
import { ConversationManager } from '../lib/conversation.js';
import { CostTracker } from '../lib/cost-tracker.js';
import { AuthError, RateLimitError, NetworkError, ServerError } from '../lib/errors.js';
import { Config, Message as MessageType } from '../types/index.js';

interface Props {
  config: Config;
  debug?: boolean;
  sessionId?: string;
}

export const ChatApp: React.FC<Props> = ({ config, debug, sessionId }) => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [lastTokens, setLastTokens] = useState<{ in: number; out: number } | undefined>();
  
  const [client] = useState(() => new AnthropicClient(config));
  const [conversationManager] = useState(() => new ConversationManager(config.history, sessionId));
  const [costTracker] = useState(() => new CostTracker(true)); // Load persisted stats
  
  // Load existing messages if resuming
  useState(() => {
    if (sessionId) {
      setMessages(conversationManager.getMessages());
    }
  });
  
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // Handle special commands
    if (userMessage === '/exit') {
      exit();
      return;
    }
    
    if (userMessage === '/reset') {
      conversationManager.reset();
      costTracker.reset();
      setMessages([]);
      setLastTokens(undefined);
      return;
    }
    
    if (userMessage === '/stats') {
      // Stats are already displayed in the UI
      return;
    }
    
    if (userMessage === '/history') {
      const contextMessages = conversationManager.getMessages();
      const total = conversationManager.getConversation().messages.length;
      setError({
        message: `Showing ${contextMessages.length} of ${total} messages in context window`,
        type: 'info'
      });
      return;
    }
    
    if (userMessage === '/help') {
      setError({
        message: 'Commands: /reset (clear history) /stats (show stats) /history (show context) /exit (quit)',
        type: 'info'
      });
      return;
    }
    
    if (userMessage.startsWith('/')) {
      setError({
        message: `Unknown command: ${userMessage}. Type /help for available commands.`,
        type: 'unknown'
      });
      return;
    }
    
    // Add user message and update UI
    conversationManager.addMessage('user', userMessage);
    setMessages([...conversationManager.getMessages()]);
    setIsLoading(true);
    
    try {
      const { content, usage } = await client.sendMessage(
        conversationManager.getMessages(),
        (attempt, delay) => {
          if (debug) {
            console.log(`[DEBUG] Retry attempt ${attempt} after ${Math.round(delay)}ms`);
          }
        }
      );
      
      conversationManager.addMessage('assistant', content);
      costTracker.addUsage(usage);
      costTracker.persist(); // Save stats after each response
      conversationManager.save(); // Auto-save conversation
      setMessages([...conversationManager.getMessages()]);
      setLastTokens({ in: usage.inputTokens, out: usage.outputTokens });
      
    } catch (err: any) {
      let errorType = 'unknown';
      let errorMessage = err.message;
      
      if (err instanceof AuthError) {
        errorType = 'auth';
      } else if (err instanceof RateLimitError) {
        errorType = 'rate-limit';
      } else if (err instanceof NetworkError) {
        errorType = 'network';
      } else if (err instanceof ServerError) {
        errorType = 'server';
      }
      
      setError({ message: errorMessage, type: errorType });
      
      if (debug) {
        console.error('[DEBUG] Full error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useInput((_inputChar, key) => {
    if (key.return && !isLoading) {
      handleSubmit();
    }
  });
  
  const stats = costTracker.getStats();
  
  return (
    <Box flexDirection="column" padding={1}>
      {/* Welcome banner */}
      <Box marginBottom={1}>
        <Text bold color="cyan">🤖 AI Client - Interactive Chat</Text>
      </Box>
      
      {/* Usage stats header */}
      <UsageStats 
        model={config.defaultModel}
        totalCost={stats.totalCost}
        requestCount={stats.requestCount}
        lastRequestTokens={lastTokens}
      />
      
      {/* Message history */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}
      </Box>
      
      {/* Error display */}
      {error && error.type !== 'info' && (
        <ErrorMessage message={error.message} type={error.type as any} />
      )}
      
      {/* Info messages */}
      {error && error.type === 'info' && (
        <Box marginBottom={1}>
          <Text color="cyan">ℹ {error.message}</Text>
        </Box>
      )}
      
      {/* Loading spinner */}
      {isLoading && <LoadingSpinner />}
      
      {/* Input prompt */}
      <Box>
        <Text bold color="green">you&gt; </Text>
        <TextInput 
          value={input} 
          onChange={setInput}
          placeholder="Type your message..."
        />
      </Box>
      
      {/* Help footer */}
      <Box marginTop={1}>
        <Text dimColor>Commands: /help /reset /stats /history /exit | Press Enter to send</Text>
      </Box>
    </Box>
  );
};
