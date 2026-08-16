import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

/**
 * Combines class names using clsx and twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates text to a specified length and adds ellipsis
 */
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Determines if a URL is a database image URL
 * @param url The URL to check
 * @returns True if the URL is a database image URL, false otherwise
 */
export function isDatabaseImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith("/api/db-images/");
}

/**
 * Gets the ID from a database image URL
 * @param url The database image URL
 * @returns The ID of the image or null if not a valid database image URL
 */
export function getImageIdFromUrl(url?: string | null): number | null {
  if (!url || !isDatabaseImageUrl(url)) return null;
  const parts = url.split("/");
  const id = parseInt(parts[parts.length - 1]);
  return isNaN(id) ? null : id;
}

/**
 * Generates a secure random token for invitations
 * @param length Length of the token (default: 32)
 * @returns A random hexadecimal string
 */
export function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Formats a date string to a more readable format
 * @param dateString The date string to format
 * @returns A formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Format a phone number for use in vCard
 * Strips all non-digit characters and adds the country code if not present
 */
export function formatPhoneNumberForVCard(phoneNumber: string): string {
  // Remove all non-digit characters
  let formatted = phoneNumber.replace(/\D/g, "");

  // Add country code if not present
  if (formatted.length === 10) {
    // Assume US number if 10 digits
    formatted = "1" + formatted;
  }

  // If the number doesn't have the + prefix, add it
  if (!phoneNumber.startsWith("+")) {
    formatted = "+" + formatted;
  }

  return formatted;
}
