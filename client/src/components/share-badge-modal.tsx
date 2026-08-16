"use client";

import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Download, Share, Copy, Loader2} from "lucide-react";
import {User} from "@/types/user";
import {useToast} from "@/hooks/use-toast";
import {Card, CardContent} from "@/components/ui/card";

interface ShareBadgeModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareBadgeModal({
  user,
  open,
  onOpenChange
}: ShareBadgeModalProps) {
  const {toast} = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization settings when the modal opens
  useEffect(() => {
    if (open && user?.organizationId) {
      setIsLoading(true);
      fetch("/api/organization")
        .then((response) => {
          if (!response.ok)
            throw new Error("Failed to fetch organization settings");
          return response.json();
        })
        .catch((err) => {
          console.error("Error fetching organization settings:", err);
          // Don't set error - we can still show the QR code without org settings
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, user?.organizationId]);

  const downloadQRCode = () => {
    if (!user.qrCodeUrl) return;

    const link = document.createElement("a");
    link.href = user.qrCodeUrl;
    link.download = `${user.firstName}-${user.lastName}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR Code Downloaded",
      description: "QR code has been downloaded"
    });
  };

  const shareQRCode = async () => {
    if (user.qrCodeUrl && navigator.share) {
      try {
        // Fetch the image
        const response = await fetch(user.qrCodeUrl);
        const blob = await response.blob();

        // Create file from blob
        const file = new File(
          [blob],
          `${user.firstName}-${user.lastName}-qr-code.png`,
          {
            type: "image/png"
          }
        );

        await navigator.share({
          title: `${user.firstName} ${user.lastName} QR Code`,
          files: [file]
        });
      } catch (error) {
        console.error("Error sharing QR code:", error);
        // If sharing fails, fall back to copying URL
        copyUrl();

        toast({
          title: "Sharing not supported",
          description:
            "URL copied to clipboard instead. Try downloading the QR code."
        });
      }
    } else {
      // If Web Share API is not supported or QR code URL is not available, fall back to copying URL
      copyUrl();

      toast({
        title: "Sharing not supported",
        description:
          "URL copied to clipboard instead. Try downloading the QR code."
      });
    }
  };

  const copyUrl = () => {
    // Copy profile URL to clipboard
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/${user.publicPath}`;
    navigator.clipboard.writeText(profileUrl);

    toast({
      title: "URL Copied",
      description: "Profile URL copied to clipboard!"
    });
  };

  // Get the QR code URL from the user data
  const qrCodeUrl = user.qrCodeUrl;

  const generateQRCode = () => {
    setIsLoading(true);
    setError(null);
    fetch("/api/users/ensure-qr-code")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to generate QR code");
        return response.json();
      })
      .then((data) => {
        // Update user object with new QR code URL
        if (user) {
          user.qrCodeUrl = data.qrCodeUrl;
        }
        setError(null);
      })
      .catch((err) => {
        console.error("Error generating QR code:", err);
        setError("Could not generate QR code. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your Badge</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Your QR code and profile URL are ready to share
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <p className="text-sm text-center text-muted-foreground mb-4">
            This is your unique QR code to link to your page
          </p>
          <Card className="w-full shadow-sm mb-4">
            <CardContent className="p-8 flex justify-center items-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <Loader2 className="h-16 w-16 text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Generating your QR code...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="w-20 h-20 text-red-500 mb-4 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{error}</p>
                  <Button
                    variant="outline"
                    onClick={generateQRCode}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              ) : user && user.publicPath && qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-full max-w-[280px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="w-20 h-20 text-indigo-500 mb-4 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="5" height="5" x="3" y="3" rx="1" />
                      <rect width="5" height="5" x="16" y="3" rx="1" />
                      <rect width="5" height="5" x="3" y="16" rx="1" />
                      <path d="M21 16v.01" />
                      <path d="M12 7v.01" />
                      <path d="M7 12v.01" />
                      <path d="M12 12v.01" />
                      <path d="M17 12v.01" />
                      <path d="M12 17v.01" />
                      <path d="M17 17v.01" />
                      <path d="M21 12v.01" />
                      <path d="M21 7v.01" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No QR code found. We'll generate one automatically when you
                    share your page.
                  </p>
                  <Button
                    variant="outline"
                    onClick={generateQRCode}
                    className="mt-2"
                  >
                    Generate QR Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-3 w-full">
            <Button
              variant="outline"
              onClick={shareQRCode}
              disabled={isLoading || !!error || !user?.publicPath || !qrCodeUrl}
              className="flex items-center justify-center"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={downloadQRCode}
              disabled={isLoading || !!error || !user?.publicPath || !qrCodeUrl}
              className="flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={copyUrl}
              disabled={!user?.publicPath}
              className="flex items-center justify-center"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareBadgeModal;
