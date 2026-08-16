import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building, Sparkles } from "lucide-react";
import { RegisterFormData } from "@/schemas/register";
import { Company, CompanyMember, CompanyType } from "@/types/register";

interface CompanySelectionStepProps {
  form: UseFormReturn<RegisterFormData>;
  domainCompanies: Company[];
  companyType: CompanyType;
  setCompanyType: (type: CompanyType) => void;
  isGenericDomain: boolean;
}

export const CompanySelectionStep: React.FC<CompanySelectionStepProps> = ({
  form,
  domainCompanies,
  companyType,
  setCompanyType,
  isGenericDomain
}) => {
  if (isGenericDomain) return null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">
          {domainCompanies.length > 0 ? "Join your company" : "Set up your company"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {domainCompanies.length > 0
            ? "We found existing companies with your email domain"
            : "Join or create an existing company"}
        </p>
      </div>
      
      <FormField
        control={form.control}
        name="company.companyName"
        render={() => (
          <FormItem>
            <FormLabel>Set up your company</FormLabel>
            <FormControl>
              <RadioGroup
                value={
                  companyType === "join"
                    ? `join-${form.getValues("company.companyId")}`
                    : "create"
                }
                onValueChange={(value) => {
                  if (value === "create") {
                    setCompanyType("create");
                    form.setValue("company.companyId", undefined);
                  } else if (value.startsWith("join-")) {
                    setCompanyType("join");
                    const companyId = parseInt(value.split("-")[1], 10);
                    const company = domainCompanies.find((c) => c.id === companyId);

                    if (company) {
                      form.setValue("company.companyName", company.name);
                      form.setValue("company.companyId", company.id);
                    }
                    form.setValue("company.autoJoin", false);
                  }
                }}
                className="space-y-4"
              >
                {domainCompanies.length > 0 ? (
                  domainCompanies.map((company) => (
                    <div
                      key={company.id}
                      className={`flex items-center justify-between w-full border-2 rounded-lg px-3 py-3 bg-background cursor-pointer hover:border-primary/50 transition-colors ${
                        form.getValues("company.companyId") === company.id
                          ? "border-primary"
                          : "border-border"
                      }`}
                      onClick={() => {
                        setCompanyType("join");
                        form.setValue("company.companyName", company.name);
                        form.setValue("company.companyId", company.id);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={`${company.name} logo`}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Building className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Join your teammates at {company.domain}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mr-4">
                        <div className="flex -space-x-2">
                          {company.members &&
                            company.members.slice(0, 3).map(
                              (member: CompanyMember, idx: number) => (
                                <div
                                  key={`${member.id}-${idx}`}
                                  className="h-6 w-6 rounded-full border border-white overflow-hidden bg-gray-200"
                                >
                                  {member.profileImage ? (
                                    <img
                                      src={member.profileImage}
                                      alt={member.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary text-white text-xs">
                                      {member.name.slice(0, 1)}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                        </div>

                        {company.memberCount > 3 && (
                          <div className="ml-1 text-xs text-muted-foreground">
                            +{company.memberCount - 3}
                          </div>
                        )}
                      </div>

                      <RadioGroupItem value={`join-${company.id}`} />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between w-full border-2 rounded-lg px-3 py-3 bg-background">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                        <Building className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">Join your team</p>
                        <p className="text-xs text-muted-foreground">
                          {form.getValues("email").split("@")[1] || "company.com"}
                        </p>
                      </div>
                    </div>
                    <RadioGroupItem value="join" />
                  </div>
                )}

                {domainCompanies.length === 0 && (
                  <div
                    className="flex items-center justify-between w-full border-2 rounded-lg px-3 py-3 bg-background cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setCompanyType("create");
                      form.setValue("company.companyId", undefined);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg border border-gray-200">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">Create a new company</p>
                        <p className="text-xs text-muted-foreground">
                          Start fresh with your own company
                        </p>
                      </div>
                    </div>
                    <RadioGroupItem value="create" />
                  </div>
                )}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};