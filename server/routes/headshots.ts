import {Router} from "express";
import {storage} from "../storage";
import {RenderNetService} from "../services/renderNetService";
import {db} from "../db";
import {users} from "../../shared/types/user";
import {eq} from "drizzle-orm";
import axios from "axios";

const router = Router();

// Initialize RenderNet service with API key from environment
if (!process.env.RENDERNET_API_KEY) {
  console.warn(
    "[Headshots] Missing RENDERNET_API_KEY environment variable - some features will be limited"
  );
}

const renderNetService = RenderNetService.getInstance(
  process.env.RENDERNET_API_KEY || ""
);

// Import the centralized authentication middleware
import {requireAuth} from "../auth";

router.use(requireAuth);

// Add proxy download endpoint
router.get("/download/:id", async (req, res) => {
  try {
    console.log("[Headshots] Processing download request for:", req.params.id);
    const id = parseInt(req.params.id);

    // Get the headshot
    const headshot = await storage.getHeadshotRequest(id);

    if (!headshot || headshot.userId !== req.user?.id) {
      return res.status(404).json({
        error: "Headshot not found",
        details:
          "The requested headshot does not exist or you don't have access to it"
      });
    }

    if (!headshot.output) {
      return res.status(400).json({
        error: "No output available",
        details: "This headshot has no output image"
      });
    }

    try {
      // Proxy the image from RenderNet
      const response = await axios.get(headshot.output, {
        responseType: "arraybuffer"
      });

      // Set appropriate headers
      res.setHeader("Content-Type", response.headers["content-type"]);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="headshot-${headshot.id}.png"`
      );

      // Send the image data
      res.send(Buffer.from(response.data));
    } catch (downloadError) {
      console.error(
        "[Headshots] Failed to download from source:",
        downloadError
      );
      res.status(500).json({
        error: "Download failed",
        details: "Failed to retrieve the image from storage"
      });
    }
  } catch (error) {
    console.error("[Headshots] Download error:", error);
    res.status(500).json({
      error: "Download failed",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Add endpoint to get reference image by asset ID
router.get("/reference-image/:assetId", async (req, res) => {
  try {
    console.log(
      "[Headshots] Getting reference image for asset:",
      req.params.assetId
    );
    const {assetId} = req.params;

    if (!assetId) {
      return res.status(400).json({
        error: "Missing asset ID",
        details: "Asset ID is required"
      });
    }

    // Get headshots for the user to verify ownership
    const headshots = await storage.getHeadshotRequests(req.user?.id || 0);
    const hasAccess = headshots.some((h) => h.referenceImage === assetId);

    // Also check characters owned by this user
    const characters = await storage.getCharactersByUserId(req.user?.id || 0);
    const characterHasAccess = characters.some(
      (c: {referenceImage?: string}) => c.referenceImage === assetId
    );

    if (!hasAccess && !characterHasAccess) {
      return res.status(403).json({
        error: "Access denied",
        details: "You don't have access to this reference image"
      });
    }

    try {
      // Get asset info from RenderNet
      const asset = await renderNetService.getAsset(assetId);

      if (!asset.url) {
        return res.status(404).json({
          error: "Image not found",
          details: "The reference image URL is not available"
        });
      }

      // Proxy the image from RenderNet
      const response = await axios.get(asset.url, {
        responseType: "arraybuffer"
      });

      // Set appropriate headers
      res.setHeader(
        "Content-Type",
        response.headers["content-type"] || "image/jpeg"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reference-${assetId}.jpg"`
      );

      // Send the image data
      res.send(Buffer.from(response.data));
    } catch (downloadError) {
      console.error(
        "[Headshots] Failed to download reference image:",
        downloadError
      );
      res.status(500).json({
        error: "Download failed",
        details: "Failed to retrieve the reference image"
      });
    }
  } catch (error) {
    console.error("[Headshots] Reference image download error:", error);
    res.status(500).json({
      error: "Download failed",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    console.log("[Headshots] Processing delete request for:", req.params.id);
    const id = parseInt(req.params.id);

    // Get the headshot to verify ownership
    const headshot = await storage.getHeadshotRequest(id);
    if (!headshot || headshot.userId !== req.user?.id) {
      return res.status(404).json({
        error: "Headshot not found",
        details:
          "The requested headshot does not exist or you don't have access to it"
      });
    }

    // Delete the headshot
    await storage.deleteHeadshotRequest(id);
    console.log("[Headshots] Successfully deleted headshot:", id);

    res.json({success: true});
  } catch (error) {
    console.error("[Headshots] Delete error:", error);
    res.status(500).json({
      error: "Delete failed",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// List headshots endpoint
router.get("/list", async (req, res) => {
  try {
    console.log("[Headshots] Getting headshots list for user:", req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "User must be authenticated"
      });
    }

    const headshots = await storage.getHeadshotRequests(req.user.id);
    console.log("[Headshots] Found headshots:", headshots);

    res.json(headshots);
  } catch (error) {
    console.error("[Headshots] Error fetching headshots list:", error);
    res.status(500).json({
      error: "Failed to fetch headshots",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Upload endpoint
router.post("/upload", async (req, res) => {
  try {
    console.log("[Headshots] Processing image upload");
    console.log("[Headshots] Request headers:", req.headers);
    console.log("[Headshots] Request body keys:", Object.keys(req.body));

    if (!req.body || !req.body.image) {
      console.log("[Headshots] Missing image data in request");
      console.log("[Headshots] Request body:", req.body);
      return res.status(400).json({
        error: "No image data provided",
        details: "The request must include image data in the body"
      });
    }

    const {image: imageData, filename, type} = req.body;
    console.log("[Headshots] Received image upload:", {filename, type});

    // Validate base64 format
    if (!imageData.startsWith("data:image/")) {
      console.log(
        "[Headshots] Invalid image format, received data:",
        imageData.substring(0, 50)
      );
      return res.status(400).json({
        error: "Invalid image format",
        details: "Image must be provided as a base64 data URL"
      });
    }

    try {
      console.log("[Headshots] Uploading to RenderNet...");
      const assetId = await renderNetService.uploadAsset(imageData);
      console.log("[Headshots] Image uploaded successfully, assetId:", assetId);
      res.json({assetId});
    } catch (error: any) {
      console.error("[Headshots] RenderNet upload failed:", error);
      res.status(500).json({
        error: "Failed to upload to RenderNet",
        details: error.message
      });
    }
  } catch (error: any) {
    console.error("[Headshots] Upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      details: error.message
    });
  }
});

// Create character
router.post("/character", async (req, res) => {
  try {
    console.log("[Headshots] Creating character with data:", req.body);
    const {
      assetId,
      name,
      prompt,
      gender,
      age,
      hairStyle,
      hairLength,
      hairColor,
      highlights,
      facialHair,
      skinTone,
      bodyBuild,
      ...characterData
    } = req.body;

    if (!assetId || !name) {
      console.log("[Headshots] Missing required fields:", {assetId, name});
      return res.status(400).json({
        error: "Missing required fields",
        details: "assetId and name are required"
      });
    }

    // Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "User must be authenticated"
      });
    }

    // Check if user already has a character
    const existingCharacter = await storage.getCharacter(req.user.id);
    console.log("[Headshots] Existing character check:", existingCharacter);

    try {
      // Generate character prompt
      const characterPrompt =
        prompt ||
        `${gender}, ${age} years old, ${hairLength} ${hairStyle} ${hairColor} hair${highlights !== "none" ? ` with ${highlights} highlights` : ""}, with ${skinTone} skin tone, ${bodyBuild} build ${facialHair && facialHair !== "none" ? `, ${facialHair}` : ""}`;

      // Create new character in RenderNet
      console.log("[Headshots] Creating new character in RenderNet:", {
        name,
        assetId,
        characterPrompt
      });
      const renderNetChar = await renderNetService.createCharacter(
        name,
        assetId,
        characterPrompt
      );
      console.log("[Headshots] RenderNet character created:", renderNetChar);

      if (existingCharacter) {
        // Update existing character in database with new RenderNet ID
        const updated = await storage.updateCharacter(existingCharacter.id, {
          renderNetId: renderNetChar.id,
          referenceImage: assetId,
          name,
          gender,
          age,
          hairStyle,
          hairLength,
          hairColor,
          highlights,
          facialHair,
          skinTone,
          bodyBuild,
          ...characterData
        });

        console.log(
          "[Headshots] Existing character updated in database:",
          updated
        );

        // Update user with character ID
        try {
          await storage.updateUser(req.user.id, {
            characterId: updated.id
          });
          console.log(
            "[Headshots] User updated with character ID:",
            updated.id
          );
        } catch (updateError) {
          console.error(
            "[Headshots] Failed to update user with character ID:",
            updateError
          );
          // Continue even if this fails, not critical
        }

        return res.json(updated);
      }

      // Create new character in database
      const character = await storage.createCharacter({
        userId: req.user.id,
        renderNetId: renderNetChar.id,
        referenceImage: assetId,
        name,
        gender,
        age,
        hairStyle,
        hairLength,
        hairColor,
        highlights,
        facialHair,
        skinTone,
        bodyBuild,
        ...characterData
      });

      console.log("[Headshots] New character created in database:", character);

      // Update user with character ID
      try {
        await storage.updateUser(req.user.id, {
          characterId: character.id
        });
        console.log(
          "[Headshots] User updated with character ID:",
          character.id
        );
      } catch (updateError) {
        console.error(
          "[Headshots] Failed to update user with character ID:",
          updateError
        );
        // Continue even if this fails, not critical
      }

      res.json(character);
    } catch (renderError: any) {
      console.error("[Headshots] RenderNet or database error:", renderError);
      throw new Error(`Failed to create character: ${renderError.message}`);
    }
  } catch (error: any) {
    console.error("[Headshots] Error creating character:", error);
    res.status(500).json({
      error: "Failed to create character",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Get character
router.get("/character/:id", async (req, res) => {
  try {
    console.log("[Headshots] Getting character:", req.params.id);
    const characterId = parseInt(req.params.id);
    const character = await storage.getCharacter(characterId);

    if (!character || character.userId !== req.user?.id) {
      return res.status(404).json({
        error: "Character not found",
        details:
          "The requested character does not exist or you don't have access to it"
      });
    }

    res.json(character);
  } catch (error) {
    console.error("[Headshots] Error fetching character:", error);
    res.status(500).json({
      error: "Failed to fetch character",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

router.put("/character/:id", async (req, res) => {
  try {
    console.log("[Headshots] Updating character:", req.params.id);
    const {
      assetId,
      name,
      prompt,
      gender,
      age,
      hairStyle,
      hairLength,
      hairColor,
      highlights,
      facialHair,
      skinTone,
      bodyBuild,
      ...characterData
    } = req.body;
    const characterId = parseInt(req.params.id);

    // Verify character exists and belongs to user
    const existing = await storage.getCharacter(characterId);
    if (!existing || existing.userId !== req.user?.id) {
      return res.status(404).json({error: "Character not found"});
    }

    try {
      // If new image provided, create new character in RenderNet
      if (assetId) {
        console.log(
          "[Headshots] Creating new character in RenderNet with asset:",
          assetId
        );

        // Generate character prompt if not provided
        const characterPrompt =
          prompt ||
          `${gender || existing.gender}, ${age || existing.age} years old, ${hairLength || existing.hairLength} ${hairStyle || existing.hairStyle} ${hairColor || existing.hairColor} hair, with ${skinTone || existing.skinTone} skin tone, ${bodyBuild || existing.bodyBuild} build`;

        // Create new character
        const renderNetChar = await renderNetService.createCharacter(
          name || existing.name,
          assetId,
          characterPrompt
        );

        console.log(
          "[Headshots] New character created in RenderNet:",
          renderNetChar
        );

        // Update character in our database with new RenderNet ID
        const updated = await storage.updateCharacter(characterId, {
          ...characterData,
          renderNetId: renderNetChar.id,
          referenceImage: assetId,
          name: name || existing.name,
          gender: gender || existing.gender,
          age: age || existing.age,
          hairStyle: hairStyle || existing.hairStyle,
          hairLength: hairLength || existing.hairLength,
          hairColor: hairColor || existing.hairColor,
          highlights: highlights || existing.highlights,
          facialHair: facialHair || existing.facialHair,
          skinTone: skinTone || existing.skinTone,
          bodyBuild: bodyBuild || existing.bodyBuild
        });

        console.log("[Headshots] Character updated in database:", updated);
        return res.json(updated);
      }

      // If no new image, just update database fields
      const updated = await storage.updateCharacter(characterId, {
        ...characterData,
        name: name || existing.name,
        gender: gender || existing.gender,
        age: age || existing.age,
        hairStyle: hairStyle || existing.hairStyle,
        hairLength: hairLength || existing.hairLength,
        hairColor: hairColor || existing.hairColor,
        highlights: highlights || existing.highlights,
        facialHair: facialHair || existing.facialHair,
        skinTone: skinTone || existing.skinTone,
        bodyBuild: bodyBuild || existing.bodyBuild
      });

      console.log(
        "[Headshots] Character updated in database (no new image):",
        updated
      );
      res.json(updated);
    } catch (renderNetError: any) {
      console.error("[Headshots] RenderNet operation failed:", renderNetError);
      throw new Error(
        `Failed to update character with RenderNet: ${renderNetError.message}`
      );
    }
  } catch (error) {
    console.error("[Headshots] Error updating character:", error);
    res.status(500).json({
      error: "Failed to update character",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Add new endpoint to get generation status
router.get("/status/:generationId", async (req, res) => {
  try {
    console.log(
      "[Headshots] Checking generation status:",
      req.params.generationId
    );
    const {generationId} = req.params;

    if (!generationId) {
      return res.status(400).json({
        error: "Missing generation ID",
        details: "Generation ID is required"
      });
    }

    // Get status from RenderNet
    const status = await renderNetService.getGenerationStatus(generationId);
    console.log("[Headshots] Generation status:", status);

    // If completed, update headshot request in database
    if (status.status === "completed" || status.status === "failed") {
      try {
        // First find the headshot request by generationId
        const headshots = await storage.getHeadshotRequests(req.user?.id || 0);
        const headshot = headshots.find((h) => h.generationId === generationId);

        if (headshot) {
          const headshotRequest = await storage.updateHeadshotRequest(
            headshot.id,
            {
              status: status.status === "completed" ? "completed" : "failed",
              output: status.url || null,
              error: status.error || null
            }
          );
          console.log("[Headshots] Updated headshot request:", headshotRequest);
        } else {
          console.error(
            "Could not find headshot request with generationId:",
            generationId
          );
        }
      } catch (updateError) {
        console.error("Error updating headshot request:", updateError);
      }
    }

    res.json(status);
  } catch (error) {
    console.error("[Headshots] Error checking generation status:", error);
    res.status(500).json({
      error: "Failed to check generation status",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

router.post("/generate", async (req, res) => {
  try {
    console.log(
      "[Headshots] Starting headshot generation with data:",
      req.body
    );
    const {characterId, options} = req.body;

    if (!characterId || !options) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "characterId and options are required"
      });
    }

    // Check if user has sufficient credits before generation
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be authenticated"
      });
    }

    // Get the character to verify ownership
    const character = await storage.getCharacter(parseInt(characterId));
    if (!character || character.userId !== req.user?.id) {
      return res.status(404).json({
        error: "Character not found",
        details:
          "The requested character does not exist or you don't have access to it"
      });
    }

    try {
      // Call RenderNet to generate the headshot
      console.log("[Headshots] Calling RenderNet generateHeadshot with:", {
        renderNetId: character.renderNetId,
        options: {...options, name: character.name}
      });

      const generation = await renderNetService.generateHeadshot(
        character.renderNetId,
        {...options, name: character.name}
      );

      console.log("[Headshots] RenderNet generation response:", generation);

      // Create headshot request record
      const headshotRequest = await storage.createHeadshotRequest({
        userId: req.user?.id || 0,
        characterId: character.id,
        settingCategory: options.settingCategory,
        setting: options.setting,
        lighting: options.lighting,
        expression: options.expression,
        clothing: options.clothing,
        status: "processing" as const,
        generationId: generation.id,
        referenceImage: character.referenceImage,
        useCustomCharacterPrompt: options.useCustomCharacterPrompt || false,
        customPrompt: options.customPrompt,
        useCustomHeadshotPrompt: options.useCustomHeadshotPrompt || false,
        useCustomNegativePrompt: options.useCustomNegativePrompt || false,
        customNegativePrompt: options.customNegativePrompt,
        modelConfig: undefined
      });

      console.log("[Headshots] Created headshot request:", headshotRequest);

      res.json({
        ...headshotRequest,
        remainingCredits: 999999
      });
    } catch (renderError: any) {
      console.error("[Headshots] RenderNet generation error:", renderError);
      res.status(500).json({
        error: "Failed to generate headshot",
        details:
          renderError instanceof Error
            ? renderError.message
            : "Unknown error occurred"
      });
    }
  } catch (error: any) {
    console.error("[Headshots] Error in generate endpoint:", error);
    res.status(500).json({
      error: "Failed to generate headshot",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Get all characters for current user
router.get("/characters", async (req, res) => {
  try {
    console.log("[Headshots] Getting all characters for user:", req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "User must be authenticated"
      });
    }

    const characters = await storage.getCharactersByUserId(req.user.id);
    res.json(characters);
  } catch (error) {
    console.error("[Headshots] Error fetching characters:", error);
    res.status(500).json({
      error: "Failed to fetch characters",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
