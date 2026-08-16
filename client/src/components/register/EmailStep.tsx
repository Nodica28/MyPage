import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { RegisterFormData } from "@/schemas/register";

interface EmailStepProps {
  form: UseFormReturn<RegisterFormData>;
  isGoogleLoading: boolean;
  onGoogleSignup: () => void;
  isSlackLoading: boolean;
  onSlackSignup: () => void;
  isCheckingEmail: boolean;
}

export const EmailStep: React.FC<EmailStepProps> = ({
  form,
  isGoogleLoading,
  onGoogleSignup,
  isSlackLoading,
  onSlackSignup,
  isCheckingEmail
}) => {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Start your free trial</h1>
        <p className="text-muted-foreground mb-5">
          Enter your work email to get started
        </p>
      </div>
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email*</FormLabel>
            <FormControl>
              <Input placeholder="name@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="text-center text-muted-foreground mb-4 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border"></div>
          <span className="text-muted-foreground text-sm">OR</span>
          <div className="h-px flex-1 bg-border"></div>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          onClick={onGoogleSignup}
          variant="outline"
          className="w-full"
          disabled={isCheckingEmail || isGoogleLoading || isSlackLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <img
              src="/icons/google.svg"
              alt="Google"
              className="mr-2 h-5 w-5"
            />
          )}
          Sign up with Google
        </Button>
        <Button
          type="button"
          onClick={onSlackSignup}
          variant="outline"
          className="w-full"
          disabled={isCheckingEmail || isGoogleLoading || isSlackLoading}
        >
          {isSlackLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <img
              src="/icons/slack.svg"
              alt="Slack"
              className="mr-2 h-5 w-5"
            />
          )}
          Sign up with Slack
        </Button>
      </div>
    </>
  );
};