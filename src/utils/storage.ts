import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionStats, Conversation } from '../types/index.js';

const AI_CLIENT_DIR = path.join(os.homedir(), '.ai-client');
const STATS_FILE = path.join(AI_CLIENT_DIR, 'stats.json');
const SESSIONS_DIR = path.join(AI_CLIENT_DIR, 'sessions');

/**
 * Ensures the AI Client directory structure exists
 */
function ensureDirectories(): void {
  if (!fs.existsSync(AI_CLIENT_DIR)) {
    fs.mkdirSync(AI_CLIENT_DIR, { mode: 0o700 });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { mode: 0o700 });
  }
}

/**
 * Loads global statistics from persistent storage
 * 
 * @returns SessionStats object or null if file doesn't exist or is corrupted
 */
export function loadStats(): SessionStats | null {
  try {
    ensureDirectories();
    
    if (!fs.existsSync(STATS_FILE)) {
      return null;
    }
    
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    const stats = JSON.parse(data);
    
    // Validate structure
    if (typeof stats.totalInputTokens !== 'number' ||
        typeof stats.totalOutputTokens !== 'number' ||
        typeof stats.totalCost !== 'number' ||
        typeof stats.requestCount !== 'number') {
      console.warn('Invalid stats file format, resetting...');
      return null;
    }
    
    return stats;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.warn(`Failed to load stats: ${error.message}`);
    return null;
  }
}

/**
 * Saves global statistics to persistent storage using atomic write
 * 
 * @param stats - SessionStats object to persist
 */
export function saveStats(stats: SessionStats): void {
  try {
    ensureDirectories();
    
    const data = JSON.stringify({
      ...stats,
      lastUpdated: Date.now()
    }, null, 2);
    
    // Atomic write: write to temp file, then rename
    const tempFile = `${STATS_FILE}.tmp`;
    fs.writeFileSync(tempFile, data, { mode: 0o600 });
    fs.renameSync(tempFile, STATS_FILE);
  } catch (error: any) {
    console.error(`Failed to save stats: ${error.message}`);
  }
}

/**
 * Loads a conversation session from storage
 * 
 * @param sessionId - UUID of the session to load
 * @returns Conversation object or null if not found or corrupted
 */
export function loadSession(sessionId: string): Conversation | null {
  try {
    ensureDirectories();
    
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      return null;
    }
    
    const data = fs.readFileSync(sessionFile, 'utf-8');
    const conversation = JSON.parse(data);
    
    // Validate structure
    if (!conversation.id || !Array.isArray(conversation.messages)) {
      console.warn('Invalid session file format');
      return null;
    }
    
    return conversation;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.warn(`Failed to load session: ${error.message}`);
    return null;
  }
}

/**
 * Saves a conversation session to storage using atomic write
 * 
 * @param conversation - Conversation object to persist
 */
export function saveSession(conversation: Conversation): void {
  try {
    ensureDirectories();
    
    const sessionFile = path.join(SESSIONS_DIR, `${conversation.id}.json`);
    const data = JSON.stringify(conversation, null, 2);
    
    // Atomic write: write to temp file, then rename
    const tempFile = `${sessionFile}.tmp`;
    fs.writeFileSync(tempFile, data, { mode: 0o600 });
    fs.renameSync(tempFile, sessionFile);
  } catch (error: any) {
    console.error(`Failed to save session: ${error.message}`);
  }
}

/**
 * Lists all available conversation sessions
 * 
 * @returns Array of session metadata objects
 */
export function listSessions(): Array<{
  id: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}> {
  try {
    ensureDirectories();
    
    const files = fs.readdirSync(SESSIONS_DIR);
    const sessions = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const sessionFile = path.join(SESSIONS_DIR, file);
        const data = fs.readFileSync(sessionFile, 'utf-8');
        const conversation = JSON.parse(data);
        
        sessions.push({
          id: conversation.id,
          messageCount: conversation.messages?.length || 0,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt
        });
      } catch {
        // Skip corrupted files
        continue;
      }
    }
    
    // Sort by most recent first
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    
    return sessions;
  } catch (error: any) {
    console.error(`Failed to list sessions: ${error.message}`);
    return [];
  }
}

/**
 * Deletes a conversation session
 * 
 * @param sessionId - UUID of the session to delete
 * @returns true if deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
  try {
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      return false;
    }
    
    fs.unlinkSync(sessionFile);
    return true;
  } catch (error: any) {
    console.error(`Failed to delete session: ${error.message}`);
    return false;
  }
}
