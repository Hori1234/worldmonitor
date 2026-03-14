// src/db/schema.ts
import { sqliteTable, text, integer, primaryKey, uniqueIndex, customType } from 'drizzle-orm/sqlite-core';
import { type Endpoint } from '@/db/types/Feed/userFeed'; // Assuming your type path
import { relations } from 'drizzle-orm';


// This is a reusable helper for any column that needs to store JSON.
// This is the corrected, null-safe helper function.
const jsonText = <TData>(name: string) =>
  customType<{ data: TData | null; driverData: string | null }>({
    dataType() {
      return 'text';
    },
    toDriver(value: TData | null): string | null {
      // Handles 'undefined' and 'null' from your code
      if (value === undefined || value === null) {
        return null;
      }
      return JSON.stringify(value);
    },
    fromDriver(value: string | null): TData | null {
      // Handles 'NULL' from the database
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    },
  
  })(name);


/**
 * The `users` table will store user accounts.
 * - `id`: The unique username or account ID.
 * - `isCurrentUser`: A flag (0 or 1) to easily find the active user,
 * replacing the 'currentUser' key from AsyncStorage.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  isCurrentUser: integer('is_current_user', { mode: 'boolean' }).default(false),
  username: text('username').notNull(), 
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(), // Store as Unix timestamp
});


/**
 * The `endpoints` table stores the news sources for each user.
 * This table creates a one-to-many relationship: one user can have many endpoints.
 */
export const endpoints = sqliteTable('endpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  link: text('link').notNull(),
  apiKey: text('api_key'),
  type: text('type', { enum: ['RSS', 'ATOM', 'NEWS_API', 'GNEWS', 'HTML'] }).notNull(),

});


/**
 * The `publications` table stores collections of news items.
 * This also has a one-to-many relationship with users.
 */
export const publications = sqliteTable('publications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  endpointId: integer('endpoint_id').notNull().references(() => endpoints.id, { onDelete: 'cascade' })
}) 

/**
 * The `feedItems` table stores individual news articles.
 * This has a one-to-many relationship with publications.
 */
export const feedItems = sqliteTable('feed_items', {
    id: text('id').primaryKey(), // The unique ID from the feed source
    publicationId: integer('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    link: text('link').notNull(),
    description: text('description'),
    author: text('author'),
    imageUrl: text('image_url'),
});

// Optional: Define types for easier usage throughout the app
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type EndpointSchema = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;

// relations

// One User -> Many Endpoints
export const userRelations = relations(users, ({ many }) => ({
  endpoints: many(endpoints),
}));

// One Endpoint -> Many Publications
// Also links back to the user it belongs to.
export const endpointRelations = relations(endpoints, ({ one, many }) => ({
  user: one(users, {
    fields: [endpoints.userId],
    references: [users.id],
  }),
  publications: many(publications),
}));

// One Publication -> Many Feed Items
// Also links back to the endpoint it belongs to.
export const publicationsRelations = relations(publications, ({ one, many }) => ({
  endpoint: one(endpoints, {
    fields: [publications.endpointId], // Assumes 'endpointId' exists in your publications table
    references: [endpoints.id],
  }),
  feedItems: many(feedItems),
}));

// Links a Feed Item back to the Publication it belongs to.
export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  publication: one(publications, {
    fields: [feedItems.publicationId],
    references: [publications.id],
  }),
}));