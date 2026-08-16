import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {registerSchema, RegisterFormData} from "@/schemas/register";
import {generateSecureToken} from "@/lib/utils";
import {
  CompanyType,
  AccountType,
  RegistrationStep,
  Company
} from "@/types/register";

export const useRegisterState = () => {
  const [step, setStep] = useState<RegistrationStep>(1);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(
    null
  );
  const [companyType, setCompanyType] = useState<CompanyType>("join");
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainCompanies, setDomainCompanies] = useState<Company[]>([]);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingWebsite, setIsCheckingWebsite] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSlackLoading, setIsSlackLoading] = useState(false);
  const [isGenericDomain, setIsGenericDomain] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("company");

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      title: "",
      company: {
        companyName: "",
        companyWebsite: "",
        companyLogo: "",
        autoJoin: false,
        primaryColor: "#45B4BB",
        teamMembers: [""],
        generatedInvitationToken: generateSecureToken(),
        companyId: undefined
      }
    },
    mode: "onChange"
  });

  // Get maximum steps based on account type and company type
  const getMaxSteps = (): RegistrationStep => {
    if (isGenericDomain) {
      // Generic email users must create a company: steps 1, 3, 4, 5, 6 (skip step 2)
      return 6;
    }
    return companyType === "create" ? 6 : 5; // Full flow for company accounts
  };

  // Generate the full invitation URL including domain and token
  const getInvitationUrl = () => {
    const baseUrl = window.location.origin;
    const token = form.getValues("company.generatedInvitationToken");
    return `${baseUrl}/register?token=${token}`;
  };

  return {
    // State
    step,
    setStep,
    companyLogoFile,
    setCompanyLogoFile,
    companyLogoPreview,
    setCompanyLogoPreview,
    companyType,
    setCompanyType,
    isCheckingDomain,
    setIsCheckingDomain,
    domainCompanies,
    setDomainCompanies,
    isCheckingEmail,
    setIsCheckingEmail,
    isCheckingWebsite,
    setIsCheckingWebsite,
    invitationToken,
    setInvitationToken,
    isSendingInvites,
    setIsSendingInvites,
    isGoogleLoading,
    setIsGoogleLoading,
    isSlackLoading,
    setIsSlackLoading,
    isGenericDomain,
    setIsGenericDomain,
    accountType,
    setAccountType,

    // Form
    form,

    // Utilities
    getMaxSteps,
    getInvitationUrl
  };
};
