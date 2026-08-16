/**
 * Common generic email domains that should be treated as individual accounts
 * rather than company domains
 */
const GENERIC_EMAIL_DOMAINS = new Set([
  // Major email providers
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",

  // Microsoft variants
  "live.com",
  "msn.com",
  "hotmail.co.uk",
  "outlook.co.uk",
  "live.co.uk",

  // Yahoo variants
  "yahoo.co.uk",
  "yahoo.ca",
  "yahoo.com.au",
  "ymail.com",

  // Other popular providers
  "protonmail.com",
  "proton.me",
  "tutanota.com",
  "fastmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "gmx.de",
  "web.de",

  // Temporary email providers
  "10minutemail.com",
  "tempmail.org",
  "guerrillamail.com",
  "mailinator.com",

  // Other common generic domains
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "naver.com",
  "daum.net",
  "kakao.com"
]);

/**
 * Checks if an email domain is a generic email provider
 * @param domain - The email domain to check
 * @returns true if the domain is a generic email provider
 */
export function isGenericEmailDomain(domain: string): boolean {
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Extracts domain from email address
 * @param email - The email address
 * @returns the domain part of the email
 */
export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Checks if an email address uses a generic email provider
 * @param email - The email address to check
 * @returns true if the email uses a generic email provider
 */
export function isGenericEmail(email: string): boolean {
  const domain = extractDomain(email);
  return domain ? isGenericEmailDomain(domain) : false;
}

/**
 * Determines the account type based on the email domain
 * @param email - The email address
 * @returns 'individual' for generic domains, 'company' for business domains
 */
export function getAccountType(email: string): "individual" | "company" {
  return isGenericEmail(email) ? "individual" : "company";
}
