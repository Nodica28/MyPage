import {MailtrapClient} from "mailtrap";
import fs from "node:fs";
import path from "node:path";
import {db} from "../db";
import {users} from "@shared/schema";
import {eq} from "drizzle-orm";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface TemplateEmailOptions {
  to: string | string[];
  templateUuid: string;
  templateVariables: Record<string, string>;
  from?: string;
}

export interface MagicLinkEmailOptions {
  to: string;
  token: string;
  appUrl: string;
}

/**
 * Configures and returns a Mailtrap client based on environment
 */
function getMailtrapClient() {
  const token = process.env.MAILTRAP_TOKEN;

  if (!token) {
    throw new Error("MAILTRAP_TOKEN environment variable is required");
  }

  return new MailtrapClient({
    token: token
  });
}

/**
 * Gets the default sender information
 */
function getDefaultSender() {
  return {
    email: process.env.EMAIL_FROM || "hello@withbadge.ai",
    name: process.env.EMAIL_FROM_NAME || "Badge AI"
  };
}

/**
 * Converts email addresses to Mailtrap recipient format
 */
function formatRecipients(to: string | string[]) {
  const emails = Array.isArray(to) ? to : [to];
  return emails.map((email) => ({email}));
}

/**
 * Normalizes and deduplicates recipient emails
 */
function normalizeRecipientEmails(to: string | string[]): string[] {
  const emails = Array.isArray(to) ? to : [to];
  const normalized = emails
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => e.length > 0);
  return Array.from(new Set(normalized));
}

/**
 * Optionally sync recipients to Mailtrap Contacts for marketing use.
 *
 * Two modes:
 * 1) If MAILTRAP_ACCOUNT_ID and MAILTRAP_TOKEN are set, create contacts via
 *    Mailtrap API v2 (Create Contact), optionally assigning to list IDs from
 *    MAILTRAP_CONTACT_LIST_IDS (comma-separated). See docs:
 *    https://api-docs.mailtrap.io/docs/mailtrap-api-docs/7d76bbcbcf6e3-create-a-new-contact
 * 2) Otherwise, append emails to uploads/mailtrap-contacts.csv for manual import.
 *
 * @param to - Email address(es) to sync
 * @param emailToUserMap - Optional map of email to user info (for beta tester status)
 */
export async function syncRecipientsToContacts(
  to: string | string[],
  emailToUserMap?: Map<string, {isBetaTester: boolean}>
): Promise<void> {
  const emails = normalizeRecipientEmails(to);
  if (emails.length === 0) return;

  const accountId = process.env.MAILTRAP_ACCOUNT_ID;
  const token = process.env.MAILTRAP_TOKEN;
  const listIdsEnv = process.env.MAILTRAP_CONTACT_LIST_IDS || "";
  const listIds = listIdsEnv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  // If API creds present, create contacts in Mailtrap
  if (accountId && token) {
    try {
      let createdCount = 0;
      for (const email of emails) {
        // Get beta tester status from map or look up in database
        let isBetaTester = false;
        const userInfo = emailToUserMap?.get(email);
        if (userInfo) {
          isBetaTester = userInfo.isBetaTester;
        } else {
          // Look up user in database if not provided in map
          try {
            const [user] = await db
              .select({isBetaTester: users.isBetaTester})
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
            if (user) {
              isBetaTester = user.isBetaTester ?? false;
            }
          } catch (dbError) {
            // Non-fatal: if we can't look up user, just use false
            console.warn(
              `[Mailtrap Contacts] Could not look up user for ${email}:`,
              dbError
            );
          }
        }

        // Build contact fields with beta tester status
        const contactFields: Record<string, string | boolean> = {};
        if (isBetaTester !== undefined) {
          contactFields.is_beta_tester = isBetaTester;
        }

        // Build contact payload - only include fields if it has values
        const contactPayload: {
          email: string;
          fields?: Record<string, string | boolean>;
          list_ids?: number[];
        } = {
          email
        };

        // Only include fields if it has values (Mailtrap API best practice)
        if (Object.keys(contactFields).length > 0) {
          contactPayload.fields = contactFields;
        }

        // Only include list_ids if provided
        if (listIds.length > 0) {
          contactPayload.list_ids = listIds;
        }

        const res = await fetch(
          `https://mailtrap.io/api/accounts/${accountId}/contacts`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "Api-Token": token
            },
            body: JSON.stringify({
              contact: contactPayload
            })
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "<no body>");
          // Treat already-exists as non-fatal (422/409 depending on API)
          if (res.status === 409 || res.status === 422) {
            console.warn(
              `[Mailtrap Contacts] Contact already exists for ${email}: ${res.status} ${text}`
            );
            continue;
          }
          console.warn(
            `[Mailtrap Contacts] Failed to create contact for ${email}: ${res.status} ${text}`
          );
          continue;
        }
        createdCount += 1;
      }

      console.log(
        `[Mailtrap Contacts] Created/ensured ${emails.length} recipient(s) (created: ${createdCount})`
      );
      return;
    } catch (e) {
      console.warn("[Mailtrap Contacts] Error creating contacts via API", e);
      // Fall through to CSV append
    }
  }

  // Fallback: append to CSV for manual import in Mailtrap portal
  try {
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, {recursive: true});
    }
    const csvPath = path.join(uploadsDir, "mailtrap-contacts.csv");
    const exists = fs.existsSync(csvPath);
    const lines: string[] = [];
    if (!exists) {
      lines.push("email,source,first_name,last_name,is_beta_tester");
    }
    for (const email of emails) {
      // Get beta tester status for CSV
      let isBetaTester = false;
      const userInfo = emailToUserMap?.get(email);
      if (userInfo) {
        isBetaTester = userInfo.isBetaTester;
      } else {
        // Look up user in database if not provided in map
        try {
          const [user] = await db
            .select({isBetaTester: users.isBetaTester})
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (user) {
            isBetaTester = user.isBetaTester ?? false;
          }
        } catch {
          // Non-fatal: if we can't look up user, just use false
        }
      }
      lines.push(`${email},server-send,,,${isBetaTester}`);
    }
    fs.appendFileSync(csvPath, lines.join("\n") + "\n", {encoding: "utf8"});
    console.log(
      `[Mailtrap Contacts] Appended ${emails.length} recipient(s) to ${csvPath}`
    );
  } catch (e) {
    console.warn("[Mailtrap Contacts] Failed to append contacts CSV", e);
  }
}

/**
 * Sends an email using Mailtrap with custom HTML content
 */
export async function sendMail(options: EmailOptions): Promise<void> {
  const {to, subject, text, html, from} = options;

  console.log("Sending email via Mailtrap:");
  console.log("- To:", to);
  console.log("- Subject:", subject);

  try {
    const client = getMailtrapClient();
    const sender = from ? {email: from, name: "Badge AI"} : getDefaultSender();
    const recipients = formatRecipients(to);

    // Send the email using Mailtrap's send API
    const response = await client.send({
      from: sender,
      to: recipients,
      subject,
      text,
      html
    });

    console.log(
      "Email sent successfully via Mailtrap. Message IDs:",
      response.message_ids
    );
    // Best-effort contacts sync (non-blocking failures handled inside)
    await syncRecipientsToContacts(to);
  } catch (error: unknown) {
    console.error("Failed to send email via Mailtrap:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // In development mode, don't fail the request if email fails
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test"
    ) {
      console.warn(
        "Running in development mode - continuing despite email failure"
      );
      console.warn("Email that would have been sent:", {to, subject, text});
      return; // Don't throw in development
    }

    throw new Error(`Failed to send email via Mailtrap: ${errorMessage}`);
  }
}

/**
 * Sends an email using Mailtrap templates
 */
export async function sendTemplateEmail(
  options: TemplateEmailOptions
): Promise<void> {
  const {to, templateUuid, templateVariables, from} = options;

  console.log("Sending template email via Mailtrap:");
  console.log("- To:", to);
  console.log("- Template:", templateUuid);

  try {
    const client = getMailtrapClient();
    const sender = from ? {email: from, name: "Badge AI"} : getDefaultSender();
    const recipients = formatRecipients(to);

    // Send the email using Mailtrap's send API with template
    const response = await client.send({
      from: sender,
      to: recipients,
      template_uuid: templateUuid,
      template_variables: templateVariables
    });

    console.log(
      "Template email sent successfully via Mailtrap. Message IDs:",
      response.message_ids
    );
    // Best-effort contacts sync (non-blocking failures handled inside)
    await syncRecipientsToContacts(to);
  } catch (error: unknown) {
    console.error("Failed to send template email via Mailtrap:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // In development mode, don't fail the request if email fails
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test"
    ) {
      console.warn(
        "Running in development mode - continuing despite email failure"
      );
      console.warn("Template email that would have been sent:", {
        to,
        templateUuid,
        templateVariables
      });
      return; // Don't throw in development
    }

    throw new Error(
      `Failed to send template email via Mailtrap: ${errorMessage}`
    );
  }
}

/**
 * Sends a magic link email for passwordless authentication using Mailtrap templates
 */
export async function sendMagicLinkEmail({
  to,
  token,
  appUrl
}: MagicLinkEmailOptions): Promise<void> {
  const magicLinkTemplateUuid = process.env.MAILTRAP_MAGIC_LINK_TEMPLATE;

  if (!magicLinkTemplateUuid) {
    throw new Error(
      "MAILTRAP_MAGIC_LINK_TEMPLATE environment variable is required"
    );
  }

  const loginLink = `${appUrl}/api/auth/magic-link/verify?token=${token}`;

  await sendTemplateEmail({
    to,
    templateUuid: magicLinkTemplateUuid,
    templateVariables: {
      login_link: loginLink,
      user_email: to,
      app_name: "Badge AI",
      company_name: "Badge AI"
    }
  });

  // Only sync to Mailtrap contacts if the user exists in the database
  try {
    const normalizedEmail = to.toLowerCase().trim();
    const [user] = await db
      .select({id: users.id})
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (user) {
      // User exists - sync to Mailtrap contacts (non-blocking failures handled inside)
      await syncRecipientsToContacts(to);
    } else {
      console.log(
        `[Mailtrap Contacts] Skipping contact sync for ${normalizedEmail} - user not found in database`
      );
    }
  } catch (error) {
    // Non-fatal - log but don't fail email sending
    console.warn(
      `[Mailtrap Contacts] Error checking user existence for ${to}:`,
      error
    );
  }
}

/**
 * Send lead notification email using Mailtrap templates
 */
export async function sendLeadNotificationEmail(
  userEmail: string,
  formData: Record<string, {value: string; type: string; label: string}>
): Promise<void> {
  const leadNotificationTemplateUuid =
    process.env.MAILTRAP_LEAD_NOTIFICATION_TEMPLATE;

  if (!leadNotificationTemplateUuid) {
    throw new Error(
      "MAILTRAP_LEAD_NOTIFICATION_TEMPLATE environment variable is required"
    );
  }

  // Convert form data to template variables
  const templateVariables: Record<string, string> = {
    submitted_by: formData.email.value,
    app_url: process.env.APP_URL || "https://app.withbadge.ai/",
    company_name: "Badge AI"
  };

  // Add form fields as variables (up to 10 fields)
  const formFields = Object.entries(formData);

  // Initialize all field variables as empty strings first
  for (let i = 1; i <= 10; i++) {
    templateVariables[`field_${i}_label`] = "";
    templateVariables[`field_${i}_value`] = "";
  }

  // Initialize additional fields
  templateVariables["additional_fields"] = "";

  // Handle first 10 fields as individual template variables
  const additionalFields: Array<{label: string; value: string}> = [];

  formFields.forEach(([, field], index) => {
    if (index < 10) {
      // First 10 fields go to individual template variables
      const fieldNumber = index + 1;
      templateVariables[`field_${fieldNumber}_label`] = field.label;
      templateVariables[`field_${fieldNumber}_value`] =
        formatFieldValueForTemplate(field);
    } else {
      // Fields 11+ go to additional fields array
      additionalFields.push({
        label: field.label,
        value: formatFieldValueForTemplate(field)
      });
    }
  });

  // If there are additional fields, format them as HTML
  if (additionalFields.length > 0) {
    console.log(
      `[Mailtrap] Form has ${formFields.length} fields, ${additionalFields.length} will be in additional fields section`
    );

    const additionalFieldsHtml = additionalFields
      .map(
        (field) => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">${field.label}</div>
          <div style="color: #1F2937;">${field.value}</div>
        </div>
      `
      )
      .join("");

    templateVariables["additional_fields"] = additionalFieldsHtml;
  }

  console.log(
    "[Mailtrap] Sending lead notification template email with variables:",
    {
      userEmail,
      fieldsCount: formFields.length,
      individualFields: Math.min(formFields.length, 10),
      additionalFields: additionalFields.length,
      hasAdditionalFields: additionalFields.length > 0
    }
  );

  await sendTemplateEmail({
    to: userEmail,
    templateUuid: leadNotificationTemplateUuid,
    templateVariables
  });
  // Best-effort contacts sync (non-blocking failures handled inside)
  await syncRecipientsToContacts(userEmail);
}

/**
 * Helper function to format field values for template variables (plain text)
 */
function formatFieldValueForTemplate(field: {
  value: string;
  type: string;
  label: string;
}) {
  // For template variables, we want plain text (no HTML)
  // The template itself will handle the formatting/styling
  return field.value;
}

/**
 * Send invitation email using Mailtrap templates
 */
export async function sendInvitationEmail({
  to,
  invitationUrl,
  organization,
  inviter
}: {
  to: string;
  invitationUrl: string;
  organization: any;
  inviter: any;
}): Promise<void> {
  const invitationTemplateUuid = process.env.MAILTRAP_INVITATION_TEMPLATE;

  if (!invitationTemplateUuid) {
    throw new Error(
      "MAILTRAP_INVITATION_TEMPLATE environment variable is required"
    );
  }

  const inviterName = inviter
    ? `${inviter.firstName} ${inviter.lastName}`
    : "The team";

  const templateVariables: Record<string, string> = {
    invitation_url: invitationUrl,
    organization_name: organization.name || "the team",
    organization_logo: organization.logo || "",
    inviter_name: inviterName,
    invitee_email: to,
    app_name: "Badge AI",
    company_name: "Badge AI"
  };

  console.log("[Mailtrap] Sending invitation template email with variables:", {
    to,
    organizationName: organization.name,
    inviterName,
    hasLogo: !!organization.logo
  });

  await sendTemplateEmail({
    to,
    templateUuid: invitationTemplateUuid,
    templateVariables
  });
  // Best-effort contacts sync (non-blocking failures handled inside)
  await syncRecipientsToContacts(to);
}

/**
 * Send lead inquiry response email using Mailtrap templates (thank you email to the lead)
 */
export async function sendLeadInquiryResponseEmail(
  emails: string[],
  formData: Record<string, {value: string; type: string; label: string}>
): Promise<void> {
  const leadInquiryResponseTemplateUuid =
    process.env.MAILTRAP_LEAD_INQUIRY_RESPONSE_TEMPLATE;

  if (!leadInquiryResponseTemplateUuid) {
    throw new Error(
      "MAILTRAP_LEAD_INQUIRY_RESPONSE_TEMPLATE environment variable is required"
    );
  }

  // Convert form data to template variables
  const templateVariables: Record<string, string> = {
    app_url: process.env.APP_URL || "https://app.withbadge.ai/",
    company_name: "Badge AI",
    support_email: process.env.EMAIL_SUPPORT || "support@badge.ai"
  };

  // Add form fields as variables (up to 10 fields)
  const formFields = Object.entries(formData);

  // Initialize all field variables as empty strings first
  for (let i = 1; i <= 10; i++) {
    templateVariables[`field_${i}_label`] = "";
    templateVariables[`field_${i}_value`] = "";
  }

  // Initialize additional fields
  templateVariables["additional_fields"] = "";

  // Handle first 10 fields as individual template variables
  const additionalFields: Array<{label: string; value: string}> = [];

  formFields.forEach(([, field], index) => {
    if (index < 10) {
      // First 10 fields go to individual template variables
      const fieldNumber = index + 1;
      templateVariables[`field_${fieldNumber}_label`] = field.label;
      templateVariables[`field_${fieldNumber}_value`] =
        formatFieldValueForTemplate(field);
    } else {
      // Fields 11+ go to additional fields array
      additionalFields.push({
        label: field.label,
        value: formatFieldValueForTemplate(field)
      });
    }
  });

  // If there are additional fields, format them as HTML
  if (additionalFields.length > 0) {
    console.log(
      `[Mailtrap] Lead inquiry response has ${formFields.length} fields, ${additionalFields.length} will be in additional fields section`
    );

    const additionalFieldsHtml = additionalFields
      .map(
        (field) => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">${field.label}</div>
          <div style="color: #1F2937;">${field.value}</div>
        </div>
      `
      )
      .join("");

    templateVariables["additional_fields"] = additionalFieldsHtml;
  }

  console.log(
    "[Mailtrap] Sending lead inquiry response template email with variables:",
    {
      emails,
      fieldsCount: formFields.length,
      individualFields: Math.min(formFields.length, 10),
      additionalFields: additionalFields.length,
      hasAdditionalFields: additionalFields.length > 0
    }
  );

  await sendTemplateEmail({
    to: emails,
    templateUuid: leadInquiryResponseTemplateUuid,
    templateVariables
  });
  // Best-effort contacts sync (non-blocking failures handled inside)
  await syncRecipientsToContacts(emails);
}
