// Import the new Mailtrap service
import {
  sendMail as sendMailtrapMail,
  sendMagicLinkEmail as sendMailtrapMagicLinkEmail
} from "./mailtrap-email";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface MagicLinkEmailOptions {
  to: string;
  token: string;
  appUrl: string;
}

/**
 * Sends an email using Mailtrap (replaces nodemailer)
 */
export async function sendMail(options: EmailOptions): Promise<void> {
  // Delegate to the Mailtrap service
  await sendMailtrapMail(options);
}

/**
 * Sends a magic link email for passwordless authentication using Mailtrap
 */
export async function sendMagicLinkEmail({
  to,
  token,
  appUrl
}: MagicLinkEmailOptions): Promise<void> {
  // Delegate to the Mailtrap service
  await sendMailtrapMagicLinkEmail({to, token, appUrl});
}
