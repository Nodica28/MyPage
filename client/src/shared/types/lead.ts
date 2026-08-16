import {FormField} from "@/shared/types/form-field";

/**
 * Represents a tag associated with a lead
 */
export interface LeadTag {
  id: string;
  label: string;
  color: string;
}

/**
 * Represents a note associated with a lead
 */
export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * Represents a lead entry from a lead generation form
 */
export interface LeadFormData {
  [key: string]: {
    value: string;
    type: string;
    label: string;
  };
}

export interface Lead {
  id: string;
  actionId: string;
  formData: LeadFormData;
  tags: LeadTag[];
  notes: LeadNote[];
  createdAt: string;
}

/**
 * API response for leads listing
 */
export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

// Default lead fields that cannot be removed
export const DEFAULT_LEAD_FIELDS: FormField[] = [
  {
    id: "name",
    label: "Full Name",
    type: "text",
    required: true
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true
  },
  {
    id: "phone",
    label: "Phone",
    type: "phone",
    required: false
  }
];

// Settings for lead generation
export interface LeadSettings {
  fields: FormField[];
  downloadVcard: boolean;
  notifyEmail: boolean;
  captureFromQr: boolean;
  customThankYouMessage?: string;
  redirectUrl?: string;
}

// Default lead settings
export const DEFAULT_LEAD_SETTINGS: LeadSettings = {
  fields: DEFAULT_LEAD_FIELDS,
  downloadVcard: true,
  notifyEmail: true,
  captureFromQr: false,
  customThankYouMessage: "Thank you for submitting your information!"
};
