import { z } from "zod";

export const registerSchema = z.object({
  // Step 1 - Email only (no password)
  email: z
    .string()
    .email("Please enter a valid email")
    .transform((email) => email.toLowerCase()),

  // Step 2 - Personal information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().optional(),

  // Step 3 - Company information
  company: z.object({
    companyName: z.string().min(1, "Company name is required"),
    companyWebsite: z
      .string()
      .min(1, "Company website is required")
      .transform((val) => {
        // Normalize the URL by adding https:// if no protocol is present
        if (!val.startsWith("http://") && !val.startsWith("https://")) {
          return `https://${val}`;
        }
        return val;
      })
      .pipe(
        z
          .string()
          .url("Please enter a valid website URL (e.g., https://example.com)")
          .refine(
            (url) => {
              try {
                const urlObj = new URL(url);
                // Ensure the hostname contains at least one dot (domain.tld format)
                return (
                  urlObj.hostname.includes(".") && urlObj.hostname.length > 3
                );
              } catch {
                return false;
              }
            },
            {
              message: "Please enter a valid website URL with a proper domain"
            }
          )
      ),
    companyLogo: z.string().optional(),
    autoJoin: z.boolean(),
    primaryColor: z.string().optional(),
    teamMembers: z.array(z.string()).optional(),
    generatedInvitationToken: z.string().optional(),
    companyId: z.number().optional()
  })
});

export type RegisterFormData = z.infer<typeof registerSchema>;