import React from "react";
import {UseFormReturn} from "react-hook-form";
import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import {Textarea} from "@/components/ui/textarea";

interface AboutMeStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

export const AboutMeStep: React.FC<AboutMeStepProps> = ({form}) => {
  const bio = form.watch("bio");
  const characterCount = (bio || "").length;
  const maxLength = 500;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tell us a bit about you.</h1>
        <p className="text-muted-foreground mt-2">
          A short description helps others understand you at a glance.
        </p>
      </div>

      <FormField
        control={form.control}
        name="bio"
        render={({field}) => (
          <FormItem>
            <FormLabel>About me</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Keep it short — you can always update this later."
                className="min-h-[120px] resize-none"
                maxLength={maxLength}
                {...field}
              />
            </FormControl>
            <div className="flex justify-between items-center">
              <FormMessage />
              <span
                className={`text-xs ${
                  characterCount > maxLength * 0.9
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {characterCount}/{maxLength}
              </span>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
};
