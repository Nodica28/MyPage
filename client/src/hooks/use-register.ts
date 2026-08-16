import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RegisterFormData, RegistrationResponse, EmailCheckResponse, WebsiteCheckResponse } from "@/types/register";

export const useRegister = () => {
  return useMutation<RegistrationResponse, Error, RegisterFormData>({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response;
    }
  });
};

export const useCheckEmail = () => {
  return useMutation<EmailCheckResponse, Error, string>({
    mutationFn: async (email: string) => {
      const response = await apiRequest(
        `/api/users/check-email?email=${encodeURIComponent(email)}`,
        {
          method: "GET"
        }
      );
      return response;
    }
  });
};

export const useCheckWebsite = () => {
  return useMutation<WebsiteCheckResponse, Error, string>({
    mutationFn: async (website: string) => {
      const response = await apiRequest(
        `/api/organization/check-website?website=${encodeURIComponent(website)}`,
        {
          method: "GET"
        }
      );
      return {
        ...response,
        normalizedWebsite: website
      };
    }
  });
};

export const useUploadCompanyLogo = () => {
  return useMutation<string, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/db-images/public-upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      return data.url;
    }
  });
};