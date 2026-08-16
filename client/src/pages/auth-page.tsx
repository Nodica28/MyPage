import {useAuth} from "@/hooks/use-auth";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Link, useLocation} from "wouter";
import {Loader2} from "lucide-react";
import {ProfilePreview} from "@/components/badge-profile/ProfilePreview";
import {MagicLinkForm} from "@/components/magic-link-form";
import {AuthErrorMessage} from "@/components/auth-error-message";

export default function AuthPage() {
  const {user} = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      // Check if there's a redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect");

      if (redirectTo) {
        // Decode and redirect to the intended destination
        try {
          const decodedRedirect = decodeURIComponent(redirectTo);
          setLocation(decodedRedirect);
        } catch (error) {
          console.error("Error decoding redirect URL:", error);
          setLocation("/");
        }
      } else {
        // Default redirect to home
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="p-8">
            <div>
              <h1 className="text-2xl font-semibold">Welcome back!</h1>
              <p className="text-muted-foreground mb-6">
                Sign in to your account
              </p>
            </div>
            <AuthErrorMessage />

            {/* OAuth Buttons */}
            <div className="space-y-2">
              <GoogleAuthButton />
              <SlackAuthButton />
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-border"></div>
              <span className="text-muted-foreground text-sm">OR</span>
              <div className="h-px flex-1 bg-border"></div>
            </div>

            {/* Magic Link Form */}
            <MagicLinkForm />

            <div className="mt-7 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Preview */}
      <div className="hidden lg:flex flex-1 bg-muted relative overflow-hidden">
        <div className="absolute top-1/2 right-2 w-full flex justify-end items-center z-10 -mt-12">
          <div className="bg-gradient-to-r from-cyan-300 to-blue-600 font-semibold p-1 rounded-full">
            <span className="flex w-full bg-white text-black p-2 rounded-full items-center">
              built with{" "}
              <span>
                <img
                  src="/light-mode-logo.svg"
                  alt="Badge"
                  className="h-5 ml-1 mt-1"
                />
              </span>
            </span>
          </div>
        </div>
        <div className="absolute top-1/3 left-1/4 w-[950px] h-[950px]">
          <ProfilePreview
            quickLinks={[]}
            sections={[]}
            backgroundStyle={{}}
            backgroundImage={"/backgrounds/banners/cloudy-background.png"}
            onOpenExternal={() => {}}
            className="w-full h-full"
            buttonColor="#000000"
            iconColor="#000000"
            isRegister={true}
            userProfile={{
              id: 0,
              uniquePathId: "sample",
              publicPath: "john.doe",
              firstName: "John",
              lastName: "Doe",
              title: "Product Manager",
              email: "john@example.com",
              bio: "Experienced product manager with a passion for building great products",
              profileImage: "/placeholder/placeholder-avatar.jpg",
              phoneNumber: null,
              linkedinProfile: null
            }}
            organization={{
              id: 1,
              name: "Sample Company",
              logo: "",
              description: "Building the future of work",
              website: "https://example.com",
              defaultColor: null
            }}
          />
        </div>
      </div>
    </div>
  );
}

function GoogleAuthButton() {
  const {googleLogin} = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    try {
      googleLogin();
    } catch (error) {
      setIsGoogleLoading(false);
      console.error("Google login error:", error);
    }
  };

  // Check for OAuth errors in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "oauth_failed") {
      console.error("Google OAuth failed");
      setIsGoogleLoading(false);
    }
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={isGoogleLoading}
    >
      {isGoogleLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <img src="/icons/google.svg" alt="Google" className="mr-2 h-5 w-5" />
      )}
      Continue with Google
    </Button>
  );
}

function SlackAuthButton() {
  const {slackLogin} = useAuth();
  const [isSlackLoading, setIsSlackLoading] = useState(false);

  const handleSlackLogin = () => {
    setIsSlackLoading(true);
    try {
      slackLogin();
    } catch (error) {
      setIsSlackLoading(false);
      console.error("Slack login error:", error);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleSlackLogin}
      disabled={isSlackLoading}
    >
      {isSlackLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <img src="/icons/slack.svg" alt="Slack" className="mr-2 h-5 w-5" />
      )}
      Continue with Slack
    </Button>
  );
}
