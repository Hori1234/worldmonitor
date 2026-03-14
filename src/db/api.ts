// db/api.ts
import { db } from './index';
import { users, endpoints, NewUser, NewEndpoint, publications, feedItems } from './schema';
import { eq, and } from 'drizzle-orm';
import { User,EndpointPublic, FeedItem, Publication } from '@/db/types/Feed/userFeed';



/**
 * User Id generation utility.
 * Give robust m,ethod of hashing the username.
 */

export const generateUserId = async (username: string): Promise<string> => {
    // 1. Encode the string into a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(username);
    
    // 2. Hash the data using native Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 3. Convert the ArrayBuffer to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}




// --- User & Account Management ---

/**
 * Creates a new user account. Replaces createAccount.
 * @param accountId The unique ID for the new account.
 */
export const createUser = async (
  accountId: string,
  username: string,
  email: string,
  passwordHash: string,
  currentUser: boolean = false

): Promise<string | undefined> => {
  try {
    const newUser: NewUser = {
      id: accountId,
      username: username,
      email: email,
      passwordHash: passwordHash,
      createdAt: Math.floor(Date.now() / 1000), // Current Unix timestamp,
      isCurrentUser: currentUser ? true : false,
    };
    const result = await db.insert(users).values(newUser).returning();
    return result[0]?.id;
  } catch (error) {
    // Drizzle will throw an error if the primary key (id) already exists.
    console.error('Error creating user (it may already exist):', error);
  }
};

/**
 * Deletes a user and all their associated data (endpoints, etc.) thanks to `onDelete: 'cascade'`.
 * Replaces deleteAccount.
 * @param accountId The ID of the account to delete.
 */
export const deleteUser = async (accountId:string) => {
    try {
        await db.delete(users).where(eq(users.id, accountId));
        console.log(`User ${accountId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

/**
 * Updates a user's details.
 * @param userId The ID of the user to update.
 * @param data An object containing the fields to update (e.g., username, email).
 */
export const updateUser = async (userId: string, data: Partial<Pick<User, 'username' | 'email'>>) => {
    try {
        await db.update(users).set(data).where(eq(users.id, userId));
        console.log(`User ${userId} updated successfully.`);
    } catch (error) {
        console.error('Error updating user:', error);
    }
};
/**
 * 
 * @returns A list of all users in the database.
 */
export const getAllUsers = async (): Promise<User[]> => {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
  }
}

/**
 * Gets a user by their ID. Replaces getUserById.
 * @param accountId The ID of the user to retrieve. 
 * @returns The user object or null if not found.
 */
export const getUserById = async (accountId: string): Promise<User | null> => {
  try {
    const result = await db.select().from(users).where(eq(users.id, accountId)).limit(1);   
    if (result.length === 0) {
        return null;
    }
    const user = result[0];
    return {
      id: user?.id ?? '',
      isCurrentUser: user?.isCurrentUser ?? false,
      username: user?.username ?? '',
      email: user?.email ?? '',
      passwordHash: user?.passwordHash ?? '',
      createdAt: user?.createdAt ?? 0
    };  
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Gets the current active user. Replaces getCurrentUser.
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const result = await db.select().from(users).where(eq(users.isCurrentUser, true)).limit(1);
    const user = result[0];
    return {
      id: user?.id ?? '',
      isCurrentUser: user?.isCurrentUser ?? false,
      username: user?.username ?? '',
      email: user?.email ?? '',
      passwordHash: user?.passwordHash ?? '',
      createdAt: user?.createdAt ?? 0
    };  
  } catch (error) {
    console.error('Error getting current user:', error);
    return { id: '', isCurrentUser: false, username: '', email: '', passwordHash: '', createdAt: 0  };
  }
};

/**
 * Sets the active user. Replaces setCurrentUser.
 * This is now a transaction to ensure atomicity.
 * @param accountId The ID of the user to set as current.
 */
export const setCurrentUser = async (accountId: string) => {
  try {
    await db.transaction(async (tx) => {
      // First, set all users to not be the current user
      await tx.update(users).set({ isCurrentUser: false });
      // Then, set the specified user as the current one
      await tx.update(users).set({ isCurrentUser: true }).where(eq(users.id, accountId));
    });
  } catch (error) {
    console.error('Error setting current user:', error);
  }
};

// --- Endpoint Management ---

/**
 * Adds a new news endpoint for a specific user.
 * Replaces and simplifies addUserEndpoint.
 * @param username The username (user ID) to add the endpoint to.
 * @param newEndpoint The endpoint object to add.
 */
export const addEndpointToUser = async (username: string, newEndpointData: EndpointPublic) => {
  try {
    const newEndpoint: NewEndpoint = {
        userId: username,
        link: newEndpointData.link,
        apiKey: newEndpointData.apiKey,
        type: newEndpointData.type,
    };
    
    // The UNIQUE constraint in the schema will automatically prevent duplicates
    await db.insert(endpoints).values(newEndpoint);
    console.log(`Successfully added endpoint for user: ${username}`);

  } catch (error) {
    // Catching the unique constraint violation
    console.error('Error adding user endpoint (it may already exist):', error);
    throw new Error('This news source has already been added.');
  }
};

/**
 * Retrieves all endpoints for a given user.
 * @param username The user's ID.
 */
export const getEndpointsForUser = async (username: string) => {
    try {
        return await db.select().from(endpoints).where(eq(endpoints.userId, username));
    } catch (error) {
        console.error('Error getting endpoints for user:', error);
        return [];
    }
}

/**
 * Updates an existing endpoint for a user.
 * @param endpointId The ID of the endpoint to update.
 * @param updatedData The new data for the endpoint.
 */
export const updateEndpoint = async (endpointId: number, updatedData: Partial<EndpointPublic>) => {
    try {
        await db.update(endpoints).set(updatedData).where(eq(endpoints.id, endpointId));
        console.log(`Endpoint ${endpointId} updated successfully.`);
    } catch (error) {
        console.error('Error updating endpoint:', error);
    }
};

/**
 * Deletes a specific endpoint by its ID.
 * @param endpointId The ID of the endpoint to remove.
 */
export const deleteEndpoint = async (endpointId: number) => {
    try {
        await db.delete(endpoints).where(eq(endpoints.id, endpointId));
        console.log(`Endpoint ${endpointId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting endpoint:', error);
    }
}

export const deleteAllEndpointsForUser = async (userId: string) => {  
    try {
        await db.delete(endpoints).where(eq(endpoints.userId, userId));
        console.log(`All endpoints for user ${userId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting all endpoints for user:', error);
  }
}



// --- Publication Management ---
/**
 * Gets all publications for a given endpoint.
 * @param endpointId The ID of the endpoint.
 */
export const getPublicationsForEndpoint = async (endpointId: number) => {
    try {
    return await db.select().from(publications).where(eq(publications.endpointId, endpointId)); 
    } catch (error) {
        console.error('Error getting publications for endpoint:', error);
        return [];
  }
}

/** 
 *  updates an existing publication for a user.
 * @param publicationId The ID of the publication to update.
 * @param updatedData The new data for the publication.
 */
export const updatePublication = async (publicationId: number, updatedData: Partial<Publication>) => {
    try {
        await db.update(publications).set(updatedData).where(eq(publications.id, publicationId));
        console.log(`Publication ${publicationId} updated successfully.`);
    } catch (error) {
        console.error('Error updating publication:', error);
    }
};

/**
 * Gets all publications across all endpoints for a specific user.
 * @param userId The ID of the user.
 */
export const getPublicationsForUser = async (userId: string): Promise<Publication[]> => {
    try {
    const result = await db.select({
            id: publications.id,
            name: publications.name,
            endpointId: publications.endpointId,
        })
        .from(publications)
        .innerJoin(endpoints, eq(publications.endpointId, endpoints.id))
        .where(eq(endpoints.userId, userId));
    return result;
    } catch (error) {
        console.error('Error getting all publications for user:', error);
        return [];
  }
}

/**
 * Get Publication ID
 */

export const getPublicationId = async (publicationName: string): Promise<number | 0> => {
  let publicationId = 0;
  try {
    const result = await db.select().from(publications).where(eq(publications.name, publicationName)).limit(1);
    if (result.length > 0) {
      const publication = result[0];
      publicationId = publication?.id ?? 0;
    }
  } catch (error) {
    console.error('Error getting publication ID:', error);
  }
  return publicationId;
}

/**
 * Adds a new publication to a specific endpoint.
 * @param endpointId The ID of the endpoint to add the publication to.
 * @param name The name of the publication.
 */
export const addPublicationToEndpoint = async (endpointId: number, name: string) => {
    try {
    const newPublication = {
        name,
        endpointId,
    };
    await db.insert(publications).values(newPublication);
    console.log(`Successfully added publication to endpoint: ${endpointId}`);
    } catch (error) {
        console.error('Error adding publication to endpoint:', error);
        throw new Error('Failed to add publication.');
  }
}

/** Deletes a specific publication by its ID.
 * @param publicationId The ID of the publication to remove.
 */
export const deletePublication = async (publicationId: number) => {
    try {
    await db.delete(publications).where(eq(publications.id, publicationId));
    console.log(`Publication ${publicationId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting publication:', error);
  }
}



/**
 * Deletes all publications for a specific endpoint.
 * @param endpointId The ID of the endpoint whose publications to delete.
 */
export const deleteAllPublicationsForEndpoint = async (endpointId: number) => {
    try {
    await db.delete(publications).where(eq(publications.endpointId, endpointId));
    console.log(`All publications for endpoint ${endpointId} deleted successfully.`);
  } catch (error) {
    console.error('Error deleting all publications for endpoint:', error);
  }
}



/**
 * Deletes all publications for a specific user across all their endpoints.
 * @param userId The ID of the user whose publications to delete. 
 */
export const deleteAllPublicationsForUser = async (userId: string) => {  
    try {
    await db.delete(publications)
        .where(and(
            eq(publications.endpointId, endpoints.id),
            eq(endpoints.userId, userId)
        ));
    console.log(`All publications for user ${userId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting all publications for user:', error);
  }
} 




// --- Feed Item Management ---

// (Feed item management functions would go here, similar to the above patterns.)

/**
 * Gets all feed items for a specific publication.  
 */
export const getFeedItemsForPublication = async (publicationId: number) => {
    try {
    return await db.select().from(feedItems).where(eq(feedItems.publicationId, publicationId));
    } catch (error) {
        console.error('Error getting feed items for publication:', error);
        return [];
  }
}

/**
  * Gets all feed items across all publications for a specific user.
  */
export const getFeedItemsForUser = async (userId: string): Promise<FeedItem[]> => {
    try {
    const result = await db.select({
            feed_items: feedItems
        })
        .from(feedItems)
        .innerJoin(publications, eq(feedItems.publicationId, publications.id))
        .innerJoin(endpoints, eq(publications.endpointId, endpoints.id))
        .where(eq(endpoints.userId, userId));
    return result.map(r => r.feed_items);
    } catch (error) {
        console.error('Error getting all feed items for user:', error);
        return [];
  }
};


/**
 * Updates an existing feed item.
 * @param feedItemId The ID of the feed item to update.
 * @param updatedData The new data for the feed item.
 */
export const updateFeedItem = async (feedItemId: string, updatedData: Partial<FeedItem>) => {
    try {
        await db.update(feedItems).set(updatedData).where(eq(feedItems.id, feedItemId));
        console.log(`Feed item ${feedItemId} updated successfully.`);
    } catch (error) {
        console.error('Error updating feed item:', error);
    }
};


/**
 * Adds a new feed item to a specific publication.
 * @param publicationId The ID of the publication to add the feed item to.
 * @param feedItem The feed item object to add. 
 */
export const addFeedItemToPublication = async (publicationId: number, feedItem: {
    id: string;
    publicationId: number;
    title: string;
    link: string;
    description?: string;
    author?: string;
    imageUrl?: string;
}) => {
  try {

    // Check if the items exists first
    const existingItem = await db.select().from(feedItems).where(eq(feedItems.id, feedItem.id)).limit(1);

    if (existingItem.length > 0) {
      console.log(`Feed item with ID ${feedItem.id} already exists.`);

      await db.update(feedItems).set(feedItem).where(eq(feedItems.id, feedItem.id));

      return;
    }

    await db.insert(feedItems).values({
      id: feedItem.id,
      publicationId: publicationId,
      title: feedItem.title,
      link: feedItem.link,
      description: feedItem.description || null,
      author: feedItem.author || null,
      imageUrl: feedItem.imageUrl || null,
    });
    console.log(`Successfully added feed item to publication: ${publicationId}`);
  } catch (error) {
    console.error('Error adding feed item to publication:', error);
    throw new Error('Failed to add feed item.');
  }
}

/**
 * Deletes a specific feed item by its ID.
 * @param feedItemId The ID of the feed item to remove.
 */
export const deleteFeedItem = async (feedItemId: string) => {
    try {
        await db.delete(feedItems).where(eq(feedItems.id, feedItemId));
        console.log(`Feed item ${feedItemId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting feed item:', error);
    }
};

/** Deletes all feed items for a specific publication.
 * @param publicationId The ID of the publication whose feed items to delete.
 */
export const deleteAllFeedItemsForPublication = async (publicationId: number) => {  
    try {
    await db.delete(feedItems).where(eq(feedItems.publicationId, publicationId));
    console.log(`All feed items for publication ${publicationId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting all feed items for publication:', error);
  }
}

/**
 * Deletes all feed items for a specific endpoint across all its publications.
 * @param endpointId The ID of the endpoint whose feed items to delete.
 */
export const deleteAllFeedItemsForEndpoint = async (endpointId: number) => {  
    try {
      await db.delete(feedItems)
        .where(and(
            eq(feedItems.publicationId, publications.id),
          eq(publications.endpointId, endpointId)
        ));
    console.log(`All feed items for endpoint ${endpointId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting all feed items for endpoint:', error);
  }
}


/** Deletes all feed items for a specific user across all their publications.
 * @param userId The ID of the user whose feed items to delete.
 */
export const deleteAllFeedItemsForUser = async (userId: string) => {  
    try {
    await db.delete(feedItems)
        .where(and(
            eq(feedItems.publicationId, publications.id),
          eq(publications.endpointId, endpoints.id),
          eq(endpoints.userId, userId)
        ));
    console.log(`All feed items for user ${userId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting all feed items for user:', error);
  }
}