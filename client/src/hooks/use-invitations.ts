import {useMutation} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";

export interface SendInvitationsRequest {
  emails: string[];
  organizationId: number;
  role: "Company Admin" | "User";
  publicToken?: string; // Optional token generated in the frontend
  noExpiration?: boolean; // Optional flag to create non-expiring invitations
}

export interface VerifyInvitationResponse {
  invitation?: {
    id: number;
    email: string;
    organizationId: number;
    token: string;
    createdAt: string;
  };
  organization?: {
    id: number;
    name: string;
    domain: string;
    logo: string;
    description: string;
    website: string;
    defaultColor: string;
  };
  inviter?: {
    id: number;
    name: string;
    email: string;
  };
  existingUser?: any;
  shouldJoinCompany?: boolean;
  emailMatches?: boolean;
}

/**
 * Hook for sending invitations to multiple email addresses
 */
export function useSendInvitations() {
  return useMutation({
    mutationFn: async (
      data: SendInvitationsRequest
    ): Promise<SendInvitationResponse> => {
      // Validate that we have the required data
      if (!data.organizationId || data.organizationId <= 0) {
        throw new Error(
          "A valid organization ID is required to send invitations"
        );
      }

      // Filter out invalid emails to prevent API errors
      const validEmails = data.emails.filter(
        (email) =>
          email &&
          typeof email === "string" &&
          email.trim() !== "" &&
          email.includes("@")
      );

      // Don't make API call if there are no valid emails
      if (validEmails.length === 0) {
        return {
          message: "No valid emails to process",
          results: []
        };
      }

      console.log("Sending invitation request with:", {
        validEmails,
        organizationId: data.organizationId,
        hasToken: !!data.publicToken,
        noExpiration: data.noExpiration
      });

      // Make the API request with valid emails and pass through noExpiration flag
      const response = await apiRequest("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          emails: validEmails,
          organizationId: data.organizationId,
          role: data.role,
          publicToken: data.publicToken,
          noExpiration: data.noExpiration
        })
      });

      return response;
    }
  });
}

/**
 * Hook for verifying an invitation token
 */
export function useVerifyInvitation() {
  return useMutation({
    mutationFn: async (token: string): Promise<VerifyInvitationResponse> => {
      const response = await apiRequest(`/api/invitations/${token}`, {
        method: "GET"
      });
      return response;
    }
  });
}

/**
 * Interface for invitation data returned by the API
 */
export interface InvitationResponse {
  invitation: {
    id: number;
    email: string;
    organizationId: number;
    token: string;
    createdAt: string;
  };
  organization: {
    id: number;
    name: string;
    domain: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    defaultColor: string | null;
  } | null;
  inviter: {
    id: number;
    name: string;
    email: string;
  } | null;
}

/**
 * Response when sending invitations
 */
export interface SendInvitationResponse {
  message: string;
  results: Array<{
    email: string;
    success: boolean;
    invitationId?: number;
    error?: string;
  }>;
}
