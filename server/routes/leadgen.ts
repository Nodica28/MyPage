import express, {Request, Response, Express} from "express";
import {z} from "zod";
import {asyncHandler} from "../utils/error-handler";
import {db} from "../db";
import {leads, users, type InsertLead} from "../../shared/schema";
import {eq, sql} from "drizzle-orm";
import {DEFAULT_LEAD_SETTINGS} from "../../shared/types/lead";
import {v4 as uuidv4} from "uuid";
import {
  sendLeadNotificationEmail,
  sendLeadInquiryResponseEmail
} from "../services/mailtrap-email";
import multer from "multer";

// Define basic interfaces for lead data
interface Tag {
  id: string;
  label: string;
  color?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

const router = express.Router();

// Configure multer for file uploads
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Define the structure for enhanced form data
const formFieldSchema = z.object({
  value: z.string(),
  type: z.string(),
  label: z.string()
});

/**
 * POST /api/leadgen/send
 * Submit a new lead from a badge profile form and send confirmation emails
 */
router.post("/send", async (req, res) => {
  try {
    console.log("[LeadGen API] Received lead submission:", req.body);

    // Validate the request body
    const validationResult = z
      .object({
        actionId: z.string(),
        formData: z.record(formFieldSchema),
        fromQr: z.boolean().optional(),
        userId: z.union([z.number(), z.string()]).optional(),
        userEmail: z.string().optional() // Add userEmail for profile owner identification
      })
      .safeParse(req.body);

    if (!validationResult.success) {
      console.error("[LeadGen API] Validation error:", validationResult.error);
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors
      });
    }

    const {actionId, formData, fromQr, userEmail} = validationResult.data;

    // Determine userId - use from request body directly if available
    let userId: number;
    let userRecord = null;

    // Check if userId was passed from frontend
    if (req.body.userId && !isNaN(parseInt(req.body.userId))) {
      userId = parseInt(req.body.userId);
      console.log(`[LeadGen API] Using userId passed from frontend: ${userId}`);
    } else if (userEmail) {
      // Find user by email (for public profile submissions)
      console.log(`[LeadGen API] Finding user by email: ${userEmail}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail.toLowerCase()));

      if (user) {
        userRecord = user;
        userId = user.id;
        console.log(`[LeadGen API] Found user by email: ${userId}`);
      } else {
        console.log(`[LeadGen API] User with email ${userEmail} not found`);
        return res.status(400).json({
          error: "Profile owner not found"
        });
      }
    } else {
      // Extract user ID from the action ID as fallback
      // Handle formats: "user-{userId}", "lead-form", "action-leadgen-default"
      const userIdMatch = actionId.match(/user-(\d+)/);

      if (userIdMatch) {
        // Format: user-{userId}
        userId = parseInt(userIdMatch[1], 10);
      } else if (
        actionId === "lead-form" ||
        actionId === "action-leadgen-default"
      ) {
        // Format: lead-form or action-leadgen-default
        // If authenticated, use the current user's ID
        if (req.isAuthenticated() && req.user && req.user.id) {
          userId = req.user.id;
        } else {
          // For production, use the real user's ID instead of a default
          // Use ID 40 which corresponds to the production user
          userId = 40;
          console.log(
            "[LeadGen API] Using real user ID for public submission:",
            userId
          );
        }
      } else {
        return res.status(400).json({
          error: "Invalid action ID format or missing user identification"
        });
      }
    }

    // Get user record if we don't have it yet
    if (!userRecord) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (user) {
        userRecord = user;
      } else {
        console.log(
          `[LeadGen API] User with ID ${userId} not found. Trying with user ID 40 instead.`
        );
        // Try again with user ID 40 (production user)
        const [productionUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, 40));

        if (productionUser) {
          // Use the production user
          userRecord = productionUser;
          userId = 40;
          console.log(
            "[LeadGen API] Successfully using production user (ID 40) for public submission"
          );
        } else {
          // If production user not found, create a default response
          console.error(
            "[LeadGen API] Production user (ID 40) not found either. Creating default response."
          );
          return res.status(201).json({
            success: true,
            message: "Form submitted successfully",
            lead: {
              id: 0,
              formData: req.body.formData || {},
              tags: [],
              notes: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              fromQr: fromQr === true,
              downloadVcard: true // Default to true for public submissions
            }
          });
        }
      }
    }

    // Get lead settings from user settings
    const userSettings = userRecord?.settings || {};
    const leadSettings = userSettings.leadSettings || DEFAULT_LEAD_SETTINGS;

    // Map generic field IDs to actual field IDs based on user's lead settings
    const mapFormDataToUserFields = (
      incomingFormData: Record<
        string,
        {value: string; type: string; label: string}
      >,
      userFields: any[]
    ) => {
      const mappedFormData: Record<
        string,
        {value: string; type: string; label: string}
      > = {};

      // Convert incoming field IDs to an array and sort them to ensure consistent mapping
      const incomingFields = Object.keys(incomingFormData).sort();

      // Map each incoming field to the corresponding user field based on order
      incomingFields.forEach((incomingFieldId, index) => {
        if (index < userFields.length) {
          const userField = userFields[index];
          const incomingField = incomingFormData[incomingFieldId];

          // Use the user's field ID instead of the generic one
          mappedFormData[userField.id] = {
            value: incomingField.value,
            type: userField.type, // Use the user's configured type
            label: userField.label // Use the user's configured label
          };

          console.log(
            `[LeadGen API] Mapped ${incomingFieldId} -> ${userField.id}: ${incomingField.value}`
          );
        }
      });

      return mappedFormData;
    };

    // Apply the mapping if we have user lead settings
    let mappedFormData = formData;
    if (leadSettings.fields && Array.isArray(leadSettings.fields)) {
      mappedFormData = mapFormDataToUserFields(formData, leadSettings.fields);
      console.log("[LeadGen API] Original formData:", formData);
      console.log("[LeadGen API] Mapped formData:", mappedFormData);
    }

    // Save lead to database with mapped data
    const now = new Date();
    const newLead: InsertLead = {
      userId,
      actionId,
      formData: mappedFormData, // Use mapped data instead of original
      tags: [],
      notes: [],
      fromQr: fromQr === true ? "true" : "false",
      ip: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      createdAt: now,
      updatedAt: now
    };

    const [savedLead] = await db.insert(leads).values(newLead).returning();

    // Send email notifications
    try {
      // 1. Send notification email to profile owner if enabled
      if (leadSettings.notifyEmail && userRecord?.email) {
        console.log(
          `[LeadGen API] Sending notification email to profile owner: ${userRecord.email}`
        );
        await sendLeadNotificationEmail(userRecord.email, mappedFormData); // Use mapped data
      }

      // 2. Send thank you email to the lead (extract email addresses from mapped form data)
      const emailList: string[] = [];
      Object.values(mappedFormData).forEach((field) => {
        if (
          field.type === "email" &&
          field.value &&
          !emailList.includes(field.value)
        ) {
          emailList.push(field.value);
        }
      });

      if (emailList.length > 0) {
        console.log(
          `[LeadGen API] Sending thank you email to lead: ${emailList.join(", ")}`
        );
        await sendLeadInquiryResponseEmail(emailList, mappedFormData); // Use mapped data
      }

      console.log("[LeadGen API] All emails sent successfully via Mailtrap");
    } catch (emailError) {
      // Log email errors but don't fail the request
      console.error("[LeadGen API] Error sending emails:", emailError);
    }

    // Return success response with lead data
    return res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      lead: {
        id: savedLead.id,
        formData: savedLead.formData,
        tags: savedLead.tags,
        notes: savedLead.notes,
        createdAt: savedLead.createdAt,
        updatedAt: savedLead.updatedAt,
        fromQr: savedLead.fromQr === "true",
        downloadVcard: leadSettings.downloadVcard
      }
    });
  } catch (error) {
    console.error("[LeadGen API] Error processing lead submission:", error);
    return res.status(500).json({
      error: "Failed to process lead submission",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/leadgen/leads
 * Get leads for the authenticated user with pagination
 */
router.get(
  "/leads",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const totalCountResult = await db
        .select({count: sql`count(*)`})
        .from(leads)
        .where(eq(leads.userId, userId));

      const totalCount = Number(totalCountResult[0].count);

      // Get leads with pagination
      const userLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.userId, userId))
        .orderBy(sql`leads.created_at DESC`)
        .limit(limit)
        .offset(offset);

      // Sort manually to display newest first
      userLeads.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // Sort in descending order (newest first)
      });

      // Format leads for the response
      const formattedLeads = userLeads.map((lead) => ({
        id: lead.id.toString(),
        formData: lead.formData,
        tags: lead.tags || [],
        notes: lead.notes || [],
        createdAt: lead.createdAt
          ? lead.createdAt.toISOString()
          : new Date().toISOString(),
        updatedAt: lead.updatedAt
          ? lead.updatedAt.toISOString()
          : new Date().toISOString(),
        fromQr: lead.fromQr === "true"
      }));

      res.json({
        leads: formattedLeads,
        meta: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("[LeadGen API] Error fetching leads:", error);
      res.status(500).json({
        error: "Failed to fetch leads",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * POST /api/leadgen/leads/:leadId/tags
 * Add a tag to a lead
 */
router.post(
  "/leads/:leadId/tags",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const leadId = parseInt(req.params.leadId);
      const {label, color} = req.body;

      if (!label) {
        return res.status(400).json({error: "Tag label is required"});
      }

      // Get the lead
      const leadResult = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId));

      const lead = leadResult.find((l) => l.userId === userId);

      if (!lead) {
        return res.status(404).json({error: "Lead not found"});
      }

      // Create a new tag
      const tagId = uuidv4();
      const newTag: Tag = {
        id: tagId,
        label,
        color: color || "#3b82f6" // Default color if not provided
      };

      // Add tag to the lead
      const currentTags = Array.isArray(lead.tags) ? (lead.tags as Tag[]) : [];
      const updatedTags = [...currentTags, newTag];

      // Update the lead
      await db
        .update(leads)
        .set({
          tags: updatedTags,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      res.status(201).json(newTag);
    } catch (error) {
      console.error("[LeadGen API] Error adding tag:", error);
      res.status(500).json({
        error: "Failed to add tag",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * DELETE /api/leadgen/leads/:leadId/tags/:tagId
 * Remove a tag from a lead
 */
router.delete(
  "/leads/:leadId/tags/:tagId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const leadId = parseInt(req.params.leadId);
      const tagId = req.params.tagId;

      // Get the lead
      const leadResult = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId));

      const lead = leadResult.find((l) => l.userId === userId);

      if (!lead) {
        return res.status(404).json({error: "Lead not found"});
      }

      // Remove tag from the lead
      const currentTags = Array.isArray(lead.tags) ? (lead.tags as Tag[]) : [];
      const updatedTags = currentTags.filter((tag) => tag.id !== tagId);

      // Update the lead
      await db
        .update(leads)
        .set({
          tags: updatedTags,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      res.status(200).json({success: true});
    } catch (error) {
      console.error("[LeadGen API] Error removing tag:", error);
      res.status(500).json({
        error: "Failed to remove tag",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * POST /api/leadgen/leads/:leadId/notes
 * Add a note to a lead
 */
router.post(
  "/leads/:leadId/notes",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const leadId = parseInt(req.params.leadId);
      const {content} = req.body;

      if (!content) {
        return res.status(400).json({error: "Note content is required"});
      }

      // Get the lead
      const leadResult = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId));

      const lead = leadResult.find((l) => l.userId === userId);

      if (!lead) {
        return res.status(404).json({error: "Lead not found"});
      }

      // Create a new note
      const noteId = uuidv4();
      const now = new Date().toISOString();
      const newNote: Note = {
        id: noteId,
        content,
        createdAt: now
      };

      // Add note to the lead
      const currentNotes = Array.isArray(lead.notes)
        ? (lead.notes as Note[])
        : [];
      const updatedNotes = [...currentNotes, newNote];

      // Update the lead
      await db
        .update(leads)
        .set({
          notes: updatedNotes,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      res.status(201).json(newNote);
    } catch (error) {
      console.error("[LeadGen API] Error adding note:", error);
      res.status(500).json({
        error: "Failed to add note",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * DELETE /api/leadgen/leads/:leadId
 * Delete a lead
 */
router.delete(
  "/leads/:leadId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const leadId = parseInt(req.params.leadId);

      // First verify the lead exists and belongs to the user
      const leadResult = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId));

      const lead = leadResult.find((l) => l.userId === userId);

      if (!lead) {
        return res.status(404).json({error: "Lead not found"});
      }

      // Delete the lead
      await db.delete(leads).where(eq(leads.id, leadId));

      res.status(200).json({success: true});
    } catch (error) {
      console.error("[LeadGen API] Error deleting lead:", error);
      res.status(500).json({
        error: "Failed to delete lead",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * POST /api/leadgen/import-leads
 * Import multiple leads from uploaded images or manual entry
 */
router.post(
  "/import-leads",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      const userId = req.user.id;
      const leadsToImport = req.body.leads;

      // Validate the request
      if (
        !leadsToImport ||
        !Array.isArray(leadsToImport) ||
        leadsToImport.length === 0
      ) {
        return res.status(400).json({
          error: "Invalid request data",
          details: "Leads array is required and must not be empty"
        });
      }

      console.log(
        `[LeadGen API] Importing ${leadsToImport.length} leads for user ${userId}`
      );

      // Process each lead
      const importedLeads = [];
      const failedImports = [];
      const now = new Date();

      for (const lead of leadsToImport) {
        try {
          // Validate lead has required fields
          if (!lead.formData || typeof lead.formData !== "object") {
            throw new Error("Lead is missing required formData object");
          }

          // Create a new lead record
          const newLead: InsertLead = {
            userId,
            actionId: lead.actionId || "imported-lead",
            formData: lead.formData,
            tags: lead.tags || [],
            notes: lead.notes || [],
            fromQr: "false", // Imported leads are not from QR codes
            ip: req.ip || null,
            userAgent: req.headers["user-agent"] || null,
            createdAt: lead.createdAt ? new Date(lead.createdAt) : now,
            updatedAt: now
          };

          // Insert the lead into the database
          const [savedLead] = await db
            .insert(leads)
            .values(newLead)
            .returning();

          // Format the saved lead for the response
          const formattedLead = {
            id: savedLead.id.toString(),
            formData: savedLead.formData,
            tags: savedLead.tags || [],
            notes: savedLead.notes || [],
            createdAt: savedLead.createdAt
              ? savedLead.createdAt.toISOString()
              : now.toISOString(),
            updatedAt: savedLead.updatedAt
              ? savedLead.updatedAt.toISOString()
              : now.toISOString()
          };

          importedLeads.push(formattedLead);
        } catch (error) {
          console.error("[LeadGen API] Error importing lead:", error);
          failedImports.push({
            lead,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Return results
      res.status(200).json({
        success: true,
        imported: importedLeads.length,
        failed: failedImports.length,
        leads: importedLeads,
        failures: failedImports
      });
    } catch (error) {
      console.error("[LeadGen API] Error importing leads:", error);
      res.status(500).json({
        error: "Failed to import leads",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

/**
 * POST /api/leadgen/upload-images
 * Upload images of business cards and use ChatGPT to extract lead information
 */
router.post(
  "/upload-images",
  upload.array("images", 10), // Accept up to 10 images
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({error: "Not authenticated"});
      }

      // Access uploaded files through multer
      const uploadedFiles = req.files as Express.Multer.File[];

      // Check if files exist
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({error: "No files were uploaded"});
      }

      if (!req.body.leadFields) {
        return res
          .status(400)
          .json({error: "No 'leadFields' field found in uploaded files"});
      }

      // Parse leadFields and ensure it's in a format OpenAI can understand
      const leadFields = JSON.parse(req.body.leadFields);
      // Format leadFields into a clear instruction
      const fieldsInstructions = Array.isArray(leadFields)
        ? leadFields
            .map((field) => `${field.label} (as "${field.id}")`)
            .join(", ")
        : "name, email, phone, company";

      console.log("[LeadGen API] Fields to extract:", fieldsInstructions);

      const userId = req.user.id;

      console.log(
        `[LeadGen API] Processing ${uploadedFiles.length} images for user ${userId}`
      );

      // Array to store extracted leads
      const extractedLeads = [];
      const failedImages = [];

      for (const image of uploadedFiles) {
        try {
          // Get base64 data from multer file
          const base64Image = image.buffer.toString("base64");

          // Call OpenAI API to analyze the image
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (!openaiApiKey) {
            throw new Error("OpenAI API key not configured");
          }

          const openaiResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiApiKey}`
              },
              body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `Analyze this image of a business card and extract ONLY the following information: ${fieldsInstructions}. 

Return your response as a simple JSON object with the exact field IDs as keys. Follow this format exactly: 
{"field_id_1": "value1", "field_id_2": "value2"}

Important rules:
1. Use ONLY the field IDs shown in parentheses
2. Do NOT add markdown code blocks or any extra text
3. Do NOT include explanations or apologies
4. Return ONLY valid JSON that can be parsed with JSON.parse()
5. If you cannot identify a field, include it with an empty string: "field_id": ""
6. Do NOT use fields that weren't requested`
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: `data:${image.mimetype};base64,${base64Image}`
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 1000,
                temperature: 0.1 // Low temperature for more deterministic responses
              })
            }
          );

          if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
          }

          const jsonResponse = await openaiResponse.json();

          // Validate OpenAI response structure
          if (
            !jsonResponse.choices ||
            !jsonResponse.choices[0] ||
            !jsonResponse.choices[0].message
          ) {
            throw new Error("Invalid OpenAI API response structure");
          }

          const responseContent = jsonResponse.choices[0].message.content;

          // Validate response content exists
          if (!responseContent) {
            throw new Error("Empty response from OpenAI API");
          }

          console.log(
            "[LeadGen API] OpenAI response content:",
            responseContent.substring(0, 200) +
              (responseContent.length > 200 ? "..." : "")
          );

          // Parse the JSON response from GPT
          let extractedData: Record<string, string> = {};
          try {
            // Try to parse the response as JSON
            extractedData = JSON.parse(responseContent);
          } catch (error) {
            console.log("Initial JSON parsing failed:", error);
            console.log("Response content:", responseContent);

            // If parsing fails, try various extraction methods
            try {
              // Method 1: Check for markdown code blocks
              let match = responseContent.match(
                /```(?:json)?\s*([\s\S]*?)\s*```/
              );
              if (match && match[1]) {
                extractedData = JSON.parse(match[1]);
              }
              // Method 2: Look for anything that looks like a JSON object
              else {
                match = responseContent.match(/\{[\s\S]*?\}/);
                if (match) {
                  extractedData = JSON.parse(match[0]);
                }
                // Method 3: If response contains "sorry" or apologies, create empty object
                else if (
                  responseContent.toLowerCase().includes("sorry") ||
                  responseContent.toLowerCase().includes("apologize")
                ) {
                  console.log("Model apologized instead of providing JSON");
                  extractedData = {};
                }
                // Method 4: Try to extract key-value pairs from text
                else {
                  console.log(
                    "Attempting to extract key-value pairs from text"
                  );
                  // Look for patterns like "Name: John Smith" or "Email: john@example.com"
                  const lines = responseContent.split("\n");
                  for (const line of lines) {
                    const kvMatch = line.match(/([a-zA-Z]+):\s*(.+)/);
                    if (kvMatch) {
                      const [, key, value] = kvMatch;
                      extractedData[key.toLowerCase()] = value.trim();
                    }
                  }
                }
              }
            } catch (extractError) {
              console.log(
                "Failed to extract JSON from various methods:",
                extractError
              );
              console.log(
                "Full response content for debugging:",
                responseContent
              );
              // Provide empty object as fallback
              extractedData = {};
            }
          }

          // Final validation of extracted data
          console.log("[LeadGen API] Final extracted data:", extractedData);
          console.log(
            "[LeadGen API] Extracted data type:",
            typeof extractedData
          );
          console.log(
            "[LeadGen API] Is extractedData an object?",
            extractedData && typeof extractedData === "object"
          );

          // Create lead record from extracted data
          const formData: Record<
            string,
            {value: string; type: string; label: string}
          > = {};

          // Create a mapping of field IDs to their types and labels
          const fieldMap = Array.isArray(leadFields)
            ? leadFields.reduce(
                (map, field) => {
                  map[field.id] = {type: field.type, label: field.label};
                  return map;
                },
                {} as Record<string, {type: string; label: string}>
              )
            : {};

          // Ensure extractedData is a valid object before processing
          if (!extractedData || typeof extractedData !== "object") {
            console.log(
              "[LeadGen API] Warning: extractedData is not a valid object, setting to empty object"
            );
            extractedData = {};
          }

          // Add each field from the extracted data
          for (const [key, value] of Object.entries(extractedData)) {
            // Only include fields that have values
            if (value) {
              // Use the field ID as is - it should match what we sent to OpenAI
              const fieldId = key.trim();

              // If we have this field in our map, use those type/label values
              if (fieldMap[fieldId]) {
                formData[fieldId] = {
                  value: String(value),
                  type: fieldMap[fieldId].type,
                  label: fieldMap[fieldId].label
                };
              } else {
                // Determine field type - default to text for most fields
                let fieldType = "text";
                if (key === "email") fieldType = "email";
                if (key === "phone") fieldType = "phone";
                if (key.includes("notes") || key.includes("interests"))
                  fieldType = "textarea";

                formData[fieldId] = {
                  value: String(value),
                  type: fieldType,
                  label: key.charAt(0).toUpperCase() + key.slice(1)
                };
              }
            }
          }

          // Create a lead object with the extracted data
          const lead = {
            id: uuidv4(),
            formData: formData
          };

          // Log if we couldn't extract any data
          if (Object.keys(formData).length === 0) {
            console.log(
              "[LeadGen API] Warning: Failed to extract any data from the image"
            );
            console.log(
              "[LeadGen API] Response was:",
              responseContent.substring(0, 200) +
                (responseContent.length > 200 ? "..." : "")
            );
          }

          extractedLeads.push(lead);
        } catch (error) {
          console.error(
            `[LeadGen API] Error processing image ${image.originalname}:`,
            error
          );
          failedImages.push({
            name: image.originalname,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      // Return the results
      res.status(200).json({
        success: true,
        processed: extractedLeads.length,
        failed: failedImages.length,
        leads: extractedLeads,
        failures: failedImages
      });
    } catch (error) {
      console.error("[LeadGen API] Error processing images:", error);
      res.status(500).json({
        error: "Failed to process images",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })
);

export default router;
