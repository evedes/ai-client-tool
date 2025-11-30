/**
 * Sessions Command Handler
 * Lists and manages saved conversation sessions
 */

import { listSessions } from '../utils/storage.js';

/**
 * Options for the sessions command
 */
interface SessionsOptions {
  /** Enable cleanup of old sessions (not yet implemented) */
  cleanup?: boolean;
  /** Specify age threshold for cleanup (e.g., "30d") */
  olderThan?: string;
}

/**
 * Lists all saved conversation sessions with metadata.
 * Shows session ID, message count, last activity time, and creation date.
 * Sessions are sorted by most recent activity first.
 * 
 * @param options - Command options for cleanup and filtering (reserved for future use)
 * 
 * @example
 * ```typescript
 * await sessionsCommand({});
 * // Output:
 * // Available Sessions:
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * // 📝 abc-123-uuid
 * //    Messages: 15 | Last activity: 2 hours ago
 * //    Created: 11/30/2025, 10:30:00 AM
 * ```
 */
export async function sessionsCommand(options: SessionsOptions): Promise<void> {
  const sessions = listSessions();
  
  if (sessions.length === 0) {
    console.log('No saved sessions found.');
    console.log('Start a chat to create a session: ai-client chat');
    return;
  }
  
  if (options.cleanup) {
    console.log('Session cleanup not yet implemented.');
    return;
  }
  
  console.log('\nAvailable Sessions:');
  console.log('━'.repeat(70));
  
  for (const session of sessions) {
    const age = getAge(session.updatedAt);
    const messages = session.messageCount;
    const created = new Date(session.createdAt).toLocaleString();
    
    console.log(`📝 ${session.id}`);
    console.log(`   Messages: ${messages} | Last activity: ${age} ago`);
    console.log(`   Created: ${created}`);
    console.log();
  }
  
  console.log('━'.repeat(70));
  console.log(`\nTo resume a session: ai-client chat --resume <session-id>`);
  console.log();
}

/**
 * Converts a timestamp to a human-readable "time ago" string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable duration string (e.g., "5 minutes", "2 days")
 */
function getAge(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
}
