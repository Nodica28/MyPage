import express, {Request, Response} from "express";
import {storage} from "../storage";
import {generateChatCompletion, generateSystemPrompt} from "../utils/openai";
import {asyncHandler} from "../utils/error-handler";
import axios from "axios";
import {JSDOM} from "jsdom";

// Create router
export const router = express.Router();

/**
 * Extracts content from a URL
 * @param url The URL to extract content from
 * @returns The extracted content or null if extraction failed
 */
async function extractContentFromUrl(url: string): Promise<string | null> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }

    // Fetch the HTML content
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BadgeProfileChatBot/1.0)",
        Accept: "text/html"
      }
    });

    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract content
    const title = document.querySelector("title")?.textContent || "";

    // Get the main content - prioritize main content tags
    const mainContent =
      document.querySelector("main")?.textContent ||
      document.querySelector("article")?.textContent ||
      document.querySelector(".content")?.textContent;

    // If no main content found, grab the body content but exclude scripts and styles
    let bodyContent = "";
    if (!mainContent) {
      const scripts = document.querySelectorAll("script");
      const styles = document.querySelectorAll("style");

      // Remove scripts and styles to clean up the content
      scripts.forEach((script) => script.remove());
      styles.forEach((style) => style.remove());

      bodyContent = document.querySelector("body")?.textContent || "";
    }

    const content = mainContent || bodyContent;

    // Clean up the content - remove excessive whitespace
    const cleanedContent = content
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000); // Limit to 5000 characters

    return `URL: ${url}\nTitle: ${title}\nContent: ${cleanedContent}`;
  } catch (error) {
    console.error("Error extracting content:", error);
    return null;
  }
}

/**
 * Chat API endpoint for sending messages to the AI
 * This endpoint handles chat messages and returns AI-generated responses
 */
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      console.log("[Chat] Processing message request");
      const {userPath, message, messages = [], chatSettings} = req.body;

      if (!userPath) {
        console.log("[Chat] Request rejected - Missing user path");
        return res.status(400).json({error: "User path is required"});
      }

      if (!message && messages.length === 0) {
        console.log("[Chat] Request rejected - No message provided");
        return res.status(400).json({error: "Message is required"});
      }

      if (!chatSettings) {
        console.log("[Chat] Request rejected - Missing chat settings");
        return res.status(400).json({error: "Chat settings are required"});
      }

      // Get user by publicPath or uniquePathId
      console.log("[Chat] Looking up user profile:", userPath);
      const user = await storage.getUserByPublicPath(userPath);

      if (!user) {
        console.log("[Chat] User not found:", userPath);
        return res.status(404).json({error: "User not found"});
      }

      console.log("[Chat] User found:", user.id);

      // Process knowledge sources if available
      const knowledgeSources = chatSettings.chatSettings.knowledgeSources || [];
      let enhancedChatSettings = {...chatSettings};

      if (knowledgeSources.length > 0) {
        console.log(
          "[Chat] Processing knowledge sources:",
          knowledgeSources.length
        );
        const enhancedSources = [];

        for (const source of knowledgeSources) {
          if (source.type === "url" && source.content) {
            console.log(
              `[Chat] Extracting content from URL: ${source.content}`
            );
            const extractedContent = await extractContentFromUrl(
              source.content
            );

            if (extractedContent) {
              enhancedSources.push({
                ...source,
                extractedContent
              });
            } else {
              // Keep original source if extraction failed
              enhancedSources.push(source);
            }
          } else {
            // Keep other types of sources as is
            enhancedSources.push(source);
          }
        }

        // Update the chat settings with enhanced sources
        enhancedChatSettings = {
          ...chatSettings,
          chatSettings: {
            ...chatSettings.chatSettings,
            knowledgeSources: enhancedSources
          }
        };
      }

      // Build the messages array for OpenAI
      const apiMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [];

      // Add the system message based on user profile and chat settings
      const systemPrompt = generateSystemPrompt(user, enhancedChatSettings);
      apiMessages.push({role: "system", content: systemPrompt});

      // Add any existing conversation history
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          apiMessages.push({
            role: msg.fromUser ? "user" : "assistant",
            content: msg.content
          });
        }
      }

      // Add the current message if provided
      if (message) {
        apiMessages.push({role: "user", content: message});
      }

      // Determine which model to use from the settings
      const model = chatSettings.chatSettings.model || "gpt-3.5-turbo";

      // Get response from OpenAI
      const responseText = await generateChatCompletion(apiMessages, model);

      console.log("[Chat] Generated response:", responseText);

      // Return the AI-generated response
      res.json({
        content: responseText,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[Chat] Error processing message:", error);
      res.status(500).json({
        error: "Failed to process chat message",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

export default router;
