import {useEffect, useCallback, ChangeEvent, useState} from "react";
import {useLocation} from "wouter";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";
import {useCheckDomain} from "@/hooks/use-organizations";
import {useVerifyInvitation, useSendInvitations} from "@/hooks/use-invitations";
import {
  useCheckEmail,
  useCheckWebsite,
  useRegister,
  useUploadCompanyLogo
} from "@/hooks/use-register";
import {useRegisterState} from "@/hooks/use-register-state";
import {generateSecureToken} from "@/lib/utils";
import {
  handleOAuthDataProcessing,
  handleInvitationTokenProcessing,
  checkForOAuthErrors
} from "@/utils/oauth-utils";
import {
  prepareRegistrationData,
  filterValidEmails
} from "@/utils/register-utils";
import {useQueryClient} from "@tanstack/react-query";

export const useRegistrationFlow = () => {
  const [, setLocation] = useLocation();
  const {toast} = useToast();
  const {googleRegister, slackRegister, getOAuthData, clearOAuthData} =
    useAuth();
  const queryClient = useQueryClient();
  const [isBetaTester, setIsBetaTester] = useState(false);

  const registerState = useRegisterState();
  const {
    form,
    step,
    setStep,
    companyType,
    setCompanyType,
    invitationToken,
    setInvitationToken,
    companyLogoFile,
    setCompanyLogoFile,
    setCompanyLogoPreview,
    setDomainCompanies,
    setIsGenericDomain,
    accountType,
    setAccountType,
    setIsCheckingDomain,
    setIsCheckingEmail,
    setIsCheckingWebsite,
    setIsSendingInvites,
    setIsGoogleLoading,
    setIsSlackLoading,
    isSlackLoading
  } = registerState;

  // Mutations
  const registerMutation = useRegister();
  const checkEmailMutation = useCheckEmail();
  const checkWebsiteMutation = useCheckWebsite();
  const uploadImageMutation = useUploadCompanyLogo();
  const checkDomainMutation = useCheckDomain();
  const verifyInvitationMutation = useVerifyInvitation();
  const sendInvitationsMutation = useSendInvitations();

  // Handle domain checking
  const proceedWithDomainCheck = useCallback(() => {
    setIsCheckingDomain(true);
    checkDomainMutation.mutate(form.getValues("email"), {
      onSuccess: (data) => {
        setIsGenericDomain(data.isGenericDomain);
        setAccountType(data.accountType);

        if (data.isGenericDomain) {
          setCompanyType("create");
          setDomainCompanies([]);
          form.setValue("company.companyId", undefined);
          form.setValue("company.autoJoin", false);
          setStep(3);
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
      onError: (error) => {
        toast({
          title: "Error checking domain",
          description:
            error.message || "Failed to check for existing companies",
          variant: "destructive"
        });
        setIsCheckingDomain(false);
      }
    });
  }, [
    checkDomainMutation,
    form,
    setIsGenericDomain,
    setAccountType,
    setCompanyType,
    setDomainCompanies,
    setStep,
    toast
  ]);

  // Handle email checking
  const handleEmailCheck = useCallback(
    (email: string) => {
      setIsCheckingEmail(true);
      checkEmailMutation.mutate(email, {
        onSuccess: (data) => {
          if (data.exists) {
            toast({
              title: "Email already in use",
              description:
                "This email address is already registered. Please use a different email or log in.",
              variant: "destructive"
            });
          } else {
            proceedWithDomainCheck();
          }
          setIsCheckingEmail(false);
        },
        onError: (error) => {
          toast({
            title: "Error checking email",
            description:
              error.message ||
              "An error occurred while checking email availability",
            variant: "destructive"
          });
          setIsCheckingEmail(false);
          if (!invitationToken) {
            proceedWithDomainCheck();
          }
        }
      });
    },
    [
      checkEmailMutation,
      toast,
      invitationToken,
      proceedWithDomainCheck,
      setIsCheckingEmail
    ]
  );

  // Handle website checking
  const handleWebsiteCheck = useCallback(
    (website: string) => {
      setIsCheckingWebsite(true);
      checkWebsiteMutation.mutate(website, {
        onSuccess: (data) => {
          setIsCheckingWebsite(false);
          if (data.exists) {
            toast({
              title: "Website already registered",
              description:
                "This website is already associated with another company. Please use a different website.",
              variant: "destructive"
            });
            form.setError("company.companyWebsite", {
              type: "manual",
              message: "Website already in use"
            });
          } else {
            form.setValue("company.companyWebsite", data.normalizedWebsite);
            if (step === 3 && companyType === "create") {
              setStep(4);
            }
          }
        },
        onError: (error) => {
          setIsCheckingWebsite(false);
          toast({
            title: "Error checking website",
            description:
              error.message ||
              "An error occurred while checking website availability",
            variant: "destructive"
          });
        }
      });
    },
    [
      checkWebsiteMutation,
      toast,
      form,
      companyType,
      step,
      setStep,
      setIsCheckingWebsite
    ]
  );

  // Handle final registration submission
  const handleSubmit = useCallback(() => {
    const formData = form.getValues();
    const registrationData = prepareRegistrationData(
      formData,
      companyType,
      accountType,
      invitationToken,
      isBetaTester
    );

    const proceedWithRegistration = (finalData: any) => {
      registerMutation.mutate(finalData, {
        onSuccess: (response) => {
          // Update the user query cache with the returned user data
          // This ensures the user is authenticated in the frontend
          const userData = response.user || response;
          if (userData) {
            queryClient.setQueryData(["user"], userData);
            // Invalidate to ensure fresh data is fetched
            queryClient.invalidateQueries({queryKey: ["user"]});
          }

          toast({
            title: "Registration successful",
            description: "Your account has been created."
          });

          // Handle team invitations
          const teamMembers = form.getValues("company.teamMembers") || [];
          const validEmails = filterValidEmails(teamMembers);

          if (validEmails.length > 0 && response.organization?.id) {
            setIsSendingInvites(true);
            sendInvitationsMutation.mutate(
              {
                emails: validEmails,
                organizationId: response.organization.id,
                role: "User",
                publicToken: form.getValues("company.generatedInvitationToken"),
                noExpiration: true
              },
              {
                onSuccess: (data) => {
                  const successCount =
                    data.results?.filter((r: {success: boolean}) => r.success)
                      .length || 0;
                  if (successCount > 0) {
                    toast({
                      title: "Invitations sent",
                      description: `Successfully sent ${successCount} invitation${successCount !== 1 ? "s" : ""}`
                    });
                  }
                  setIsSendingInvites(false);
                  setLocation("/start");
                },
                onError: (error) => {
                  toast({
                    title: "Failed to send invitations",
                    description:
                      error.message ||
                      "An error occurred while sending invitations",
                    variant: "destructive"
                  });
                  setIsSendingInvites(false);
                  setLocation("/start");
                }
              }
            );
          } else {
            setLocation("/start");
          }
        },
        onError: (error) => {
          toast({
            title: "Registration failed",
            description:
              error.message || "An error occurred during registration",
            variant: "destructive"
          });
        }
      });
    };

    // Upload logo if needed
    if (companyLogoFile && companyType !== "join") {
      uploadImageMutation.mutate(companyLogoFile, {
        onSuccess: (logoUrl) => {
          registrationData.company.companyLogo = logoUrl;
          proceedWithRegistration(registrationData);
        },
        onError: (error) => {
          toast({
            title: "Logo upload failed",
            description: error.message || "Failed to upload company logo",
            variant: "destructive"
          });
          proceedWithRegistration(registrationData);
        }
      });
    } else {
      proceedWithRegistration(registrationData);
    }
  }, [
    form,
    companyType,
    accountType,
    invitationToken,
    companyLogoFile,
    registerMutation,
    uploadImageMutation,
    sendInvitationsMutation,
    toast,
    setLocation,
    setIsSendingInvites,
    isBetaTester,
    queryClient
  ]);

  // Handle Google signup
  const handleGoogleSignup = useCallback(() => {
    setIsGoogleLoading(true);
    try {
      googleRegister();
    } catch (error) {
      setIsGoogleLoading(false);
      console.error("Google signup error:", error);
    }
  }, [googleRegister, setIsGoogleLoading]);

  // Handle Slack signup
  const handleSlackSignup = useCallback(() => {
    setIsSlackLoading(true);
    try {
      slackRegister();
    } catch (error) {
      setIsSlackLoading(false);
      console.error("Slack signup error:", error);
    }
  }, [slackRegister, setIsSlackLoading]);

  // Handle company logo changes
  const handleCompanyLogoChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setCompanyLogoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === "string") {
            setCompanyLogoPreview(e.target.result);
          }
        };
        reader.readAsDataURL(file);
        toast({
          title: "Image selected",
          description: "Logo will be uploaded when you complete registration"
        });
      }
    },
    [setCompanyLogoFile, setCompanyLogoPreview, toast]
  );

  // Initialize component effects
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    const oauthProvider = searchParams.get("oauth");
    const betaLaunch = searchParams.has("beta-launch");

    // Check if user came from beta testing landing page
    if (betaLaunch) {
      setIsBetaTester(true);
    }

    // Handle OAuth data pre-filling (Google or Slack)
    if (oauthProvider === "google" || oauthProvider === "slack") {
      const oauthToken = searchParams.get("token");
      if (oauthToken) {
        getOAuthData(oauthToken)
          .then((oauthData) => {
            if (oauthData) {
              // Check if OAuth data has beta flag and set isBetaTester accordingly
              if (oauthData.beta === true) {
                setIsBetaTester(true);
              }

              handleOAuthDataProcessing(
                oauthData,
                form,
                checkDomainMutation,
                setIsCheckingDomain,
                setIsGenericDomain,
                setAccountType,
                setCompanyType,
                setDomainCompanies,
                setStep
              );
              toast({
                title:
                  oauthProvider === "slack"
                    ? "Slack account connected"
                    : "Google account connected",
                description:
                  oauthProvider === "slack"
                    ? "Your information has been pre-filled from Slack"
                    : "Your information has been pre-filled from Google"
              });
            }
            clearOAuthData(oauthToken);
          })
          .catch((error) => {
            console.error("Error fetching OAuth data:", error);
            clearOAuthData(oauthToken);
          });
      }
      return;
    }

    // Handle invitation token
    if (token) {
      setInvitationToken(token);
      handleInvitationTokenProcessing(
        token,
        verifyInvitationMutation,
        form,
        setCompanyType,
        toast,
        setLocation
      );
    } else {
      form.setValue("company.generatedInvitationToken", generateSecureToken());
    }
  }, []);

  // Check for OAuth errors
  useEffect(() => {
    checkForOAuthErrors(toast);
  }, [toast]);

  return {
    ...registerState,
    handleGoogleSignup,
    handleSlackSignup,
    handleCompanyLogoChange,
    handleEmailCheck,
    handleWebsiteCheck,
    handleSubmit,
    mutations: {
      register: registerMutation,
      checkEmail: checkEmailMutation,
      checkWebsite: checkWebsiteMutation,
      uploadImage: uploadImageMutation,
      checkDomain: checkDomainMutation,
      verifyInvitation: verifyInvitationMutation,
      sendInvitations: sendInvitationsMutation
    }
  };
};
