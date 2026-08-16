// vCard utility for Badge platform

export interface VCardContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  organization?: string;
  title?: string;
  linkedinProfile?: string;
  website?: string;
  profileImage?: string;
}

export function generateVCard(contact: VCardContact): string {
  // Ensure profile image is an absolute URL
  let profileImageUrl = contact.profileImage || "";

  // If it starts with a relative path, convert to absolute URL
  if (profileImageUrl && profileImageUrl.startsWith("/")) {
    // Get the base URL from the window location
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "https://app.withbadge.ai";
    profileImageUrl = `${baseUrl}${profileImageUrl}`;
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${(contact.firstName || "") + (contact.lastName ? " " + contact.lastName : "")}`.trim(),
    contact.firstName || contact.lastName
      ? `N:${contact.lastName || ""};${contact.firstName || ""}`
      : "",
    contact.title ? `TITLE:${contact.title}` : "",
    contact.organization ? `ORG:${contact.organization}` : "",
    contact.email ? `EMAIL;TYPE=INTERNET:${contact.email}` : "",
    contact.phoneNumber ? `TEL;TYPE=CELL:${contact.phoneNumber}` : "",
    contact.linkedinProfile
      ? `URL;TYPE=linkedin:${contact.linkedinProfile}`
      : "",
    contact.website ? `URL;TYPE=WORK:${contact.website}` : "",
    profileImageUrl ? `PHOTO;VALUE=URI:${profileImageUrl}` : "",
    "END:VCARD"
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadVCard(contact: VCardContact, filename?: string) {
  const vcfText = generateVCard(contact);
  // Generate a proper filename if not provided
  let baseName = "contact";
  if (contact.firstName || contact.lastName) {
    baseName = `${contact.firstName || ""}-${contact.lastName || ""}`.trim();
  }
  // Sanitize: lowercase, replace spaces with dashes, remove non-alphanum except dash
  baseName = baseName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  const finalFilename = (filename || baseName || "contact") + ".vcf";
  const blob = new Blob([vcfText], {type: "text/vcard;charset=utf-8"});
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", finalFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
