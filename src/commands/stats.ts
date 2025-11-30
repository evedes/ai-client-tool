/**
 * Stats Command Handler
 * Displays global usage statistics from all CLI invocations
 */

import { loadStats } from '../utils/storage.js';

/**
 * Options for the stats command
 */
interface StatsOptions {
  /** Path to custom config file (reserved for future use) */
  config?: string;
}

/**
 * Displays comprehensive usage statistics including token counts,
 * total cost, request count, and average cost per request.
 * Statistics are accumulated across all CLI invocations.
 * 
 * @param _options - Command options (currently unused, reserved for future features)
 * 
 * @example
 * ```typescript
 * await statsCommand({});
 * // Output:
 * // Global Usage Statistics:
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * //   Input tokens:    1,234
 * //   Output tokens:   5,678
 * //   Total tokens:    6,912
 * //   Total cost:      $0.0523
 * //   Total requests:  12
 * //   Avg cost/request: $0.0044
 * ```
 */
export async function statsCommand(_options: StatsOptions): Promise<void> {
  const stats = loadStats();
  
  if (!stats || stats.requestCount === 0) {
    console.log('No usage statistics found.');
    console.log('Run some queries with "ai-client ask" or "ai-client chat" to generate statistics.');
    return;
  }
  
  console.log('\nGlobal Usage Statistics:');
  console.log('━'.repeat(50));
  console.log(`  Input tokens:    ${stats.totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens:   ${stats.totalOutputTokens.toLocaleString()}`);
  console.log(`  Total tokens:    ${(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}`);
  console.log(`  Total cost:      $${stats.totalCost.toFixed(4)}`);
  console.log(`  Total requests:  ${stats.requestCount.toLocaleString()}`);
  console.log(`  Avg cost/request: $${(stats.totalCost / stats.requestCount).toFixed(4)}`);
  console.log('━'.repeat(50));
  console.log();
}
