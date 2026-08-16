import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert";
import {AlertCircle} from "lucide-react";

export function AuthErrorMessage() {
  // Use window.location.search to get query parameters since Wouter's useLocation
  // only returns the pathname portion
  const urlParams = new URLSearchParams(window.location.search);
  const errorCode = urlParams.get("error");

  if (!errorCode) return null;

  // Map error codes to user-friendly messages
  const getErrorMessage = (code: string) => {
    switch (code) {
      case "invalid_token":
        return {
          title: "Invalid Link",
          description:
            "The authentication link is invalid or has been tampered with."
        };
      case "expired_token":
        return {
          title: "Link Expired",
          description:
            "This authentication link has expired. Please request a new one."
        };
      case "user_not_found":
        return {
          title: "User Not Found",
          description: "We couldn't find an account associated with this email."
        };
      case "session_error":
        return {
          title: "Session Error",
          description:
            "There was a problem creating your session. Please try again."
        };
      case "server_error":
        return {
          title: "Server Error",
          description:
            "Something went wrong on our end. Please try again later."
        };
      default:
        return {
          title: "Authentication Error",
          description:
            "An error occurred during authentication. Please try again."
        };
    }
  };

  const {title, description} = getErrorMessage(errorCode);

  return (
    <Alert
      variant="destructive"
      className="mb-6 bg-red-50 border-red-200 text-red-800"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-6 w-6" />
        <div className="flex flex-col">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
