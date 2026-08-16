import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MailOpen } from "lucide-react";
import { RegisterFormData } from "@/schemas/register";

interface CompanyDetailsStepProps {
  form: UseFormReturn<RegisterFormData>;
  isCheckingWebsite: boolean;
  isGenericDomain?: boolean;
}

export const CompanyDetailsStep: React.FC<CompanyDetailsStepProps> = ({
  form,
  isCheckingWebsite,
  isGenericDomain = false
}) => {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Create your company</h1>
        <p className="text-muted-foreground mb-8">Set up your company details</p>
      </div>
      
      <FormField
        control={form.control}
        name="company.companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company name</FormLabel>
            <FormControl>
              <Input placeholder="Company name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="company.companyWebsite"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company website*</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder="example.com or https://example.com"
                  {...field}
                  className={isCheckingWebsite ? "pr-10" : ""}
                />
                {isCheckingWebsite && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your company's website URL
              {isCheckingWebsite && " - Verifying website..."}
            </p>
          </FormItem>
        )}
      />

      {!isGenericDomain && (
        <FormField
          control={form.control}
          name="company.autoJoin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who can join this workspace?</FormLabel>
              <FormControl>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg border border-gray-200">
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="invite-toggle" className="text-sm font-medium">
                        Teammates can automatically join
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Teammates with a verified{" "}
                        <span className="font-bold">
                          {form.getValues("email").split("@")[1]}
                        </span>{" "}
                        email address can join automatically.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="invite-toggle"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};