import { RegisterFormData } from "@/schemas/register";
import { CompanyType, AccountType, RegistrationStep } from "@/types/register";

export const getButtonText = (
  step: RegistrationStep,
  isLoading: boolean,
  isUploading: boolean,
  isCheckingEmail: boolean,
  isCheckingDomain: boolean,
  isCheckingWebsite: boolean,
  isSendingInvites: boolean,
  companyType: CompanyType,
  isGenericDomain: boolean,
  accountType: AccountType
) => {
  if (
    isLoading ||
    isUploading ||
    isCheckingEmail ||
    isCheckingDomain ||
    isCheckingWebsite ||
    isSendingInvites
  ) {
    const loadingText = isCheckingEmail
      ? "Checking email..."
      : isCheckingDomain
      ? "Checking..."
      : isCheckingWebsite
      ? "Verifying website..."
      : isSendingInvites
      ? "Sending invites..."
      : isUploading
      ? "Uploading..."
      : "Creating account...";
    
    return loadingText;
  }

  switch (step) {
    case 1:
      if (companyType === "join" || isGenericDomain) {
        return "Set up profile";
      } else {
        return "Choose company setup";
      }
    case 2:
      if (companyType === "join") {
        return "Set up profile";
      } else {
        return "Create company";
      }
    case 3:
      if (companyType === "join") {
        return "Invite teammates";
      } else if (companyType === "individual") {
        return "Create account";
      } else {
        // Company creation step (for both generic and non-generic) - next is profile setup
        return "Continue";
      }
    case 4:
      if (companyType === "join") {
        return "Invite teammates";
      } else {
        // Profile step - next is company customization
        return "Continue";
      }
    case 5:
      if (companyType === "join") {
        return "Create account";
      } else {
        return "Invite teammates";
      }
    case 6:
      return "Create account";
    default:
      return "Continue";
  }
};

export const getMaxSteps = (isGenericDomain: boolean, companyType: CompanyType): RegistrationStep => {
  if (isGenericDomain) {
    return 3; // Email, Password, Profile for individual accounts
  }
  return companyType === "create" ? 6 : 5; // Full flow for company accounts
};

export const shouldShowSkipButton = (
  companyType: CompanyType,
  step: RegistrationStep,
  maxSteps: RegistrationStep
) => {
  return (
    (companyType === "create" && step === maxSteps) ||
    (companyType === "join" && step === 5) ||
    (companyType === "create" && step === 5)
  );
};

export const prepareRegistrationData = (
  formData: RegisterFormData,
  companyType: CompanyType,
  accountType: AccountType,
  invitationToken: string | null,
  isBetaTester: boolean = false
) => {
  // Only treat as individual if companyType is explicitly "individual"
  // Generic email users with companyType "create" should still create a company
  const isIndividual = companyType === "individual";

  return {
    email: formData.email,
    firstName: formData.firstName,
    lastName: formData.lastName,
    title: formData.title,
    company: isIndividual
      ? {
          companyName: "",
          companyWebsite: "",
          companyLogo: "",
          companyId: undefined,
          autoJoin: false,
          primaryColor: "#45B4BB"
        }
      : {
          companyName: formData.company.companyName,
          companyWebsite: formData.company.companyWebsite,
          companyLogo: formData.company.companyLogo,
          companyId: formData.company.companyId,
          autoJoin: formData.company.autoJoin,
          primaryColor: formData.company.primaryColor
        },
    invitationToken: invitationToken,
    isIndividual: isIndividual,
    isBetaTester: isBetaTester
  };
};

export const validateFormStep = (
  step: RegistrationStep,
  formData: RegisterFormData,
  companyType: CompanyType
) => {
  switch (step) {
    case 1: {
      const { email } = formData;
      return !!email && email.includes("@");
    }
    case 2: {
      if (companyType === "join") {
        return !!formData.company.companyId;
      } else if (companyType === "create") {
        return true;
      }
      return false;
    }
    case 3: {
      if (companyType === "create") {
        return !!(
          formData.company.companyName &&
          formData.company.companyWebsite &&
          formData.company.companyName.trim() !== "" &&
          formData.company.companyWebsite.trim() !== ""
        );
      } else {
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.firstName.trim() !== "" &&
          formData.lastName.trim() !== ""
        );
      }
    }
    case 4:
    case 5:
    case 6: {
      return !!(
        formData.firstName &&
        formData.lastName &&
        formData.firstName.trim() !== "" &&
        formData.lastName.trim() !== ""
      );
    }
    default:
      return true;
  }
};

export const getStepNavigation = (
  step: RegistrationStep,
  companyType: CompanyType,
  domainCompanies: any[],
  invitationToken: string | null
) => {
  // Handle back navigation logic
  if (step === 3 && companyType === "individual") {
    return 1;
  } else if (
    step === 3 &&
    companyType === "create" &&
    domainCompanies.length === 0
  ) {
    return 1; // Go back to step 1 if we skipped step 2
  } else if (
    step === 3 &&
    companyType === "join" &&
    invitationToken
  ) {
    return 1; // Go back to step 1 if we skipped step 2
  } else if (step === 5 && companyType === "join") {
    return 3; // Go back to step 3 if we skipped step 2
  } else {
    return (step - 1) as RegistrationStep; // Normal back navigation
  }
};

export const filterValidEmails = (emails: string[]): string[] => {
  return emails.filter(
    (email) =>
      email &&
      typeof email === "string" &&
      email.trim() !== "" &&
      email.includes("@")
  );
};