import axios from "axios";
import {HeadshotOptions} from "@/components/headshot-generator/HeadshotSettings";

interface CharacterData {
  gender: string;
  age: number;
  hairStyle: string;
  hairLength: string;
  hairColor: string;
  highlights: string;
  skinTone: string;
  bodyBuild: string;
  facialHair?: string;
  prompt?: string;
  customPrompt?: string | null;
  useCustomCharacterPrompt?: boolean;
}

interface GenerateHeadshotParams {
  characterId: string;
  options: HeadshotOptions;
}

export const CharacterService = {
  // Upload reference image
  uploadReferenceImage: async (file: File): Promise<string> => {
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read file as base64"));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // Make the upload request
      const response = await axios.post("/api/headshots/upload", {
        image: base64,
        filename: file.name,
        type: file.type
      });

      return response.data.assetId;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  },

  // Create character
  createCharacter: async (
    assetId: string,
    characterData: CharacterData
  ): Promise<{id: string}> => {
    try {
      // Generate a character name using timestamp
      const characterName = `Character_${Date.now()}`;

      // Determine which prompt to use
      let promptToSend = characterData.prompt;

      if (
        characterData.useCustomCharacterPrompt &&
        characterData.customPrompt
      ) {
        // User has custom prompt enabled and provided
        promptToSend = characterData.customPrompt;
      } else if (!promptToSend) {
        // Generate a default prompt if not provided
        promptToSend = `A person with ${characterData.gender === "male" ? "masculine" : "feminine"} features, 
        ${characterData.age} years old, ${characterData.hairStyle} ${characterData.hairLength} ${characterData.hairColor} hair
        ${characterData.highlights !== "none" ? `with ${characterData.highlights} highlights` : ""}, 
        ${characterData.skinTone} skin tone, ${characterData.bodyBuild} build
        ${characterData.facialHair && characterData.facialHair !== "none" ? `, with ${characterData.facialHair}` : ""}.`;
      }

      const response = await axios.post("/api/headshots/character", {
        name: characterName,
        assetId: assetId,
        prompt: promptToSend,
        customPrompt: characterData.customPrompt,
        useCustomCharacterPrompt: characterData.useCustomCharacterPrompt,
        ...characterData
      });

      return {id: response.data.id};
    } catch (error) {
      console.error("Character creation error:", error);
      throw error;
    }
  },

  // Generate headshot
  generateHeadshot: async ({characterId, options}: GenerateHeadshotParams) => {
    try {
      const response = await axios.post("/api/headshots/generate", {
        characterId,
        options
      });

      return response.data;
    } catch (error) {
      console.error("Headshot generation error:", error);
      throw error;
    }
  },

  // Get headshots for a character
  getHeadshots: async (characterId: string) => {
    try {
      const response = await axios.get(
        `/api/headshots?characterId=${characterId}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch headshots:", error);
      throw error;
    }
  },

  // Get character details
  getCharacter: async (characterId: string) => {
    try {
      const response = await axios.get(
        `/api/headshots/character/${characterId}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch character:", error);
      throw error;
    }
  },

  // Get all characters for the current user
  getUserCharacters: async () => {
    try {
      const response = await axios.get("/api/headshots/characters");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user characters:", error);
      throw error;
    }
  },

  // Update existing character
  updateCharacter: async (
    characterId: string,
    characterData: Partial<CharacterData> & {assetId?: string; prompt?: string}
  ): Promise<{id: string}> => {
    try {
      const response = await axios.put(
        `/api/headshots/character/${characterId}`,
        {
          ...characterData,
          // Ensure customPrompt and useCustomCharacterPrompt are sent even if undefined
          customPrompt: characterData.customPrompt,
          useCustomCharacterPrompt: characterData.useCustomCharacterPrompt
        }
      );
      return {id: response.data.id.toString()};
    } catch (error) {
      console.error("Character update error:", error);
      throw error;
    }
  },

  // Test prompt generation without creating a headshot
  testPromptGeneration: async ({
    characterId,
    options
  }: GenerateHeadshotParams) => {
    try {
      const response = await axios.post("/api/headshots/test-prompt", {
        characterId,
        options
      });
      return response.data;
    } catch (error) {
      console.error("Prompt generation test error:", error);
      throw error;
    }
  }
};
