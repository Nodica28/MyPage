import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        navigate("/auth");
      } catch (error) {
        console.error("Logout failed:", error);
        // Still redirect to auth page even if logout fails
        navigate("/auth");
      }
    };

    performLogout();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Logging you out...</p>
      </div>
    </div>
  );
}