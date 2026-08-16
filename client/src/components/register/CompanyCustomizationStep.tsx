import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChromePicker } from "react-color";
import { UploadCloud } from "lucide-react";
import { RegisterFormData } from "@/schemas/register";

interface CompanyCustomizationStepProps {
  form: UseFormReturn<RegisterFormData>;
  companyLogoPreview: string | null;
  onCompanyLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export const CompanyCustomizationStep: React.FC<CompanyCustomizationStepProps> = ({
  form,
  companyLogoPreview,
  onCompanyLogoChange,
  onRemoveLogo
}) => {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Create your company</h1>
        <p className="text-muted-foreground mb-8">Tell us about your company</p>
      </div>

      <FormField
        control={form.control}
        name="company.primaryColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Primary Color</FormLabel>
            <FormControl>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-lg px-4 justify-between font-normal flex"
                  >
                    <div className="flex w-full justify-between gap-3">
                      <p className="text-sm">{field.value?.toUpperCase()}</p>
                      <div
                        className="h-6 w-6 rounded-md"
                        style={{ backgroundColor: field.value }}
                      />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <ChromePicker
                    color={field.value || "#45B4BB"}
                    onChange={(color) => field.onChange(color.hex)}
                  />
                </PopoverContent>
              </Popover>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">
          Company logo (optional)
        </label>
        <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition">
          {companyLogoPreview ? (
            <div className="text-center space-y-3">
              <div className="relative w-full h-auto mx-auto border border-gray-200 p-2">
                <img
                  src={companyLogoPreview}
                  alt="Company logo preview"
                  className="w-auto h-auto max-h-40 mx-auto object-contain"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <p className="text-sm text-green-600 font-medium">
                  Image selected!
                </p>
                <p className="text-xs text-gray-500">
                  Logo will be uploaded when you register
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRemoveLogo}
                  className="mt-2"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2 flex text-sm text-gray-600">
                <label
                  htmlFor="company-logo"
                  className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none"
                >
                  <span>Upload a file</span>
                  <input
                    id="company-logo"
                    name="company-logo"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={onCompanyLogoChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};