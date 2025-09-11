import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import * as logger from "firebase-functions/logger";
import { requireIdToken } from "../libs/auth";
import { db } from "../libs/firestore";
import { User } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { hasValidApiKey } from "../libs/user-api-key";

export async function getUserSettings(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    const decodedToken = await requireIdToken(req);
    const { uid, email } = decodedToken;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      const userData: User = {
        uid,
        email: email || "",
        name: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await db.collection("users").doc(uid).set(userData);

      res.json({
        uid,
        email: email || "",
        name: null,
        hasOpenaiApiKey: false,
      });
      return;
    }

    const userData = userDoc.data() as User;

    res.json({
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      hasOpenaiApiKey: !!userData.openaiApiKey,
    });
  } catch (error) {
    logger.error("Error getting user settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserSettings(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    const decodedToken = await requireIdToken(req);
    const { uid, email } = decodedToken;
    const { name, openaiApiKey } = req.body;

    // Validate OpenAI API key format if provided
    if (openaiApiKey && typeof openaiApiKey === "string") {
      if (!openaiApiKey.startsWith("sk-")) {
        res.status(400).json({ error: "Invalid OpenAI API key format" });
        return;
      }
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    const updateData: Partial<User> = {
      updatedAt: Timestamp.now(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (openaiApiKey !== undefined) {
      updateData.openaiApiKey = openaiApiKey || null;
    }

    if (!userDoc.exists) {
      // Create new user document
      const userData: User = {
        uid,
        email: email || "",
        name: name || null,
        openaiApiKey: openaiApiKey || undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await userRef.set(userData);
    } else {
      // Update existing user document
      await userRef.update(updateData);
    }

    logger.info("User settings updated", { uid, hasApiKey: !!openaiApiKey });

    res.json({
      uid,
      email: email || "",
      name: updateData.name ?? userDoc.data()?.name ?? null,
      hasOpenaiApiKey: !!(openaiApiKey ?? userDoc.data()?.openaiApiKey),
    });
  } catch (error) {
    logger.error("Error updating user settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function checkApiKeyStatus(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    const decodedToken = await requireIdToken(req);
    const { uid } = decodedToken;
    const hasKey = await hasValidApiKey(uid);

    res.json({
      hasValidApiKey: hasKey,
      requiresApiKey: true,
    });
  } catch (error) {
    logger.error("Error checking API key status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
