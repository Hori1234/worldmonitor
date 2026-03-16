// src/db/schema.ts
import { sqliteTable, text, integer,real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';


// This is a reusable helper for any column that needs to store JSON.
// This is the corrected, null-safe helper function.
// const jsonText = <TData>(name: string) =>
//   customType<{ data: TData | null; driverData: string | null }>({
//     dataType() {
//       return 'text';
//     },
//     toDriver(value: TData | null): string | null {
//       // Handles 'undefined' and 'null' from your code
//       if (value === undefined || value === null) {
//         return null;
//       }
//       return JSON.stringify(value);
//     },
//     fromDriver(value: string | null): TData | null {
//       // Handles 'NULL' from the database
//       if (value === null) {
//         return null;
//       }
//       return JSON.parse(value);
//     },
  
//   })(name);


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
  openskyPlanes: many(openskyPlanes),
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

// Adding the open sky network for the plane tracking
/**
 * Table 1: Open Sky Planes Data
 * Stores the base aircraft metadata and tracks how many times the API worker has seen it.
 */
export const openskyPlanes = sqliteTable('opensky_planes', {
  icao24: text('icao24').primaryKey(),
  callsign: text('callsign'),
  originCountry: text('origin_country').notNull(),
  counterHits: integer('counter_hits').default(0).notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

/**
 * Table 2: Open Sky Planes Info
 * Stores the actual temporal position history of the planes.
 */
export const openskyPlanePositions = sqliteTable('opensky_plane_positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  icao24: text('icao24').notNull().references(() => openskyPlanes.icao24, { onDelete: 'cascade' }),
  timePosition: integer('time_position'),
  lastContact: integer('last_contact').notNull(),
  longitude: real('longitude'),
  latitude: real('latitude'),
  baroAltitude: real('baro_altitude'),
  onGround: integer('on_ground', { mode: 'boolean' }).notNull(),
  velocity: real('velocity'),
  trueTrack: real('true_track'),
  verticalRate: real('vertical_rate'),
  sensors: text('sensors', { mode: 'json' }).$type<number[]>(),
  geoAltitude: real('geo_altitude'),
  squawk: text('squawk'),
  spi: integer('spi', { mode: 'boolean' }).notNull(),
  positionSource: integer('position_source').notNull(),
  category: integer('category').notNull(),
});

/**
 * Define the Drizzle 1-to-many relationship
 * One Plane holds Many Positions
 */
export const openskyPlanesRelations = relations(openskyPlanes, ({ one, many }) => ({
  user: one(users, {
    fields: [openskyPlanes.userId],
    references: [users.id],
  }),
  positions: many(openskyPlanePositions),
}));

export const openskyPlanePositionsRelations = relations(openskyPlanePositions, ({ one }) => ({
  plane: one(openskyPlanes, {
    fields: [openskyPlanePositions.icao24],
    references: [openskyPlanes.icao24],
  }),
}));

