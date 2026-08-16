import OpenAI from "openai";
import {encode} from "gpt-tokenizer";

// Initialize OpenAI client with validation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  defaultHeaders: {
    "User-Agent": "Badge AI Client"
  },
  defaultQuery: {
    "api-version": "2024-02"
  }
});

// Map of model names to actual API model identifiers
const MODEL_MAP: Record<string, string> = {
  "o1-mini": "o1-mini",
  "o1-preview": "o1-preview",
  "gpt-4o": "gpt-4o",
  "o1-mini-2024-09-12": "o1-mini-2024-09-12",
  "o1-preview-2024-09-12": "o1-preview-2024-09-12"
};

// Maximum token limits for different models
const MODEL_TOKEN_LIMITS: Record<string, number> = {
  "o1-mini": 16000,
  "o1-preview": 128000,
  "gpt-4o": 128000,
  "o1-mini-2024-09-12": 16000,
  "o1-preview-2024-09-12": 128000,
  default: 16000 // Default for unknown models
};

// Reserve tokens for the response
const RESERVED_TOKENS = 1000;

/**
 * Count the number of tokens in a string
 * @param text The text to count tokens for
 * @returns The number of tokens
 */
function countTokens(text: string): number {
  return encode(text).length;
}

/**
 * Truncate text to a specified token limit
 * @param text The text to truncate
 * @param maxTokens The maximum number of tokens
 * @returns The truncated text
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;

  const truncatedTokens = tokens.slice(0, maxTokens);
  const truncatedText = Buffer.from(truncatedTokens).toString();

  return (
    truncatedText + "\n\n[Note: Content was truncated due to size limitations.]"
  );
}

/**
 * Generate a chat completion using OpenAI's API
 * @param messages The messages to send to the API
 * @param model The model to use (defaults to o1-mini)
 * @returns The generated response text
 */
export async function generateChatCompletion(
  messages: Array<{role: "system" | "user" | "assistant"; content: string}>,
  model: string = "o1-mini"
) {
  try {
    // Map friendly model name to actual API model identifier
    const actualModel = MODEL_MAP[model] || "o1-mini";

    // Get token limit for the model
    const modelTokenLimit =
      MODEL_TOKEN_LIMITS[actualModel] || MODEL_TOKEN_LIMITS.default;
    const maxInputTokens = modelTokenLimit - RESERVED_TOKENS;

    console.log("[OpenAI] Generating chat completion with model:", actualModel);
    console.log("[OpenAI] Token limit for model:", modelTokenLimit);

    // Create a copy of messages to avoid modifying the original
    let processedMessages = [...messages];

    // Check if we need to handle system messages differently based on model
    const systemMessage = processedMessages.find(
      (msg) => msg.role === "system"
    );

    // Add markdown formatting instructions to the system message
    const markdownInstructions =
      "\n\nFormat your responses using markdown for better readability. Use markdown features like:\n- **Bold** for emphasis\n- *Italics* for subtle emphasis\n- Lists (ordered and unordered) for structured content\n- `Code blocks` for code or technical terms\n- ### Headings for sections\n- > Blockquotes for important information\n- Tables for structured data when appropriate\nEnsure code examples are properly formatted with syntax highlighting using triple backticks.";

    // o1 models don't support system messages, so we need to handle them differently
    if (
      systemMessage &&
      (actualModel.includes("o1-") || actualModel.includes("gpt-4o"))
    ) {
      console.log(
        "[OpenAI] Converting system message to user message for compatibility"
      );

      // Remove the system message from the array
      processedMessages = processedMessages.filter(
        (msg) => msg.role !== "system"
      );

      // Truncate the system message content if it's too large
      if (systemMessage.content.length > 25000) {
        console.log("[OpenAI] System message is too large, truncating...");
        systemMessage.content =
          systemMessage.content.substring(0, 25000) +
          "\n\n[Note: Knowledge base content was truncated due to size limitations. Focus on the available information.]";
      }

      // Add markdown instructions to the system message
      systemMessage.content += markdownInstructions;

      // If the first message is from the user, prepend the system message content to it
      const firstUserMessage = processedMessages.find(
        (msg) => msg.role === "user"
      );

      if (firstUserMessage) {
        // Calculate tokens for the combined message
        const combinedContent = `${systemMessage.content}\n\nUser query: ${firstUserMessage.content}`;
        const combinedTokenCount = countTokens(combinedContent);

        if (combinedTokenCount > maxInputTokens / 2) {
          console.log(
            "[OpenAI] Combined system+user message exceeds token limits, truncating system content"
          );
          // Allocate 75% of tokens to system message, 25% to user message
          const systemTokenLimit = Math.floor((maxInputTokens / 2) * 0.75);
          const userTokenLimit = Math.floor((maxInputTokens / 2) * 0.25);

          const truncatedSystemContent = truncateToTokenLimit(
            systemMessage.content,
            systemTokenLimit
          );
          const truncatedUserContent = truncateToTokenLimit(
            firstUserMessage.content,
            userTokenLimit
          );

          firstUserMessage.content = `${truncatedSystemContent}\n\nUser query: ${truncatedUserContent}`;
        } else {
          firstUserMessage.content = combinedContent;
        }
      } else {
        // If there's no user message, add one with the system content
        const truncatedSystemContent = truncateToTokenLimit(
          systemMessage.content,
          maxInputTokens / 2
        );
        processedMessages.unshift({
          role: "user",
          content: truncatedSystemContent
        });
      }
    } else if (systemMessage) {
      // Add markdown instructions to the system message for models that support system messages
      systemMessage.content += markdownInstructions;

      if (systemMessage.content.length > 25000) {
        // Truncate system message if it's too large to avoid token limits
        console.log("[OpenAI] System message is too large, truncating...");
        systemMessage.content =
          systemMessage.content.substring(0, 25000) +
          "\n\n[Note: Knowledge base content was truncated due to size limitations. Focus on the available information.]";
      }
    } else {
      // If there's no system message, create one with markdown instructions
      processedMessages.unshift({
        role: "system",
        content: "You are a helpful assistant." + markdownInstructions
      });
    }

    // Calculate total tokens in the conversation
    let totalTokens = 0;
    for (const msg of processedMessages) {
      totalTokens += countTokens(msg.content);
    }

    // If total token count is still too high, perform additional truncation
    if (totalTokens > maxInputTokens) {
      console.log(
        "[OpenAI] Total tokens exceed limit, performing additional truncation"
      );

      // Preserve the most recent messages
      const preserveMessages = 3; // Keep the last 3 messages at minimum

      if (processedMessages.length > preserveMessages) {
        // If we have more than the minimum to preserve, start truncating older messages
        let availableTokens = maxInputTokens;

        // Calculate tokens for the most recent messages that we want to preserve
        const recentMessages = processedMessages.slice(-preserveMessages);
        let recentTokens = 0;

        for (const msg of recentMessages) {
          recentTokens += countTokens(msg.content);
        }

        // Reduce available tokens by what's needed for recent messages
        availableTokens -= recentTokens;

        // Start with the oldest messages and allocate remaining tokens
        const olderMessages = processedMessages.slice(0, -preserveMessages);
        const truncatedOlderMessages = [];

        for (const msg of olderMessages) {
          const msgTokens = countTokens(msg.content);

          if (availableTokens > msgTokens) {
            // We can include this message fully
            truncatedOlderMessages.push(msg);
            availableTokens -= msgTokens;
          } else if (availableTokens > 100) {
            // Only truncate if we can keep a meaningful amount
            // Truncate this message to fit
            const truncatedContent = truncateToTokenLimit(
              msg.content,
              availableTokens
            );
            truncatedOlderMessages.push({
              role: msg.role,
              content: truncatedContent
            });
            availableTokens = 0;
          } else {
            // Not enough tokens left for this message
            break;
          }
        }

        // Reconstruct the message array with truncated older messages + preserved recent ones
        processedMessages = [...truncatedOlderMessages, ...recentMessages];

        // Log the new token count
        let newTotalTokens = 0;
        for (const msg of processedMessages) {
          newTotalTokens += countTokens(msg.content);
        }
        console.log("[OpenAI] After truncation, token count:", newTotalTokens);
      } else {
        // If we only have a few messages, distribute tokens evenly
        const tokensPerMessage = Math.floor(
          maxInputTokens / processedMessages.length
        );

        processedMessages = processedMessages.map((msg) => ({
          role: msg.role,
          content: truncateToTokenLimit(msg.content, tokensPerMessage)
        }));
      }
    }

    try {
      const completion = await openai.chat.completions.create({
        model: actualModel,
        messages: processedMessages,
        seed: 42 // Adding a fixed seed for consistent responses
      });

      console.log("[OpenAI] Got completion:", completion.choices);
      return completion.choices[0].message?.content || "";
    } catch (apiError) {
      console.error("[OpenAI] API error, using fallback response:", apiError);

      // Extract the user message
      const userMessage =
        messages.find((msg) => msg.role === "user")?.content || "";

      // Generate a fallback response
      return getFallbackResponse(userMessage);
    }
  } catch (error) {
    console.error("[OpenAI] Error generating completion:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";
  }
}

/**
 * Generate a fallback response when the OpenAI API is not available
 * @param userMessage The user's message
 * @param messages All messages in the conversation
 * @returns A fallback response
 */
function getFallbackResponse(userMessage: string): string {
  const userMessageLower = userMessage.toLowerCase();

  // Check for common greeting patterns
  if (
    userMessageLower.includes("hello") ||
    userMessageLower.includes("hi") ||
    userMessageLower.includes("hey") ||
    userMessageLower.match(/^who are you/)
  ) {
    return "Hello! I'm an AI assistant for this profile. I can answer questions about the profile owner, their work, and their background. How can I help you today?";
  }

  // Check for questions about services or offerings
  if (
    userMessageLower.includes("service") ||
    userMessageLower.includes("offer") ||
    userMessageLower.includes("provide") ||
    userMessageLower.includes("help with")
  ) {
    return "Based on the profile information, I can tell you about the professional services offered. For more specific details, you might want to check the sections of this profile or use the contact information provided.";
  }

  // Check for contact-related questions
  if (
    userMessageLower.includes("contact") ||
    userMessageLower.includes("reach") ||
    userMessageLower.includes("email") ||
    userMessageLower.includes("phone")
  ) {
    return "You can find contact information in the profile. There should be email, possibly phone, and other contact methods available in the quick links section.";
  }

  // Default response
  return "I understand you're asking about that. While I'd normally have more specific information from the profile owner's details, I'm currently in demo mode. You can explore the profile sections for more information or use the contact options to reach out directly.";
}

/**
 * Generate an initial system message based on profile information and settings
 * @param userProfile The user profile information
 * @param chatSettings The chat settings
 * @returns A system message for the AI
 */
export function generateSystemPrompt(userProfile: any, chatSettings: any) {
  const {firstName, lastName, title, bio, companyName} = userProfile;
  const {
    systemPrompt,
    includeProfileData,
    knowledgeSources = []
  } = chatSettings.chatSettings;

  let prompt =
    systemPrompt ||
    "You are a helpful assistant representing the profile owner.";

  if (includeProfileData) {
    prompt += `\n\nProfile Information:
- Name: ${firstName} ${lastName}
${title ? `- Title: ${title}` : ""}
${bio ? `- Bio: ${bio}` : ""}
${companyName ? `- Company: ${companyName}` : ""}
`;
  }

  // Add knowledge sources if available
  if (knowledgeSources && knowledgeSources.length > 0) {
    prompt += "\n\nKnowledge Base Content:";

    knowledgeSources.forEach(
      (
        source: {
          name?: string;
          type: string;
          content: string;
          extractedContent?: string;
        },
        index: number
      ) => {
        const sourceName = source.name || `Source ${index + 1}`;

        // Use extracted content if available, otherwise just use the URL
        if (source.extractedContent) {
          prompt += `\n\n--- ${sourceName} ---\n${source.extractedContent}`;
        } else {
          prompt += `\n\n--- ${sourceName} ---\nURL: ${source.content}`;
        }
      }
    );

    prompt +=
      "\n\nWhen answering questions, use the knowledge base content above as your primary source of information. Supplement with the profile information as needed.";
  }

  prompt +=
    "\n\nYour job is to represent this person professionally and answer questions about them and their work. Be helpful, concise, and professional.";

  return prompt;
}
