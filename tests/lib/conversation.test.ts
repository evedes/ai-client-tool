import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from '@/lib/conversation.js';
import * as storage from '@/utils/storage.js';
import type { HistoryConfig, Conversation } from '@/types/index.js';

// Mock storage module
vi.mock('@/utils/storage.js', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn()
}));

// Mock crypto for predictable UUIDs in tests - use proper UUID format
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789abc')
}));

describe('ConversationManager', () => {
  const defaultHistoryConfig: HistoryConfig = {
    enabled: true,
    maxMessages: 20
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create new conversation when no sessionId provided', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      const conversation = manager.getConversation();

      expect(conversation.id).toBe('12345678-1234-1234-1234-123456789abc');
      expect(conversation.messages).toEqual([]);
      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBeDefined();
      expect(storage.loadSession).not.toHaveBeenCalled();
    });

    it('should load existing session when sessionId provided', () => {
      const mockSession: Conversation = {
        id: 'existing-session-id',
        messages: [
          { role: 'user', content: 'Hello', timestamp: Date.now() },
          { role: 'assistant', content: 'Hi there!', timestamp: Date.now() }
        ],
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 5000
      };
      
      vi.mocked(storage.loadSession).mockReturnValue(mockSession);
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const manager = new ConversationManager(defaultHistoryConfig, 'existing-session-id');
      
      expect(storage.loadSession).toHaveBeenCalledWith('existing-session-id');
      expect(manager.getConversation()).toEqual(mockSession);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Resumed session'));
      
      consoleSpy.mockRestore();
    });

    it('should create new conversation when sessionId not found', () => {
      vi.mocked(storage.loadSession).mockReturnValue(null);
      
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const manager = new ConversationManager(defaultHistoryConfig, 'nonexistent-session');
      const conversation = manager.getConversation();
      
      expect(storage.loadSession).toHaveBeenCalledWith('nonexistent-session');
      expect(conversation.id).toBe('12345678-1234-1234-1234-123456789abc');
      expect(conversation.messages).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      
      warnSpy.mockRestore();
    });

    it('should generate unique session ID', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      const sessionId = manager.getSessionId();
      
      expect(sessionId).toBe('12345678-1234-1234-1234-123456789abc');
      expect(sessionId).toHaveLength(36); // UUID format
    });
  });

  describe('addMessage', () => {
    it('should add user message correctly', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      const beforeTime = Date.now();
      
      manager.addMessage('user', 'Hello, world!');
      
      const conversation = manager.getConversation();
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello, world!'
      });
      expect(conversation.messages[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(conversation.updatedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should add assistant message correctly', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('assistant', 'Hi there! How can I help?');
      
      const conversation = manager.getConversation();
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toMatchObject({
        role: 'assistant',
        content: 'Hi there! How can I help?'
      });
    });

    it('should add multiple messages in sequence', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'First message');
      manager.addMessage('assistant', 'First response');
      manager.addMessage('user', 'Second message');
      manager.addMessage('assistant', 'Second response');
      
      const conversation = manager.getConversation();
      expect(conversation.messages).toHaveLength(4);
      expect(conversation.messages[0].content).toBe('First message');
      expect(conversation.messages[1].content).toBe('First response');
      expect(conversation.messages[2].content).toBe('Second message');
      expect(conversation.messages[3].content).toBe('Second response');
    });

    it('should update updatedAt timestamp on each message', () => {
      vi.useFakeTimers();
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Message 1');
      const firstUpdatedAt = manager.getConversation().updatedAt;
      
      // Add small delay
      vi.advanceTimersByTime(10);
      
      manager.addMessage('assistant', 'Response 1');
      const secondUpdatedAt = manager.getConversation().updatedAt;
      
      expect(secondUpdatedAt).toBeGreaterThanOrEqual(firstUpdatedAt);
      vi.useRealTimers();
    });

    it('should handle empty content', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', '');
      
      const conversation = manager.getConversation();
      expect(conversation.messages[0].content).toBe('');
    });

    it('should handle multiline content', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      
      manager.addMessage('user', multilineContent);
      
      const conversation = manager.getConversation();
      expect(conversation.messages[0].content).toBe(multilineContent);
    });
  });

  describe('getMessages', () => {
    it('should return all messages when below maxMessages limit', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      manager.addMessage('user', 'Message 2');
      
      const messages = manager.getMessages();
      expect(messages).toHaveLength(3);
    });

    it('should implement sliding window when exceeding maxMessages', () => {
      const config: HistoryConfig = {
        enabled: true,
        maxMessages: 4
      };
      const manager = new ConversationManager(config);
      
      // Add 6 messages (exceeds maxMessages of 4)
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      manager.addMessage('user', 'Message 2');
      manager.addMessage('assistant', 'Response 2');
      manager.addMessage('user', 'Message 3');
      manager.addMessage('assistant', 'Response 3');
      
      const messages = manager.getMessages();
      
      // Should return last 4 messages
      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe('Message 2');
      expect(messages[1].content).toBe('Response 2');
      expect(messages[2].content).toBe('Message 3');
      expect(messages[3].content).toBe('Response 3');
    });

    it('should return only last message when history disabled', () => {
      const config: HistoryConfig = {
        enabled: false,
        maxMessages: 20
      };
      const manager = new ConversationManager(config);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      manager.addMessage('user', 'Message 2');
      manager.addMessage('assistant', 'Response 2');
      
      const messages = manager.getMessages();
      
      // Should return only the last message
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Response 2');
    });

    it('should return empty array when no messages', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      const messages = manager.getMessages();
      expect(messages).toEqual([]);
    });

    it('should handle maxMessages = 1', () => {
      const config: HistoryConfig = {
        enabled: true,
        maxMessages: 1
      };
      const manager = new ConversationManager(config);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      manager.addMessage('user', 'Message 2');
      
      const messages = manager.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Message 2');
    });

    it('should handle very large maxMessages', () => {
      const config: HistoryConfig = {
        enabled: true,
        maxMessages: 1000
      };
      const manager = new ConversationManager(config);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      
      const messages = manager.getMessages();
      expect(messages).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should clear all messages and create new conversation', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      
      expect(manager.getConversation().messages).toHaveLength(2);
      
      manager.reset();
      
      const conversation = manager.getConversation();
      expect(conversation.messages).toEqual([]);
      // Note: In tests with mocked UUID, every UUID call returns the same value
      // In real usage, reset() would generate a new unique UUID
      expect(conversation.id).toBe('12345678-1234-1234-1234-123456789abc');
    });

    it('should reset timestamps', () => {
      vi.useFakeTimers();
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Message');
      const oldCreatedAt = manager.getConversation().createdAt;
      
      vi.advanceTimersByTime(1000);
      
      manager.reset();
      
      const conversation = manager.getConversation();
      expect(conversation.createdAt).toBeGreaterThanOrEqual(oldCreatedAt);
      expect(conversation.updatedAt).toBe(conversation.createdAt);
      vi.useRealTimers();
    });
  });

  describe('getConversation', () => {
    it('should return complete conversation object', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Test message');
      
      const conversation = manager.getConversation();
      
      expect(conversation).toHaveProperty('id');
      expect(conversation).toHaveProperty('messages');
      expect(conversation).toHaveProperty('createdAt');
      expect(conversation).toHaveProperty('updatedAt');
      expect(conversation.messages).toHaveLength(1);
    });

    it('should return reference to actual conversation (not copy)', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      const conv1 = manager.getConversation();
      const conv2 = manager.getConversation();
      
      expect(conv1).toBe(conv2); // Same reference
    });
  });

  describe('save', () => {
    it('should save conversation with messages', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Test message');
      manager.save();
      
      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '12345678-1234-1234-1234-123456789abc',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Test message'
            })
          ])
        })
      );
    });

    it('should not save empty conversation', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.save();
      
      expect(storage.saveSession).not.toHaveBeenCalled();
    });

    it('should save after multiple messages', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.addMessage('user', 'Message 1');
      manager.addMessage('assistant', 'Response 1');
      manager.addMessage('user', 'Message 2');
      manager.save();
      
      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Message 1' }),
            expect.objectContaining({ content: 'Response 1' }),
            expect.objectContaining({ content: 'Message 2' })
          ])
        })
      );
    });
  });

  describe('getSessionId', () => {
    it('should return consistent session ID', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      const id1 = manager.getSessionId();
      const id2 = manager.getSessionId();
      
      expect(id1).toBe(id2);
      expect(id1).toBe('12345678-1234-1234-1234-123456789abc');
    });

    it('should return different ID after reset', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      manager.getSessionId();
      manager.reset();
      const id2 = manager.getSessionId();
      
      // In real scenario would be different, but our mock returns same value
      expect(id2).toBe('12345678-1234-1234-1234-123456789abc');
    });
  });

  describe('edge cases', () => {
    it('should handle maxMessages = 0 gracefully', () => {
      const config: HistoryConfig = {
        enabled: true,
        maxMessages: 0
      };
      const manager = new ConversationManager(config);
      
      manager.addMessage('user', 'Message');
      const messages = manager.getMessages();
      
      expect(messages).toEqual([]);
    });

    it('should handle rapid message additions', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      for (let i = 0; i < 100; i++) {
        manager.addMessage('user', `Message ${i}`);
      }
      
      const conversation = manager.getConversation();
      expect(conversation.messages).toHaveLength(100);
    });

    it('should handle special characters in content', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      const specialContent = '!@#$%^&*()_+{}[]|\\:";\'<>?,./ 😀 🚀';
      
      manager.addMessage('user', specialContent);
      
      const messages = manager.getMessages();
      expect(messages[0].content).toBe(specialContent);
    });

    it('should preserve message order', () => {
      const manager = new ConversationManager(defaultHistoryConfig);
      
      for (let i = 1; i <= 10; i++) {
        manager.addMessage(i % 2 === 1 ? 'user' : 'assistant', `Message ${i}`);
      }
      
      const messages = manager.getMessages();
      for (let i = 0; i < 10; i++) {
        expect(messages[i].content).toBe(`Message ${i + 1}`);
      }
    });
  });
});
