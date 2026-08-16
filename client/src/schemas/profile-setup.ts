import {z} from "zod";

export const profileSetupSchema = z.object({
  // Step 1: Profile Photo & Background
  profileImage: z.string().optional().nullable(),
  background: z
    .object({
      type: z.enum(["preset", "custom", "banner"]),
      preset: z.string().optional(),
      customUrl: z.string().optional(),
      customBannerId: z.string().optional()
    })
    .optional()
    .nullable(),

  // Step 2: About Me
  bio: z.string().optional(),

  // Step 3: Social Links
  socialLinks: z
    .array(
      z
        .object({
          id: z.string().or(z.number()),
          label: z.string().min(1, "Label is required"),
          url: z.string(), // Allow empty strings for optional fields
          type: z.enum([
            "website",
            "email",
            "phone",
            "linkedin",
            "instagram",
            "custom"
          ]),
          isVisible: z.boolean().optional()
        })
        .superRefine((data, ctx) => {
          const url = data.url.trim();
          const type = data.type;

          // Skip validation if URL is empty (optional fields)
          if (!url) {
            return;
          }

          // Email validation
          if (type === "email") {
            // Remove mailto: prefix if present for validation
            const emailValue = url.replace(/^mailto:/i, "");
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailValue)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid email address",
                path: ["url"]
              });
            }
          }
          // Phone validation
          else if (type === "phone") {
            // Remove tel: prefix if present for validation
            const phoneValue = url.replace(/^tel:/i, "");
            // Phone pattern: allows +, digits, spaces, dashes, parentheses
            const phonePattern = /^[+]?[1-9][\d\s\-()]{7,}$/;
            if (!phonePattern.test(phoneValue)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid phone number",
                path: ["url"]
              });
            }
          }
          // URL validation for website, linkedin, instagram, custom
          else {
            // Remove https:// or http:// prefix if present for validation
            let urlValue = url.replace(/^https?:\/\//i, "");

            // If it doesn't have a protocol and doesn't look like a domain, add https://
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
              urlValue = `https://${urlValue}`;
            } else {
              urlValue = url;
            }

            try {
              new URL(urlValue);
              // Additional check: ensure it has a valid domain structure
              const urlObj = new URL(urlValue);
              if (
                !urlObj.hostname ||
                (!urlObj.hostname.includes(".") &&
                  urlObj.hostname !== "localhost")
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Please enter a valid URL",
                  path: ["url"]
                });
              }
            } catch {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid URL",
                path: ["url"]
              });
            }
          }
        })
    )
    .optional()
    .default([]),

  // Step 4: Quick Actions
  quickActions: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        url: z.string(),
        type: z.enum(["meeting", "chat", "leadgen", "custom", "demo"]),
        icon: z.string().optional(),
        settings: z.record(z.any()).optional()
      })
    )
    .optional()
    .default([]),

  // Step 5: Resources
  resources: z
    .array(
      z
        .object({
          id: z.string(),
          title: z.string().min(1, "Title is required"),
          description: z.string().optional(),
          type: z.enum(["pdf", "url", "image", "other"]),
          url: z.string(),
          thumbnail: z.string().optional()
        })
        .superRefine((data, ctx) => {
          const url = data.url.trim();
          // Skip validation if URL is empty (optional fields)
          if (!url) {
            return;
          }
          // Validate URL format
          try {
            const urlValue = url.startsWith("http") ? url : `https://${url}`;
            new URL(urlValue);
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please enter a valid URL",
              path: ["url"]
            });
          }
        })
    )
    .optional()
    .default([]),

  // Step 6: Announcements
  announcements: z
    .array(
      z
        .object({
          id: z.string(),
          title: z.string().min(1, "Title is required"),
          description: z.string().optional(),
          buttonText: z.string().optional(),
          buttonLink: z.string(),
          backgroundColor: z
            .enum(["white", "gray", "brand", "custom"])
            .optional(),
          customBackgroundColor: z.string().optional(),
          buttonColor: z.enum(["brand", "white", "black", "custom"]).optional(),
          customButtonColor: z.string().optional(),
          template: z
            .enum(["text-only", "text-with-icon", "image-inset"])
            .optional(),
          image: z.string().optional()
        })
        .superRefine((data, ctx) => {
          const buttonLink = data.buttonLink?.trim();
          // Skip validation if buttonLink is empty (optional)
          if (!buttonLink) {
            return;
          }
          // Validate URL format
          try {
            const urlValue = buttonLink.startsWith("http")
              ? buttonLink
              : `https://${buttonLink}`;
            new URL(urlValue);
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please enter a valid URL",
              path: ["buttonLink"]
            });
          }
        })
    )
    .optional()
    .default([]),

  // Step 7: Embed
  embeds: z
    .array(
      z
        .object({
          id: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          embedUrl: z.string(),
          embedType: z
            .enum(["video", "presentation", "webpage", "document", "other"])
            .optional(),
          embedCode: z.string().optional()
        })
        .superRefine((data, ctx) => {
          const embedUrl = data.embedUrl.trim();
          // Skip validation if embedUrl is empty (optional fields)
          if (!embedUrl) {
            return;
          }
          // Validate URL format
          try {
            const urlValue = embedUrl.startsWith("http")
              ? embedUrl
              : `https://${embedUrl}`;
            new URL(urlValue);
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please enter a valid URL",
              path: ["embedUrl"]
            });
          }
        })
    )
    .optional()
    .default([])
});

export type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;
