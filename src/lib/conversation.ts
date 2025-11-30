import { Conversation, Message, HistoryConfig } from '../types/index.js';
import { loadSession, saveSession } from '../utils/storage.js';
import * as crypto from 'crypto';

/**
 * Manages conversation state for multi-turn chat sessions.
 * Implements sliding window context management based on configuration.
 * Supports persistence to resume conversations across sessions.
 */
export class ConversationManager {
  private conversation: Conversation;
  private historyConfig: HistoryConfig;

  /**
   * Creates a new ConversationManager.
   * @param historyConfig - Configuration for conversation history
   * @param sessionId - Optional session ID to resume previous conversation
   */
  constructor(historyConfig: HistoryConfig, sessionId?: string) {
    this.historyConfig = historyConfig;
    
    if (sessionId) {
      const loaded = loadSession(sessionId);
      if (loaded) {
        this.conversation = loaded;
        console.log(`Resumed session ${sessionId} with ${loaded.messages.length} messages`);
      } else {
        console.warn(`Session ${sessionId} not found, starting new conversation`);
        this.conversation = this.createNewConversation();
      }
    } else {
      this.conversation = this.createNewConversation();
    }
  }

  /**
   * Creates a new conversation with a unique ID and timestamps.
   */
  private createNewConversation(): Conversation {
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Adds a message to the conversation history.
   * @param role - The role of the message sender ('user' or 'assistant')
   * @param content - The message content
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.conversation.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    this.conversation.updatedAt = Date.now();
  }

  /**
   * Returns messages to include in the API context.
   * Implements sliding window based on historyConfig.maxMessages.
   * If history is disabled, returns only the last message.
   * @returns Array of messages for the current context window
   */
  getMessages(): Message[] {
    if (!this.historyConfig.enabled) {
      // If history is disabled, return only the last message
      return this.conversation.messages.slice(-1);
    }

    const maxMessages = this.historyConfig.maxMessages;
    // Return the last N messages (sliding window)
    return this.conversation.messages.slice(-maxMessages);
  }

  /**
   * Clears the conversation history and creates a new conversation.
   */
  reset(): void {
    this.conversation = this.createNewConversation();
  }

  /**
   * Returns the full conversation object with metadata.
   * @returns The complete conversation including all messages and metadata
   */
  getConversation(): Conversation {
    return this.conversation;
  }

  /**
   * Persists the current conversation to disk.
   * Creates or updates the session file in ~/.ai-client/sessions/
   */
  save(): void {
    if (this.conversation.messages.length > 0) {
      saveSession(this.conversation);
    }
  }

  /**
   * Gets the current session ID.
   * @returns The UUID of the current conversation
   */
  getSessionId(): string {
    return this.conversation.id;
  }
}
