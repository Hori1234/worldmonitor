import { initDb } from './index';
import { 
    getAllUsers, 
    createUser, 
    generateUserId, 
    setCurrentUser 
} from './api';

export async function initializeDefaultUser() {
    try {
        // 1. Ensure the Tauri database connection is actually established first
        await initDb();
        console.log("Local SQLite database initialized.");

        // 2. See if any users exist
        const users = await getAllUsers();
        const defaultUsername = "default";
        const defaultPassword = "default";

        // Generate the stable ID for the default user
        const defaultUserId = await generateUserId(defaultUsername);

        const existingDefaultUser = users.find(u => u.id === defaultUserId);

        if (!existingDefaultUser) {
            console.log("Default user not found, creating one now...");
            // Create the user and set them as "currentUser: true"
            await createUser(
                defaultUserId, 
                defaultUsername, 
                `${defaultUsername}@local.app`, // Dummy email
                defaultPassword, // Note: In a real app, hash this properly!
                true
            );
            console.log("Default user created and logged in!");
        } else {
            console.log("Default user exists, ensuring they are logged in...");
            // Ensure they are marked as the current active user in the DB
            await setCurrentUser(defaultUserId);
        }
        
    } catch (error) {
        console.error("Failed to initialize default user in DB:", error);
    }
}