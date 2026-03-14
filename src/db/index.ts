// src/db/index.ts
import Database from '@tauri-apps/plugin-sql';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

let dbInstance: Database | null = null;

// Initialize the Tauri SQLite plugin connection
export async function initDb() {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:worldmonitor-local.db');
  }
  return dbInstance;
}

// Create the Drizzle instance connecting using the Tauri plugin bridge
export const db = drizzle(
  async (sql, params, method) => {
    const database = await initDb();
    
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