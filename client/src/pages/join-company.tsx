import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Loader2, Building, Users, CheckCircle, AlertCircle} from "lucide-react";
import {useLocation} from "wouter";
import {useMutation} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {apiRequest} from "@/lib/queryClient";
import {useVerifyInvitation} from "@/hooks/use-invitations";
import {useAuth} from "@/hooks/use-auth";

interface JoinCompanyData {
  token: string;
  organizationId: number;
  role: "Company Admin" | "User";
}

export default function JoinCompany() {
  const [, setLocation] = useLocation();
  const {toast} = useToast();
  const {user} = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const verifyInvitationMutation = useVerifyInvitation();

  // Get invitation token from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (token) {
      setInvitationToken(token);
      verifyInvitationMutation.mutate(token, {
        onSuccess: (data) => {
          setInvitationData(data);
        },
        onError: (error) => {
          console.error("Error verifying invitation:", error);
          toast({
            title: "Invalid invitation",
            description:
              error instanceof Error
                ? error.message
                : "The invitation link is invalid or has expired",
            variant: "destructive"
          });
          setLocation("/");
        }
      });
    } else {
      toast({
        title: "No invitation token",
        description: "Please use a valid invitation link",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, []);

  // Join company mutation
  const joinCompanyMutation = useMutation({
    mutationFn: async (data: JoinCompanyData) => {
      const response = await apiRequest("/api/invitations/accept", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Successfully joined company",
        description: `You are now a member of ${invitationData?.organization?.name}`
      });

      // Redirect to homepage or the new organization
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join company",
        description:
          error.message || "An error occurred while joining the company",
        variant: "destructive"
      });
    }
  });

  const handleJoinCompany = () => {
    if (!invitationToken || !invitationData?.organization?.id) {
      toast({
        title: "Error",
        description: "Invalid invitation data",
        variant: "destructive"
      });
      return;
    }

    // Get role from invitation
    const role = invitationData.invitation?.role || "User"; // Default to User if no role specified

    joinCompanyMutation.mutate({
      token: invitationToken,
      organizationId: invitationData.organization.id,
      role: role
    });
  };

  const handleDecline = () => {
    setLocation("/");
  };

  if (verifyInvitationMutation.isPending) {
    return (
      <div className="min-h-[calc(100vh-48px)] bg-background flex items-center justify-center border border-gray-200 rounded-2xl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Verifying invitation...
          </p>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-[calc(100vh-48px)] bg-background flex items-center justify-center border border-gray-200 rounded-2xl">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Invalid invitation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-white bg-background flex items-center justify-center border border-gray-200 rounded-2xl">
      <div className="w-full max-w-md p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Company Logo and Info */}
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-lg border border-gray-200 flex items-center justify-center mx-auto mb-4 overflow-hidden bg-white">
              {invitationData.organization?.logo ? (
                <img
                  src={invitationData.organization.logo}
                  alt={`${invitationData.organization.name} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Join {invitationData.organization?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              You've been invited to join this organization
            </p>
          </div>

          {/* Invitation Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Organization</p>
                  <p className="text-sm text-muted-foreground">
                    {invitationData.organization?.name}
                  </p>
                </div>
              </div>
            </div>

            {invitationData.inviter && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Invited by</p>
                    <p className="text-sm text-muted-foreground">
                      {invitationData.inviter.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Your Role</p>
                  <p className="text-sm text-muted-foreground">
                    You'll join as a {invitationData.invitation?.role || "User"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Your Account</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.firstName} {user?.lastName} ({user?.email})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleJoinCompany}
              disabled={joinCompanyMutation.isPending}
              className="w-full"
            >
              {joinCompanyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining company...
                </>
              ) : (
                "Join Company"
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={joinCompanyMutation.isPending}
              className="w-full"
            >
              Decline Invitation
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By joining, you'll have access to this organization's workspace
              and resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
