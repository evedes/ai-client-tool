import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostTracker } from '@/lib/cost-tracker.js';
import * as storage from '@/utils/storage.js';

// Mock storage module
vi.mock('@/utils/storage.js', () => ({
  loadStats: vi.fn(),
  saveStats: vi.fn()
}));

describe('CostTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with zero stats', () => {
      const tracker = new CostTracker();
      const stats = tracker.getStats();
      
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
    });

    it('should load persisted stats when requested', () => {
      const mockStats = {
        totalInputTokens: 1000,
        totalOutputTokens: 2000,
        totalCost: 0.05,
        requestCount: 5
      };
      vi.mocked(storage.loadStats).mockReturnValue(mockStats);

      const tracker = new CostTracker(true);
      const stats = tracker.getStats();

      expect(storage.loadStats).toHaveBeenCalled();
      expect(stats).toEqual(mockStats);
    });

    it('should handle null persisted stats', () => {
      vi.mocked(storage.loadStats).mockReturnValue(null);

      const tracker = new CostTracker(true);
      const stats = tracker.getStats();

      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });

  describe('addUsage', () => {
    it('should add usage correctly', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      const stats = tracker.getStats();
      expect(stats.totalInputTokens).toBe(100);
      expect(stats.totalOutputTokens).toBe(200);
      expect(stats.totalCost).toBe(0.003);
      expect(stats.requestCount).toBe(1);
    });

    it('should accumulate multiple requests', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      tracker.addUsage({
        inputTokens: 150,
        outputTokens: 250,
        inputCost: 0.0015,
        outputCost: 0.0025,
        totalCost: 0.004
      });

      const stats = tracker.getStats();
      expect(stats.totalInputTokens).toBe(250);
      expect(stats.totalOutputTokens).toBe(450);
      expect(stats.totalCost).toBe(0.007);
      expect(stats.requestCount).toBe(2);
    });

    it('should handle decimal precision correctly', () => {
      const tracker = new CostTracker();
      
      // Add small amounts multiple times
      for (let i = 0; i < 10; i++) {
        tracker.addUsage({
          inputTokens: 10,
          outputTokens: 20,
          inputCost: 0.0001,
          outputCost: 0.0002,
          totalCost: 0.0003
        });
      }

      const stats = tracker.getStats();
      expect(stats.totalCost).toBeCloseTo(0.003, 4);
      expect(stats.requestCount).toBe(10);
    });
  });

  describe('getStats', () => {
    it('should return a copy of stats (not reference)', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      const stats1 = tracker.getStats();
      const stats2 = tracker.getStats();

      expect(stats1).not.toBe(stats2); // Different objects
      expect(stats1).toEqual(stats2); // Same values
    });
  });

  describe('formatUsage', () => {
    it('should format usage string correctly', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      const formatted = tracker.formatUsage({
        inputTokens: 50,
        outputTokens: 75,
        inputCost: 0.0005,
        outputCost: 0.001,
        totalCost: 0.0015
      });

      expect(formatted).toContain('50 in');
      expect(formatted).toContain('75 out');
      expect(formatted).toContain('$0.0015');
      expect(formatted).toContain('session: $0.0030');
    });
  });

  describe('formatStats', () => {
    it('should format stats summary correctly', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 1000,
        outputTokens: 2000,
        inputCost: 0.003,
        outputCost: 0.006,
        totalCost: 0.009
      });

      const formatted = tracker.formatStats();

      expect(formatted).toContain('Session Stats:');
      expect(formatted).toContain('Input tokens:  1000');
      expect(formatted).toContain('Output tokens: 2000');
      expect(formatted).toContain('$0.0090');
      expect(formatted).toContain('Requests:      1');
    });
  });

  describe('reset', () => {
    it('should reset all statistics to zero', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      tracker.reset();
      const stats = tracker.getStats();

      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });

  describe('persist', () => {
    it('should call saveStats with current stats', () => {
      const tracker = new CostTracker();
      
      tracker.addUsage({
        inputTokens: 100,
        outputTokens: 200,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003
      });

      tracker.persist();

      expect(storage.saveStats).toHaveBeenCalledWith({
        totalInputTokens: 100,
        totalOutputTokens: 200,
        totalCost: 0.003,
        requestCount: 1
      });
    });
  });
});
