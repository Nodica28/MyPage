/**
 * Represents a field in a form
 */
export interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea";
  required: boolean;
  placeholder?: string;
  order?: number;
}
