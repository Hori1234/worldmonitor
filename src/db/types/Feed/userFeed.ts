/**
 * This file contains TypeScript types that are automatically inferred from the Drizzle ORM schema.
 * This is the recommended approach as it ensures your types always stay in sync with your database structure.
 *
 * Adjust the import path to your schema file as needed.
 */
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { users, endpoints, publications, feedItems } from '@/db/schema';

// --- SELECT Types ---
// These types represent the shape of data when you query it from the database (e.g., using db.select()).

/** Represents a single user record from the 'users' table. */
export type User = InferSelectModel<typeof users>;

/** Represents a single endpoint record from the 'endpoints' table. */
export type Endpoint = InferSelectModel<typeof endpoints>;

/** Represents a single publication record from the 'publications' table. */
export type Publication = InferSelectModel<typeof publications>;

/** Represents a single feed item record from the 'feed_items' table. */
export type FeedItem = InferSelectModel<typeof feedItems>;


// --- INSERT Types ---
// These types represent the shape of data you need to provide when creating a new record (e.g., using db.insert()).
// They often exclude fields that the database generates automatically, like 'id'.

/** The shape of a new user object to be inserted into the database. */
export type NewUser = Omit<User, 'id'>;

/** The shape of a new endpoint object to be inserted into the database. */
export type NewEndpoint = InferInsertModel<typeof endpoints>;

/** The shape of a new publication object to be inserted into the database. */
export type NewPublication = InferInsertModel<typeof publications>;

/** The shape of a new feed item object to be inserted into the database. */
export type NewFeedItem = InferInsertModel<typeof feedItems>;


// --- UI / Composite Types ---
// These are custom types, built from the base types above, used for specific UI components or application logic.

/**
 * A composite type representing a Publication along with all its associated FeedItems.
 * Useful for displaying a publication's content in the UI.
 */
export type PublicationWithFeedItems = Publication & {
  feedItems: FeedItem[];
};

export type EndpointPublic = Omit<Endpoint, 'id'>;
export type PublicationPublic = Omit<Publication, 'id'>;