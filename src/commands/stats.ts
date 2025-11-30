import { loadStats } from '../utils/storage.js';

interface StatsOptions {
  config?: string;
}

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
