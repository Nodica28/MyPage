import React from "react";
import {Link} from "wouter";
import {Button} from "@/components/ui/button";
import {Form} from "@/components/ui/form";
import {StepProgress} from "@/components/ui/step-progress";
import {ChevronLeft, Loader2} from "lucide-react";
import {ProfilePreview} from "@/components/badge-profile/ProfilePreview";
import {useRegistrationFlow} from "@/hooks/use-registration-flow";
import {
  getButtonText,
  shouldShowSkipButton,
  validateFormStep,
  getStepNavigation
} from "@/utils/register-utils";
import {useToast} from "@/hooks/use-toast";

// Step Components
import {EmailStep} from "@/components/register/EmailStep";
import {CompanySelectionStep} from "@/components/register/CompanySelectionStep";
import {CompanyDetailsStep} from "@/components/register/CompanyDetailsStep";
import {ProfileStep} from "@/components/register/ProfileStep";
import {CompanyCustomizationStep} from "@/components/register/CompanyCustomizationStep";
import {TeamInvitationStep} from "@/components/register/TeamInvitationStep";

export default function Register() {
  const {toast} = useToast();
  const {
    form,
    step,
    setStep,
    getMaxSteps,
    companyType,
    setCompanyType,
    domainCompanies,
    isGenericDomain,
    companyLogoPreview,
    setCompanyLogoFile,
    setCompanyLogoPreview,
    invitationToken,
    isCheckingEmail,
    isCheckingDomain,
    isCheckingWebsite,
    isSendingInvites,
    isGoogleLoading,
    isSlackLoading,
    accountType,
    handleGoogleSignup,
    handleSlackSignup,
    handleCompanyLogoChange,
    handleEmailCheck,
    handleWebsiteCheck,
    handleSubmit,
    getInvitationUrl,
    mutations
  } = useRegistrationFlow();

  const maxSteps = getMaxSteps();

  const handleContinue = async () => {
    const formData = form.getValues();

    // Validate current step
    if (!validateFormStep(step, formData, companyType)) {
      toast({
        title: "Please complete all required fields",
        description: "Fill in all required information before continuing.",
        variant: "destructive"
      });
      return;
    }

    switch (step) {
      case 1: {
        handleEmailCheck(formData.email);
        return;
      }
      case 2: {
        if (companyType === "join") {
          if (!formData.company.companyId) {
            toast({
              title: "Please select a company",
              description: "Please select an existing company to join",
              variant: "destructive"
            });
            return;
          }
          // Skip to appropriate step based on invitation token
          if (invitationToken) {
            setStep(5);
            return;
          }
        }
        break;
      }
      case 3: {
        if (companyType === "create") {
          if (
            !formData.company.companyName ||
            !formData.company.companyWebsite
          ) {
            toast({
              title: "Please complete company information",
              description: "Company name and website are required",
              variant: "destructive"
            });
            return;
          }
          // Check website uniqueness
          handleWebsiteCheck(formData.company.companyWebsite);
          return;
        } else {
          // Profile step for join/individual flow
          if (!formData.firstName || !formData.lastName) {
            toast({
              title: "Please complete your profile",
              description: "First and last name are required",
              variant: "destructive"
            });
            return;
          }

          if (companyType === "join") {
            setStep(5);
            return;
          } else if (companyType === "individual") {
            handleSubmit();
            return;
          }
        }
        break;
      }
      case 4: {
        if (companyType === "join") {
          setStep(6);
          return;
        } else {
          // Profile step for create flow
          if (!formData.firstName || !formData.lastName) {
            toast({
              title: "Please complete your profile",
              description: "First and last name are required",
              variant: "destructive"
            });
            return;
          }
          // Move to company customization step
          setStep(5);
          return;
        }
      }
      case 5: {
        if (companyType === "join") {
          handleSubmit();
          return;
        }
        break;
      }
      case 6: {
        handleSubmit();
        return;
      }
    }

    // Default: move to next step
    if (step < maxSteps) {
      setStep((step + 1) as any);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    const newStep = getStepNavigation(
      step,
      companyType,
      domainCompanies,
      invitationToken
    );
    setStep(newStep);
  };

  const buttonText = getButtonText(
    step,
    mutations.register.isPending,
    mutations.uploadImage.isPending,
    isCheckingEmail,
    isCheckingDomain,
    isCheckingWebsite,
    isSendingInvites,
    companyType,
    isGenericDomain,
    accountType
  );

  const showSkipButton = shouldShowSkipButton(companyType, step, maxSteps);

  const isLoading =
    mutations.register.isPending ||
    mutations.uploadImage.isPending ||
    isCheckingEmail ||
    isCheckingDomain ||
    isCheckingWebsite ||
    isSendingInvites;

  const canGoBack = step > 1;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <EmailStep
            form={form}
            isGoogleLoading={isGoogleLoading}
            onGoogleSignup={handleGoogleSignup}
            isSlackLoading={isSlackLoading}
            onSlackSignup={handleSlackSignup}
            isCheckingEmail={isCheckingEmail}
          />
        );
      case 2:
        return (
          <CompanySelectionStep
            form={form}
            domainCompanies={domainCompanies}
            companyType={companyType}
            setCompanyType={setCompanyType}
            isGenericDomain={isGenericDomain}
          />
        );
      case 3:
        if (companyType === "create") {
          return (
            <CompanyDetailsStep
              form={form}
              isCheckingWebsite={isCheckingWebsite}
              isGenericDomain={isGenericDomain}
            />
          );
        } else {
          return <ProfileStep form={form} />;
        }
      case 4:
        if (companyType === "create") {
          return <ProfileStep form={form} />;
        } else {
          return (
            <CompanyCustomizationStep
              form={form}
              companyLogoPreview={companyLogoPreview}
              onCompanyLogoChange={handleCompanyLogoChange}
              onRemoveLogo={() => {
                setCompanyLogoFile(null);
                setCompanyLogoPreview(null);
              }}
            />
          );
        }
      case 5:
        if (companyType === "create") {
          return (
            <CompanyCustomizationStep
              form={form}
              companyLogoPreview={companyLogoPreview}
              onCompanyLogoChange={handleCompanyLogoChange}
              onRemoveLogo={() => {
                setCompanyLogoFile(null);
                setCompanyLogoPreview(null);
              }}
            />
          );
        } else {
          return (
            <TeamInvitationStep
              form={form}
              getInvitationUrl={getInvitationUrl}
            />
          );
        }
      case 6:
        return (
          <TeamInvitationStep form={form} getInvitationUrl={getInvitationUrl} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="p-8">
            <div className="mb-6">
              <StepProgress
                currentStep={step}
                totalSteps={maxSteps}
                className="w-full"
              />
            </div>

            <div>
              {canGoBack && (
                <ChevronLeft
                  className="-ml-2 h-6 w-6 cursor-pointer text-primary hover:text-primary/80 transition-all duration-200"
                  onClick={handleBack}
                />
              )}

              <Form {...form}>
                <div className="space-y-5">
                  {renderStep()}

                  <div className="flex flex-col justify-between pt-5">
                    <Button
                      type="button"
                      onClick={handleContinue}
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {buttonText}
                        </>
                      ) : (
                        buttonText
                      )}
                    </Button>

                    {showSkipButton && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSubmit}
                        className="w-full mt-3"
                        disabled={isLoading}
                      >
                        Skip for now
                      </Button>
                    )}
                  </div>
                </div>
              </Form>

              {step === 1 && (
                <div className="mt-7 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/auth"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Preview */}
      <div className="hidden lg:flex flex-1 bg-muted relative overflow-hidden">
        <div className="absolute top-1/2 right-2 w-full flex justify-end items-center z-10 -mt-12">
          <div className="bg-gradient-to-r from-cyan-300 to-blue-600 font-semibold p-1 rounded-full">
            <span className="flex w-full bg-white text-black p-2 rounded-full items-center">
              built with{" "}
              <span>
                <img
                  src="/light-mode-logo.svg"
                  alt="Badge"
                  className="h-5 ml-1 mt-1"
                />
              </span>
            </span>
          </div>
        </div>

        <div className="absolute top-1/3 left-1/4 w-[950px] h-[950px]">
          <ProfilePreview
            quickLinks={[]}
            sections={[]}
            backgroundStyle={{}}
            backgroundImage={"/backgrounds/banners/cloudy-background.png"}
            onOpenExternal={() => {}}
            className="w-full h-full"
            buttonColor="#000000"
            iconColor="#000000"
            isRegister={true}
            userProfile={
              step >= 2
                ? {
                    id: 0,
                    uniquePathId: "",
                    publicPath:
                      form.watch("firstName").toLowerCase() +
                      "." +
                      form.watch("lastName").toLowerCase(),
                    firstName: form.watch("firstName") || "",
                    lastName: form.watch("lastName") || "",
                    title: form.watch("title") || "",
                    email: form.watch("email") || "",
                    bio: "",
                    profileImage: null,
                    phoneNumber: null,
                    linkedinProfile: null
                  }
                : undefined
            }
            organization={
              step >= 3
                ? {
                    id: 1,
                    name: form.watch("company.companyName") || "",
                    logo:
                      companyType === "join"
                        ? domainCompanies.find(
                            (c) => c.id === form.watch("company.companyId")
                          )?.logo || ""
                        : companyLogoPreview || "",
                    description: "",
                    website: form.watch("company.companyWebsite") || "",
                    defaultColor: form.watch("company.primaryColor") || null
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
