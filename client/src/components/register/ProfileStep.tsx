import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Briefcase } from "lucide-react";
import { RegisterFormData } from "@/schemas/register";

interface ProfileStepProps {
  form: UseFormReturn<RegisterFormData>;
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ form }) => {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Let's set up your profile</h1>
        <p className="text-muted-foreground mb-8">Tell us a bit about yourself</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input placeholder="First name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input placeholder="Last name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job title</FormLabel>
            <FormControl>
              <div className="flex relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  placeholder="e.g. Marketing Director, Product Manager"
                  className="pl-9 w-full"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};