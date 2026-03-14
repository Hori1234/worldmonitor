// src/db/index.ts
import Database from '@tauri-apps/plugin-sql';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

let dbInstance: Database | null = null;
const inMemoryMockDb = new Map(); // Simple mock for browser dev

// Initialize the Tauri SQLite plugin connection
export async function initDb() {
  if (!isTauri) {
    console.warn("Browser environment detected: Tauri SQL plugin disabled. Using mock DB.");
    return null; // Return null so the proxy knows it's strictly in a browser
  }

  if (!dbInstance) {
    try {
      dbInstance = await Database.load('sqlite:worldmonitor-local.db');
    } catch (e) {
      console.error("Failed to load Tauri SQL database:", e);
    }
  }
  return dbInstance;
}

// Create the Drizzle instance connecting using the Tauri plugin bridge
export const db = drizzle(
  async (sql, params, method) => {
    // If we're not in Tauri, just mock a successful empty response so Drizzle doesn't crash the browser
    if (!isTauri) {
      if (sql.includes('SELECT')) return { rows: [] };
      return { rows: [] };
    }

    const database = await initDb();
    if (!database) return { rows: [] }; // Failsafe
    
    try {
      if (method === 'run') {
        const result = await database.execute(sql, params);
        return { rows: [] };
      } else if (method === 'all') {
        const rows = await database.select<Record<string, unknown>[]>(sql, params);
        return { rows };
      } else { // 'get'
        const rows = await database.select<Record<string, unknown>[]>(sql, params);
        return { rows: rows.slice(0, 1) };
      }
    } catch (e: any) {
      console.error('Error from sqlite proxy', e);
      return { rows: [] };
    }
  },
  { schema }
);