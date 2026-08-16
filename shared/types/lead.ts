import {FormField} from "./form-field";

// Lead tag type definition
export interface LeadTag {
  id: string;
  label: string;
  color?: string;
}

// Lead note type definition
export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
}

// Lead type definition
export interface Lead {
  id: string;
  formData: Record<string, {value: string}>;
  tags: LeadTag[];
  notes: LeadNote[];
  createdAt: string;
  updatedAt: string;
  fromQr?: boolean;
}

// Default form fields that should be present in every lead form
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
  captureFromQr: false
};
