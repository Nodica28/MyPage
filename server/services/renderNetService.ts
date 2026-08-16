import axios from "axios";
import {storage} from "../storage";
import {createPromptService} from "./promptService";
import {HeadshotOptions} from "@shared/types/headshot";
// Update type definitions to match actual data structure
export interface ModelSettings {
  modelConfig: {
    guidanceScale: number;
    sdxlWeights: string;
    defaultNegativePrompt: string;
    scheduler: string;
    numInferenceSteps: number;
  };
  imageConfig: {
    ipAdapterScale: number;
    enhanceNonFaceRegion: boolean;
    outputFormat: string;
    outputQuality: number;
  };
  controlnetConfig: {
    enablePoseControlnet: boolean;
    poseStrength: number;
    enableCannyControlnet: boolean;
    cannyStrength: number;
    enableDepthControlnet: boolean;
    depthStrength: number;
  };
}

export interface GenerationStatus {
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  error?: string;
}

export class RenderNetService {
  private static instance: RenderNetService;
  private apiToken: string;
  private apiUrl: string = "https://api.rendernet.ai";
  private promptService = createPromptService(storage);

  private constructor(apiToken: string) {
    this.apiToken = apiToken;
    console.log("Initializing RenderNet service with API token");
  }

  public static getInstance(apiToken: string): RenderNetService {
    if (!apiToken) {
      console.warn("[RenderNet] No API token provided, using fallback mode");
      apiToken = "placeholder_for_deployment";
    }

    if (!RenderNetService.instance) {
      console.log("[RenderNet] Creating new service instance");
      RenderNetService.instance = new RenderNetService(apiToken);
    }
    return RenderNetService.instance;
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    const url = `${this.apiUrl}${endpoint}`;
    console.log(`[RenderNet] Making ${method} request to: ${url}`);
    console.log("[RenderNet] Request payload:", JSON.stringify(data, null, 2));

    try {
      const headers = {
        "X-API-KEY": this.apiToken,
        "Content-Type": "application/json",
        Accept: "application/json"
      };

      const response = await axios({
        method,
        url,
        data: data ? JSON.stringify(data) : undefined,
        headers,
        validateStatus: (status) => status < 500
      });

      if (response.status >= 400) {
        throw new Error(
          `Request failed with status ${response.status}: ${JSON.stringify(response.data)}`
        );
      }

      return response;
    } catch (error: any) {
      console.error("[RenderNet] Request failed:", error.message);
      if (axios.isAxiosError(error)) {
        console.error("[RenderNet] Response details:", {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }

  private async pollAssetStatus(
    assetId: string,
    maxAttempts = 30
  ): Promise<boolean> {
    console.log(`[RenderNet] Polling asset status for: ${assetId}`);
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.makeRequest(
          "get",
          `/pub/v2/assets/${assetId}`
        );
        console.log(
          `[RenderNet] Poll attempt ${attempts + 1}, status:`,
          response.data?.data?.status
        );

        if (response.data?.data?.status === "active") {
          return true;
        } else if (response.data?.data?.status === "failed") {
          throw new Error("Asset processing failed");
        }

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error("[RenderNet] Error polling asset status:", error);
        throw error;
      }
    }

    throw new Error("Asset processing timed out");
  }

  public async createCharacter(
    name: string,
    assetId: string,
    prompt: string
  ): Promise<any> {
    try {
      console.log("[RenderNet] Creating new character");
      console.log("[RenderNet] Character details:", {name, assetId, prompt});

      // Wait for asset to be processed
      await this.pollAssetStatus(assetId);
      console.log(
        "[RenderNet] Asset processed successfully, creating character"
      );

      const response = await this.makeRequest("post", "/pub/v1/characters", {
        asset_id: assetId,
        character_type: "realistic",
        name: name,
        prompt: prompt
      });

      if (!response.data?.data?.id) {
        throw new Error(
          "Invalid response format from RenderNet API: Missing character ID"
        );
      }

      console.log(
        "[RenderNet] Character created successfully:",
        response.data.data
      );
      return response.data.data;
    } catch (error: any) {
      console.error("[RenderNet] Failed to create character:", error.message);
      throw new Error(`Failed to create character: ${error.message}`);
    }
  }

  public async uploadAsset(imageData: string): Promise<string> {
    try {
      console.log("[RenderNet] Starting asset upload process");

      if (!imageData) {
        throw new Error("No image data provided");
      }

      // Extract base64 data from data URL if present
      const base64Data = imageData.includes("base64,")
        ? imageData.split("base64,")[1]
        : imageData;

      // Step 1: Get upload URL from RenderNet
      const uploadUrlResponse = await this.makeRequest(
        "post",
        "/pub/v2/assets/upload?type=image",
        {
          size: {width: 512, height: 512}
        }
      );

      if (
        !uploadUrlResponse.data?.data?.upload_url ||
        !uploadUrlResponse.data?.data?.id
      ) {
        throw new Error(
          "Invalid response format: Missing upload URL or asset ID"
        );
      }

      const {upload_url: uploadUrl, id: assetId} = uploadUrlResponse.data.data;
      console.log("[RenderNet] Got upload URL and asset ID:", {
        uploadUrl,
        assetId
      });

      // Step 2: Upload image data to the provided URL
      try {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const uploadResponse = await axios.put(uploadUrl, imageBuffer, {
          headers: {
            "Content-Type": "application/octet-stream"
          }
        });

        if (uploadResponse.status !== 200) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        console.log("[RenderNet] Image uploaded successfully to URL");
        return assetId;
      } catch (uploadError: any) {
        console.error("[RenderNet] Failed to upload to URL:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
    } catch (error: any) {
      console.error("[RenderNet] Asset upload process failed:", error);
      throw error;
    }
  }

  public async updateCharacter(): Promise<any> {
    console.error(
      "[RenderNet] UpdateCharacter is deprecated, use createCharacter instead"
    );
    throw new Error(
      "UpdateCharacter is deprecated, use createCharacter instead"
    );
  }

  public async generateHeadshot(
    characterId: string,
    options: HeadshotOptions
  ): Promise<{id: string; status: string}> {
    try {
      console.log("[RenderNet] Starting headshot generation");
      console.log(
        "[RenderNet] Generation options:",
        JSON.stringify(options, null, 2)
      );

      if (!characterId) {
        throw new Error("Character ID is required");
      }

      // Get character details
      const character = await storage.getCharacter(characterId);
      if (!character) {
        throw new Error("Character not found");
      }

      // Get model settings first
      let modelSettings: ModelSettings;
      try {
        modelSettings = (await storage.getModelSettings()) as ModelSettings;
      } catch (settingsError) {
        console.error(
          "[RenderNet] Error loading model settings, using defaults:",
          settingsError
        );
        // Use default settings if error occurs
        modelSettings = {
          modelConfig: {
            guidanceScale: 5,
            sdxlWeights: "RealVisXL_V3.0_Turbo",
            defaultNegativePrompt:
              "(lowres, low quality, worst quality:1.2), (text:1.2), watermark, painting, drawing, illustration, glitch,deformed, mutated, cross-eyed, ugly, disfigured",
            scheduler: "DPMSolverMultistepScheduler-Karras-SDE",
            numInferenceSteps: 30
          },
          imageConfig: {
            ipAdapterScale: 0.8,
            enhanceNonFaceRegion: true,
            outputFormat: "webp",
            outputQuality: 100
          },
          controlnetConfig: {
            enablePoseControlnet: true,
            poseStrength: 0.4,
            enableCannyControlnet: false,
            cannyStrength: 0.3,
            enableDepthControlnet: false,
            depthStrength: 0.5
          }
        };
      }

      // Generate prompt using promptService
      const {positivePrompt, negativePrompt} =
        await this.promptService.generatePrompt(character, options);
      console.log("[RenderNet] Generated prompts:", {
        positivePrompt,
        negativePrompt
      });

      // Ensure model settings are complete by providing defaults for missing properties
      const defaultGuidanceScale = 12;
      const defaultIpAdapterScale = 0.8;
      const defaultEnhanceNonFace = true;
      const defaultOutputFormat = "webp";
      const defaultOutputQuality = 100;
      const defaultModel = "flux";
      const defaultScheduler = "DPM++ 2M Karras";
      const defaultInferenceSteps = 30;

      const generationPayload = {
        aspect_ratio: "3:5",
        batch_size: 1,
        cfg_scale:
          modelSettings.modelConfig?.guidanceScale || defaultGuidanceScale,
        character: {
          character_id: characterId,
          weight:
            modelSettings.imageConfig?.ipAdapterScale || defaultIpAdapterScale,
          mode: "strong"
        },
        model: modelSettings.modelConfig?.sdxlWeights || defaultModel,
        prompt: {
          negative: negativePrompt,
          positive: `{${character.name}} ${positivePrompt}`
        },
        quality: "Plus",
        sampler: modelSettings.modelConfig?.scheduler || defaultScheduler,
        seed: -1,
        steps:
          modelSettings.modelConfig?.numInferenceSteps || defaultInferenceSteps,
        style: "Cinematic",
        style_detail: {
          name: "Cinematic",
          base_model: "flux"
        },
        image_config: {
          enhance_face: true,
          enhance_non_face:
            modelSettings.imageConfig?.enhanceNonFaceRegion ??
            defaultEnhanceNonFace,
          output_format:
            modelSettings.imageConfig?.outputFormat || defaultOutputFormat,
          output_quality:
            modelSettings.imageConfig?.outputQuality || defaultOutputQuality
        }
      };

      console.log(
        "[RenderNet] Generation payload:",
        JSON.stringify(generationPayload, null, 2)
      );

      console.log("Generation payload:", generationPayload);

      const response = await this.makeRequest(
        "post",
        "/pub/v1/generations?type=image",
        [generationPayload]
      );

      if (!response.data?.data?.generation_id) {
        throw new Error(
          "Failed to start generation - no generation ID received"
        );
      }

      return {
        id: response.data.data.generation_id,
        status: "processing"
      };
    } catch (error: any) {
      console.error("[RenderNet] Failed to generate headshot:", error.message);
      throw new Error(`Failed to generate headshot: ${error.message}`);
    }
  }

  public async getGenerationStatus(
    generationId: string
  ): Promise<GenerationStatus> {
    try {
      const response = await this.makeRequest(
        "get",
        `/pub/v1/generations/${generationId}`
      );

      if (!response.data?.data) {
        throw new Error("Invalid response format");
      }

      const generation = response.data.data;
      const mediaItem = generation.media?.[0];

      if (!mediaItem) {
        throw new Error("No media data found in response");
      }

      if (mediaItem.status === "success" && mediaItem.url) {
        return {
          status: "completed",
          url: mediaItem.url
        };
      }

      if (mediaItem.status === "failed") {
        return {
          status: "failed",
          error: mediaItem.error || "Generation failed without specific error"
        };
      }

      return {status: "processing"};
    } catch (error: any) {
      console.error(
        "[RenderNet] Error getting generation status:",
        error.message
      );
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Gets an asset from RenderNet by its ID
   * @param assetId The ID of the asset to retrieve
   * @returns The asset data including the URL
   */
  public async getAsset(
    assetId: string
  ): Promise<{url: string; status: string}> {
    try {
      console.log(`[RenderNet] Getting asset by ID: ${assetId}`);

      if (!assetId) {
        throw new Error("Asset ID is required");
      }

      const response = await this.makeRequest(
        "get",
        `/pub/v2/assets/${assetId}`
      );

      if (!response.data?.data) {
        throw new Error("Invalid response format from RenderNet API");
      }

      const asset = response.data.data;

      if (!asset.url) {
        throw new Error("Asset URL not available");
      }

      return {
        url: asset.url,
        status: asset.status
      };
    } catch (error: any) {
      console.error(
        `[RenderNet] Error retrieving asset ${assetId}:`,
        error.message
      );
      throw new Error(`Failed to retrieve asset: ${error.message}`);
    }
  }

  private generateCharacterPrompt(options: HeadshotOptions): string {
    console.log(
      "Generating prompt with options:",
      JSON.stringify(options, null, 2)
    );

    const elements = [];

    // Basic demographics
    elements.push(options.gender);
    elements.push(`${options.age} years old`);

    // Hair details - assemble all hair-related attributes
    let hairDescription = `${options.hairLength} ${options.hairStyle} ${options.hairColor} hair`;
    if (options.highlights && options.highlights !== "none") {
      hairDescription += ` with ${options.highlights} highlights`;
    }
    elements.push(hairDescription);

    // Skin tone
    elements.push(`with ${options.skinTone} skin tone`);

    // Facial hair for male characters
    if (
      options.gender === "male" &&
      options.facialHairType &&
      options.facialHairType !== "none"
    ) {
      elements.push(`with ${options.facialHairType}`);
    }

    const prompt = elements.join(", ");
    console.log("Generated character prompt:", prompt);
    return prompt;
  }
}

export interface ImageGenerationOptions {
  setting?: string;
  lighting?: string;
  expression?: string;
}
