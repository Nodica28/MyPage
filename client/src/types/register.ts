// Re-export types from use-organizations to avoid duplication
export type { Company, CompanyMember } from "@/hooks/use-organizations";
import type { Company } from "@/hooks/use-organizations";

export interface RegisterFormData {
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  company: {
    companyName: string;
    companyWebsite: string;
    companyLogo?: string;
    autoJoin: boolean;
    primaryColor?: string;
    teamMembers?: string[];
    generatedInvitationToken?: string;
    companyId?: number;
  };
}

export interface DomainCheckResponse {
  isGenericDomain: boolean;
  accountType: "individual" | "company";
  companies?: Company[];
  canAutoJoin?: boolean;
  organizations?: Array<{
    id: number;
    name: string;
    website?: string;
    defaultColor?: string;
  }>;
}

export interface InvitationVerificationResponse {
  shouldJoinCompany: boolean;
  existingUser: boolean;
  emailMatches: boolean;
  invitation?: {
    email: string;
  };
  organization?: {
    id: number;
    name: string;
    website?: string;
    defaultColor?: string;
  };
}

export interface RegistrationResponse {
  organization?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    email: string;
  };
}

export interface EmailCheckResponse {
  exists: boolean;
}

export interface WebsiteCheckResponse {
  exists: boolean;
  normalizedWebsite: string;
}

export type CompanyType = "join" | "create" | "individual";
export type AccountType = "individual" | "company";
export type RegistrationStep = 1 | 2 | 3 | 4 | 5 | 6;