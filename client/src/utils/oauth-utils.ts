import { UseFormReturn } from "react-hook-form";
import { RegisterFormData } from "@/schemas/register";
import { CompanyType } from "@/types/register";

export const handleOAuthDataProcessing = (
  oauthData: any,
  form: UseFormReturn<RegisterFormData>,
  checkDomainMutation: any,
  setIsCheckingDomain: (value: boolean) => void,
  setIsGenericDomain: (value: boolean) => void,
  setAccountType: (value: "individual" | "company") => void,
  setCompanyType: (value: CompanyType) => void,
  setDomainCompanies: (companies: any[]) => void,
  setStep: (step: any) => void
) => {
  if (!oauthData) return;

  // Pre-fill form with OAuth data
  form.setValue("email", oauthData.email);
  form.setValue("firstName", oauthData.firstName);
  form.setValue("lastName", oauthData.lastName);

  // Extract domain for company setup
  if (oauthData.email) {
    const domain = oauthData.email.split("@")[1];
    if (domain) {
      // Check for existing companies with the same domain
      setIsCheckingDomain(true);
      checkDomainMutation.mutate(oauthData.email, {
        onSuccess: (data: any) => {
          setIsGenericDomain(data.isGenericDomain);
          setAccountType(data.accountType);

          if (data.isGenericDomain) {
            // For generic email domains, require company creation
            setCompanyType("create");
            setDomainCompanies([]);
            form.setValue("company.companyId", undefined);
            form.setValue("company.autoJoin", false);
            setStep(3); // Go to company creation step
          } else if (data.companies && data.companies.length > 0) {
            setDomainCompanies(data.companies);
            setCompanyType("join");
            form.setValue("company.companyName", data.companies[0].name);
            form.setValue("company.companyId", data.companies[0].id);
            setStep(2);
          } else {
            setCompanyType("create");
            setDomainCompanies([]);
            form.setValue("company.companyId", undefined);
            form.setValue("company.autoJoin", false);
            setStep(3);
          }
          setIsCheckingDomain(false);
        },
        onError: (error: any) => {
          console.error("Domain check error:", error);
          setIsCheckingDomain(false);
          setStep(2);
        }
      });
    }
  }
};

export const handleInvitationTokenProcessing = (
  token: string,
  verifyInvitationMutation: any,
  form: UseFormReturn<RegisterFormData>,
  setCompanyType: (value: CompanyType) => void,
  toast: any,
  setLocation: (location: string) => void
) => {
  verifyInvitationMutation.mutate(token, {
    onSuccess: (data: any) => {
      // Check if user should be redirected to join page (existing user)
      if (data.shouldJoinCompany && data.existingUser) {
        toast({
          title: "Welcome back!",
          description: `Redirecting you to join ${data.organization?.name}`
        });
        setLocation(`/join-company?token=${token}`);
        return;
      }

      // Check if user email doesn't match invitation
      if (data.existingUser && !data.emailMatches) {
        toast({
          title: "Email mismatch",
          description: "This invitation is for a different email address. Please log out and try again with the correct email.",
          variant: "destructive"
        });
        return;
      }

      // Pre-fill email from invitation if available
      if (data.invitation?.email) {
        form.setValue("email", data.invitation.email);
      }

      // Pre-fill organization data
      if (data.organization) {
        setCompanyType("join");
        form.setValue("company.companyId", data.organization.id);
        form.setValue("company.companyName", data.organization.name);
        form.setValue("company.companyWebsite", data.organization.website || "");

        if (data.organization.defaultColor) {
          form.setValue("company.primaryColor", data.organization.defaultColor);
        }

        form.setValue("company.generatedInvitationToken", token);

        // Show success message
        toast({
          title: "Invitation verified",
          description: `You've been invited to join ${data.organization.name}`
        });
      }
    },
    onError: (error: any) => {
      console.error("Error verifying invitation:", error);
      toast({
        title: "Invalid invitation",
        description: error instanceof Error ? error.message : "The invitation link is invalid or has expired",
        variant: "destructive"
      });
    }
  });
};

export const checkForOAuthErrors = (toast: any) => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error === "oauth_failed") {
    toast({
      title: "Google Sign Up Failed",
      description: "There was an error signing up with Google. Please try again.",
      variant: "destructive"
    });
  }
};