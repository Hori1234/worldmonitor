// // src/db/index.ts
// import Database from '@tauri-apps/plugin-sql';
// import { drizzle } from 'drizzle-orm/sqlite-proxy';
// import * as schema from './schema';

// const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

// let dbInstance: Database | null = null;
// //const inMemoryMockDb = new Map(); // Simple mock for browser dev

// // Initialize the Tauri SQLite plugin connection
// export async function initDb() {
//   if (!isTauri) {
//     console.warn("Browser environment detected: Tauri SQL plugin disabled. Using mock DB.");
//     return null; // Return null so the proxy knows it's strictly in a browser
//   }

//   if (!dbInstance) {
//     try {
//       dbInstance = await Database.load('sqlite:worldmonitor-local.db');
//     } catch (e) {
//       console.error("Failed to load Tauri SQL database:", e);
//     }
//   }
//   return dbInstance;
// }

// // Create the Drizzle instance connecting using the Tauri plugin bridge
// export const db = drizzle(
//   async (sql, params, method) => {
//     // If we're not in Tauri, just mock a successful empty response so Drizzle doesn't crash the browser
//     if (!isTauri) {
//       if (sql.includes('SELECT')) return { rows: [] };
//       return { rows: [] };
//     }

//     const database = await initDb();
//     if (!database) return { rows: [] }; // Failsafe
    
//     try {
//       if (method === 'run') {
//         // const result = await database.execute(sql, params);
//         return { rows: [] };
//       } else if (method === 'all') {
//         const rows = await database.select<Record<string, unknown>[]>(sql, params);
//         return { rows };
//       } else { // 'get'
//         const rows = await database.select<Record<string, unknown>[]>(sql, params);
//         return { rows: rows.slice(0, 1) };
//       }
//     } catch (e: any) {
//       console.error('Error from sqlite proxy', e);
//       return { rows: [] };
//     }
//   },
//   { schema }
// );

import Database from '@tauri-apps/plugin-sql';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js/dist/sql-wasm.js';
import * as schema from './schema';

const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

let tauriDb: Database | null = null;
let browserDb: SqlJsDatabase | null = null;
let initPromise: Promise<void> | null = null; // Prevent concurrent DB initialization

export async function initDb() {
  if (initPromise) return initPromise; // Return the existing promise if already initializing

  initPromise = (async () => {
    if (isTauri) {
      if (!tauriDb) {
        try {
          tauriDb = await Database.load('sqlite:worldmonitor-local.db');
        } catch (e) {
          console.error("Failed to load Tauri SQL database:", e);
        }
      }
    } else {
      if (!browserDb) {
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
        console.warn("Browser environment detected: Using sql.js in-memory database.");
        browserDb = new SQL.Database();
        
        browserDb.run(`
          CREATE TABLE IF NOT EXISTS \`users\` (
            \`id\` text PRIMARY KEY NOT NULL,
            \`is_current_user\` integer DEFAULT false,
            \`username\` text NOT NULL,
            \`email\` text NOT NULL,
            \`password_hash\` text NOT NULL,
            \`created_at\` integer NOT NULL
          );
          CREATE TABLE IF NOT EXISTS \`endpoints\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`user_id\` text NOT NULL,
            \`link\` text NOT NULL,
            \`api_key\` text,
            \`type\` text NOT NULL,
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
          );
          CREATE TABLE IF NOT EXISTS \`publications\` (
            \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            \`name\` text NOT NULL,
            \`endpoint_id\` integer NOT NULL,
            FOREIGN KEY (\`endpoint_id\`) REFERENCES \`endpoints\`(\`id\`) ON UPDATE no action ON DELETE cascade
          );
          CREATE TABLE IF NOT EXISTS \`feed_items\` (
            \`id\` text PRIMARY KEY NOT NULL,
            \`publication_id\` integer NOT NULL,
            \`title\` text NOT NULL,
            \`link\` text NOT NULL,
            \`description\` text,
            \`author\` text,
            \`image_url\` text,
            FOREIGN KEY (\`publication_id\`) REFERENCES \`publications\`(\`id\`) ON UPDATE no action ON DELETE cascade
          );
        `);
      }
    }
  })();

  return initPromise;
}

// Create the Drizzle instance connecting via Proxy
export const db = drizzle(
  async (sql, params, method) => {
    await initDb();

    // 1. TAURI EXECUTION
    if (isTauri && tauriDb) {
      try {
        if (method === 'run') {
          await tauriDb.execute(sql, params);
          return { rows: [] };
        } else if (method === 'all') {
          const rows = await tauriDb.select<Record<string, unknown>[]>(sql, params);
          return { rows };
        } else { // 'get'
          const rows = await tauriDb.select<Record<string, unknown>[]>(sql, params);
          return { rows: rows.slice(0, 1) };
        }
      } catch (e) {
        console.error('Tauri sqlite proxy error:', e);
        return { rows: [] };
      }
    }

    if (!isTauri && browserDb) {
      try {
        // If it's an INSERT/UPDATE/DELETE, use .run() directly
        if (method === 'run') {
          browserDb.run(sql, params);
          return { rows: [] };
        }

        // If it's a SELECT, use prepare -> bind -> step -> get
        const stmt = browserDb.prepare(sql);
        stmt.bind(params);
        
        const rows: any[] = [];
        while (stmt.step()) {
          // stmt.get() returns an array of values `[val1, val2, ...]`
          // Drizzle proxy automatically maps positional arrays perfectly to your schema!
          rows.push(stmt.get()); 
        }
        stmt.free();

        if (method === 'all') {
          return { rows };
        } else {
          return { rows: rows.slice(0, 1) };
        }
      } catch (e) {
         console.error('Browser sqlite proxy error:', e, sql);
         return { rows: [] };
      }
    }

    return { rows: [] }; // Fallback
  },
  { schema }
);