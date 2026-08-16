import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Plus, X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RegisterFormData } from "@/schemas/register";

interface TeamInvitationStepProps {
  form: UseFormReturn<RegisterFormData>;
  getInvitationUrl: () => string;
}

export const TeamInvitationStep: React.FC<TeamInvitationStepProps> = ({
  form,
  getInvitationUrl
}) => {
  const { toast } = useToast();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Portal is better with teams</h1>
        <p className="text-muted-foreground mb-8">
          Now that your company is created, invite your team to get the most out of Portal.
        </p>
      </div>
      
      <FormField
        control={form.control}
        name="company.teamMembers"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="space-y-4">
                {(field.value || []).map((email: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="email"
                        placeholder="colleague@company.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => {
                          const newEmails = [...(field.value || [])];
                          newEmails[index] = e.target.value;
                          field.onChange(newEmails);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newEmails = [...(field.value || [])];
                        newEmails.splice(index, 1);
                        field.onChange(newEmails);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <Button
        type="button"
        variant="outline"
        className="w-full mt-4"
        onClick={() => {
          const currentEmails = form.getValues("company.teamMembers") || [];
          form.setValue("company.teamMembers", [...currentEmails, ""]);
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add another
      </Button>
      
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border"></div>
        <span className="text-muted-foreground text-sm">OR</span>
        <div className="h-px flex-1 bg-border"></div>
      </div>
      
      <FormField
        control={form.control}
        name="company.generatedInvitationToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Invitation link</FormLabel>
            <FormControl>
              <div className="flex items-center">
                <Input
                  {...field}
                  value={getInvitationUrl()}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => {
                    navigator.clipboard.writeText(getInvitationUrl());
                    toast({
                      title: "Link copied",
                      description: "Share link copied to clipboard"
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1">
              Note: This invitation link will be activated automatically after your
              registration is complete. Your invited team members will join the
              organization you're creating now.
            </p>
          </FormItem>
        )}
      />
    </>
  );
};