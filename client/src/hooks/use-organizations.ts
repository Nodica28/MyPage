import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";
import {useAuth} from "@/hooks/use-auth";

export interface CompanyMember {
  id: number;
  name: string;
  profileImage: string | null;
}

export interface Company {
  id: number;
  name: string;
  domain: string;
  logo: string | null;
  memberCount: number;
  members: CompanyMember[];
}

export interface UserOrganization {
  id: number;
  userId: number;
  organizationId: number;
  isCompanyAdmin: boolean;
  isPrimary: boolean;
  joinedAt: string;
  organization: {
    id: number;
    name: string;
    logo: string | null;
    memberCount: number;
  };
}

interface DomainCheckResponse {
  companies: Company[];
  isGenericDomain: boolean;
  accountType: "individual" | "company";
  hasExistingCompanies?: boolean;
}

interface InvitationData {
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
 * Hook to check for companies with a specific domain
 */
export function useCheckDomain() {
  return useMutation({
    mutationFn: async (email: string) => {
      const domain = email.split("@")[1];
      const response = await apiRequest(
        `/api/organization/check-domain?domain=${domain}`,
        {
          method: "GET"
        }
      );
      return response as DomainCheckResponse;
    }
  });
}

/**
 * Hook to verify an invitation token
 */
export function useCheckInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest(
        `/api/invitations/verify?token=${token}`,
        {
          method: "GET"
        }
      );
      return response as InvitationData;
    }
  });
}

/**
 * Hook to get organization by ID
 */
export function useOrganization(id: number | string | null) {
  return useQuery({
    queryKey: ["organization", id],
    queryFn: async () => {
      if (!id) return null;
      return apiRequest(`/api/organization/${id}`);
    },
    enabled: !!id
  });
}

/**
 * Hook to get current user's organization
 */
export function useCurrentOrganization() {
  return useQuery({
    queryKey: ["organization", "current"],
    queryFn: async () => {
      return apiRequest("/api/organization");
    }
  });
}

/**
 * Hook to get current user's organization role
 * Returns isCompanyAdmin status for the current organization
 */
export function useCurrentOrganizationRole() {
  const {user} = useAuth();
  const {data: currentOrg} = useCurrentOrganization();

  return useQuery({
    queryKey: ["userOrganizationRole", user?.id, currentOrg?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrg?.id) {
        return {isCompanyAdmin: false};
      }

      const response = await apiRequest(
        "/api/user-organizations/me/organizations"
      );
      const userOrgs = response || [];

      // Find the current organization in the user's organizations
      const currentUserOrg = userOrgs.find(
        (userOrg: any) => userOrg.organizationId === currentOrg.id
      );

      return {
        isCompanyAdmin: currentUserOrg?.isCompanyAdmin || false
      };
    },
    enabled: !!(user?.id && currentOrg?.id)
  });
}

/**
 * Hook to get all organizations for the current user
 */
export function useUserOrganizations() {
  const {user} = useAuth();
  
  return useQuery({
    queryKey: ["userOrganizations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("/api/user-organizations/me/organizations");
      return response as UserOrganization[];
    },
    enabled: !!user?.id
  });
}

/**
 * Hook to switch primary company
 */
export function useSwitchPrimaryCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await apiRequest("/api/user-organizations/switch-primary", {
        method: "POST",
        body: JSON.stringify({ organizationId })
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["userOrganizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", "current"] });
      queryClient.invalidateQueries({ queryKey: ["userOrganizationRole"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    }
  });
}
