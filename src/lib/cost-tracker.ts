import { SessionStats, UsageStats } from '../types/index.js';

/**
 * Tracks cumulative session-level cost and token usage statistics.
 * Provides formatted output for displaying usage information to users.
 */
export class CostTracker {
  private stats: SessionStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requestCount: 0,
  };

  /**
   * Adds usage statistics from a single API request to the session totals.
   * @param usage - Usage statistics from an API response
   */
  addUsage(usage: UsageStats): void {
    this.stats.totalInputTokens += usage.inputTokens;
    this.stats.totalOutputTokens += usage.outputTokens;
    this.stats.totalCost += usage.totalCost;
    this.stats.requestCount += 1;
  }

  /**
   * Returns a copy of the current session statistics.
   * @returns Current session statistics
   */
  getStats(): SessionStats {
    return { ...this.stats };
  }

  /**
   * Formats a single request's usage statistics for display.
   * Includes both the current request and cumulative session cost.
   * @param usage - Usage statistics from a single request
   * @returns Formatted usage string
   */
  formatUsage(usage: UsageStats): string {
    return `Usage: ${usage.inputTokens} in / ${usage.outputTokens} out tokens — $${usage.totalCost.toFixed(4)} (session: $${this.stats.totalCost.toFixed(4)})`;
  }

  /**
   * Formats the complete session statistics for display.
   * @returns Multi-line formatted statistics summary
   */
  formatStats(): string {
    return `
Session Stats:
- Input tokens:  ${this.stats.totalInputTokens}
- Output tokens: ${this.stats.totalOutputTokens}
- Total cost:    $${this.stats.totalCost.toFixed(4)}
- Requests:      ${this.stats.requestCount}
    `.trim();
  }

  /**
   * Resets all statistics to zero.
   * Useful for starting a new session or after a conversation reset.
   */
  reset(): void {
    this.stats.totalInputTokens = 0;
    this.stats.totalOutputTokens = 0;
    this.stats.totalCost = 0;
    this.stats.requestCount = 0;
  }
}
