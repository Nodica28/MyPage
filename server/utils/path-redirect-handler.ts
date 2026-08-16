import {db} from "../db";
import {pathRedirects} from "@shared/schema";
import {eq, sql} from "drizzle-orm";

/**
 * Handles saving old path and updating redirect when user's publicPath changes
 * @param userId - The user's ID
 * @param oldPath - The previous publicPath
 * @param newPath - The new publicPath
 */
export async function handlePathRedirect(
  userId: number,
  oldPath: string,
  newPath: string
): Promise<void> {
  try {
    // Only proceed if paths are actually different
    if (oldPath === newPath) {
      return;
    }

    console.log(
      `[PathRedirect] Handling path change for user ${userId}: ${oldPath} -> ${newPath}`
    );

    // Check if user already has a redirect record
    const [existingRecord] = await db
      .select()
      .from(pathRedirects)
      .where(eq(pathRedirects.userId, userId))
      .limit(1);

    if (existingRecord) {
      // Update existing record: add old path to array and update current path
      const currentOldPaths = existingRecord.oldPaths || [];

      // Only add the old path if it's not already in the array and it's not the same as the new path
      if (!currentOldPaths.includes(oldPath) && oldPath !== newPath) {
        const updatedOldPaths = [...currentOldPaths, oldPath];

        await db
          .update(pathRedirects)
          .set({
            oldPaths: updatedOldPaths,
            currentPath: newPath,
            updatedAt: new Date()
          })
          .where(eq(pathRedirects.userId, userId));

        console.log(
          `[PathRedirect] Updated existing record: added "${oldPath}" to old paths array`
        );
      } else {
        // Just update the current path if old path is already tracked
        await db
          .update(pathRedirects)
          .set({
            currentPath: newPath,
            updatedAt: new Date()
          })
          .where(eq(pathRedirects.userId, userId));

        console.log(
          "[PathRedirect] Updated current path only (old path already tracked)"
        );
      }
    } else {
      // Create new record
      await db.insert(pathRedirects).values({
        userId,
        oldPaths: [oldPath], // Start with the first old path
        currentPath: newPath
      });

      console.log(
        `[PathRedirect] Created new record with old path: ${oldPath}`
      );
    }

    console.log(
      `[PathRedirect] Successfully handled redirect from ${oldPath} to ${newPath}`
    );
  } catch (error) {
    console.error("[PathRedirect] Error handling path redirect:", error);
    throw error;
  }
}

/**
 * Finds if there's a redirect for the given path
 * @param path - The path to check for redirects
 * @returns The redirect information or null if no redirect exists
 */
export async function findPathRedirect(path: string): Promise<{
  currentPath: string;
  userId: number;
} | null> {
  try {
    // Use PostgreSQL's JSONB containment operator to check if path is in old_paths array
    const [redirect] = await db
      .select({
        currentPath: pathRedirects.currentPath,
        userId: pathRedirects.userId
      })
      .from(pathRedirects)
      .where(sql`${pathRedirects.oldPaths} @> ${JSON.stringify([path])}`)
      .limit(1);

    if (redirect) {
      return {
        currentPath: redirect.currentPath,
        userId: redirect.userId
      };
    }

    return null;
  } catch (error) {
    console.error("[PathRedirect] Error finding path redirect:", error);
    return null;
  }
}

/**
 * Checks if a path exists in old paths and returns the current user info
 * @param path - The path to check
 * @returns The user info if found, null otherwise
 */
export async function findUserByOldPath(path: string): Promise<{
  userId: number;
  currentPath: string;
} | null> {
  try {
    // First try to find in path redirects
    const redirect = await findPathRedirect(path);
    if (redirect) {
      return redirect;
    }

    return null;
  } catch (error) {
    console.error("[PathRedirect] Error finding user by old path:", error);
    return null;
  }
}

/**
 * Gets all old paths for a specific user
 * @param userId - The user's ID
 * @returns Array of old paths
 */
export async function getUserOldPaths(userId: number): Promise<string[]> {
  try {
    const [record] = await db
      .select({oldPaths: pathRedirects.oldPaths})
      .from(pathRedirects)
      .where(eq(pathRedirects.userId, userId))
      .limit(1);

    return record?.oldPaths || [];
  } catch (error) {
    console.error("[PathRedirect] Error getting user old paths:", error);
    return [];
  }
}

/**
 * Gets the complete redirect record for a user
 * @param userId - The user's ID
 * @returns The complete redirect record or null
 */
export async function getUserRedirectRecord(userId: number): Promise<{
  oldPaths: string[];
  currentPath: string;
  createdAt: Date | null;
  updatedAt: Date | null;
} | null> {
  try {
    const [record] = await db
      .select()
      .from(pathRedirects)
      .where(eq(pathRedirects.userId, userId))
      .limit(1);

    return record || null;
  } catch (error) {
    console.error("[PathRedirect] Error getting user redirect record:", error);
    return null;
  }
}
