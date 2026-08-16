import {PromptVariables} from "@shared/types/model";
import {HeadshotOptions} from "@shared/types/headshot";
import {Character} from "@shared/types/character";
import {IStorage} from "../storage";

export class PromptService {
  constructor(private storage: IStorage) {}

  private getSettingPrompt(
    category: string,
    setting: string,
    promptVars: PromptVariables
  ): string {
    try {
      if (!category || !setting || !promptVars?.settings?.[category]) {
        console.warn(
          `Missing setting category: ${category}, using default prompt`
        );
        return setting || "";
      }

      // Log the available settings for debugging
      console.log(
        "Available settings:",
        JSON.stringify(promptVars.settings, null, 2)
      );
      console.log(`Looking for setting '${setting}' in category '${category}'`);

      const categorySettings = promptVars.settings[category];
      if (!categorySettings) {
        console.warn(`Category ${category} not found in promptVars`);
        return setting || "";
      }

      const prompt = categorySettings[setting];
      if (!prompt) {
        console.warn(`Setting ${setting} not found in category ${category}`);
        return setting || "";
      }

      return prompt;
    } catch (error) {
      console.error(
        `Failed to get setting prompt for ${category}/${setting}:`,
        error
      );
      return setting || "";
    }
  }

  private getLightingPrompt(
    lighting: string,
    promptVars: PromptVariables
  ): string {
    try {
      if (!lighting || !promptVars?.lighting) {
        console.warn("Missing lighting types in promptVars");
        return lighting || "";
      }

      // Log available lighting types for debugging
      console.log(
        "Available lighting types:",
        JSON.stringify(promptVars.lighting, null, 2)
      );
      console.log(`Looking for lighting type: ${lighting}`);

      // Direct access to lighting property
      const prompt = promptVars.lighting[lighting];
      if (!prompt) {
        console.warn(`Lighting type ${lighting} not found in promptVars`);
        return lighting || "";
      }

      return prompt;
    } catch (error) {
      console.error(`Failed to get lighting prompt for ${lighting}:`, error);
      return lighting || "";
    }
  }

  private getExpressionPrompt(
    expression: string,
    promptVars: PromptVariables
  ): string {
    try {
      if (!expression || !promptVars?.expressions) {
        console.warn("Missing expressions in promptVars");
        return expression || "";
      }

      // Log available expressions for debugging
      console.log(
        "Available expressions:",
        JSON.stringify(promptVars.expressions, null, 2)
      );
      console.log(`Looking for expression: ${expression}`);

      // Direct access to expressions property
      const prompt = promptVars.expressions[expression];
      if (!prompt) {
        console.warn(`Expression ${expression} not found in promptVars`);
        return expression || "";
      }

      return prompt;
    } catch (error) {
      console.error(
        `Failed to get expression prompt for ${expression}:`,
        error
      );
      return expression || "";
    }
  }

  private getClothingPrompt(
    clothing: string,
    promptVars: PromptVariables
  ): string {
    try {
      if (!clothing || !promptVars?.clothing) {
        console.warn("Missing clothing in promptVars");
        return clothing || "";
      }

      // Log available clothing options for debugging
      console.log(
        "Available clothing options:",
        JSON.stringify(promptVars.clothing, null, 2)
      );
      console.log(`Looking for clothing type: ${clothing}`);

      // Direct access to clothing property
      const prompt = promptVars.clothing[clothing];
      if (!prompt) {
        console.warn(`Clothing type ${clothing} not found in promptVars`);
        return clothing || "";
      }

      return prompt;
    } catch (error) {
      console.error(`Failed to get clothing prompt for ${clothing}:`, error);
      return clothing || "";
    }
  }

  async generatePrompt(
    character: Character,
    options: HeadshotOptions
  ): Promise<{positivePrompt: string; negativePrompt: string}> {
    let modelSettings;
    try {
      modelSettings = await this.storage.getModelSettings();
    } catch (error) {
      console.error("[PromptService] Error fetching model settings:", error);
      // Use default empty promptVars
      modelSettings = {
        modelConfig: {
          defaultNegativePrompt:
            "blurry, low quality, worst quality, low resolution, pixelated, distorted face, asymmetrical face, weird eyes, crossed eyes, multiple people, crowd, background people, busy background, oversaturated, cartoon, anime, painting, sketch, illustration, bad anatomy, deformed, disfigured, mutation, extra limbs, bad lighting, dark, underexposed, overexposed, harsh shadows, unprofessional, casual clothing, wrinkled clothes, cropped face, cut off, partial face, tilted head, jewelry, necklaces, accessories that distract, watermark, signature, text, logo, nsfw, deformed pupils, jpeg artifacts, ugly, duplicate, morbid, mutilated"
        },
        promptVars: {
          lighting: {},
          settings: {},
          expressions: {},
          clothing: {}
        }
      };
    }

    if (!modelSettings) {
      throw new Error("Model settings not found");
    }

    // Log model settings for debugging
    console.log("Model settings:", JSON.stringify(modelSettings, null, 2));

    const promptVars = (modelSettings.promptVars as PromptVariables) || {
      lighting: {},
      settings: {},
      expressions: {},
      clothing: {}
    };

    let basePrompt;
    // If useCustomHeadshotPrompt is true, use the custom headshot prompt directly
    if (options.useCustomHeadshotPrompt && options.customPrompt) {
      console.log(
        "[PromptService] Using custom headshot prompt:",
        options.customPrompt
      );
      return {
        positivePrompt: `photorealistic headshot of ${character.name}, ${options.customPrompt}`,
        negativePrompt:
          options.useCustomNegativePrompt && options.customNegativePrompt
            ? options.customNegativePrompt
            : modelSettings.modelConfig?.defaultNegativePrompt || ""
      };
    } else {
      console.log(
        "[PromptService] Using character custom prompt:",
        character.customPrompt
      );
      basePrompt = `photorealistic headshot of ${character.name}, ${character.customPrompt}`;
    }

    // Build the prompt components with fallbacks
    const settingPrompt = this.getSettingPrompt(
      options.settingCategory || "",
      options.setting || "",
      promptVars
    );
    const lightingPrompt = this.getLightingPrompt(
      options.lighting || "",
      promptVars
    );
    const expressionPrompt = this.getExpressionPrompt(
      options.expression || "",
      promptVars
    );
    const clothingPrompt = this.getClothingPrompt(
      options.clothing || "",
      promptVars
    );

    // Log the generated components for debugging
    console.log("[PromptService] Generated prompt components:", {
      settingPrompt,
      lightingPrompt,
      expressionPrompt,
      clothingPrompt
    });

    // Combine all components into final prompt
    const positivePrompt = `${basePrompt}, ${settingPrompt}, ${lightingPrompt}, ${expressionPrompt}, ${clothingPrompt}, high resolution portrait, sharp details, professional photo quality, high-end camera, studio quality`;

    // Log the final prompt for debugging
    console.log("Final positive prompt:", positivePrompt);

    return {
      positivePrompt,
      negativePrompt:
        options.useCustomNegativePrompt && options.customNegativePrompt
          ? options.customNegativePrompt
          : modelSettings.modelConfig?.defaultNegativePrompt || ""
    };
  }
}

export const createPromptService = (storage: IStorage) => {
  return new PromptService(storage);
};
