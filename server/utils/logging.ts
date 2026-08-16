/**
 * Logging utility functions for server components
 */

/**
 * Helper function to truncate large string values for logging
 * @param obj Object to process
 * @param maxLength Maximum length for string values
 * @returns Processed object with truncated strings
 */
export function truncateForLogging(obj: any, maxLength = 100): any {
  if (!obj || typeof obj !== "object") return obj;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (typeof obj[key] === "string" && obj[key].length > maxLength) {
      result[key] = `${obj[key].substring(0, maxLength)}... [truncated]`;
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      result[key] = truncateForLogging(obj[key], maxLength);
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}
