import * as logger from "firebase-functions/logger";
import { db } from "./firestore";
import { User } from "../models/firestore";

/**
 * Gets the OpenAI API key for a user. Requires user to have their own API key.
 * @param uid User ID
 * @returns OpenAI API key
 * @throws Error if user doesn't have a valid API key
 */
export async function getUserOpenAIApiKey(uid: string): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (userDoc.exists) {
      const user = userDoc.data() as User;
      if (user.openaiApiKey && user.openaiApiKey.trim()) {
        logger.info("Using user-specific OpenAI API key", { uid });
        return user.openaiApiKey;
      }
    }

    logger.error("User does not have OpenAI API key configured", { uid });
    throw new Error("MISSING_API_KEY");
  } catch (error) {
    if ((error as Error).message === "MISSING_API_KEY") {
      throw error;
    }
    logger.error("Error retrieving user API key", { uid, error });
    throw new Error("MISSING_API_KEY");
  }
}

/**
 * Checks if a user has a valid OpenAI API key configured
 * @param uid User ID
 * @returns boolean
 */
export async function hasValidApiKey(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const user = userDoc.data() as User;
      return !!(user.openaiApiKey && user.openaiApiKey.trim() && user.openaiApiKey.startsWith("sk-"));
    }
    return false;
  } catch (error) {
    logger.error("Error checking user API key", { uid, error });
    return false;
  }
}
