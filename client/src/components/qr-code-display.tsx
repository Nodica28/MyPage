"use client";

import React, {useState, useRef, useImperativeHandle, forwardRef} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {Copy, Share2} from "lucide-react";
import {User} from "@/types/user";
import {useToast} from "@/hooks/use-toast";
import {QRCodeStyled, QRCodeRef} from "@/components/qr-code-styled";
import {LeadSettings} from "@/shared/types/lead";

interface QRCodeDisplayProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showControls?: boolean;
  showShareButton?: boolean;
  className?: string;
  customDialogTitle?: string;
  customDescription?: string;
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  logoImage?: string;
  brandColor?: string;
  leadSettings?: LeadSettings;
  onAdjustPageSettings?: () => void;
}

export interface QRCodeDisplayRef {
  download: () => void;
}

export const QRCodeDisplay = forwardRef<QRCodeDisplayRef, QRCodeDisplayProps>(
  (
    {
      user,
      customDialogTitle,
      customDescription,
      dialogOpen,
      onDialogOpenChange,
      logoImage = "",
      brandColor = "#3b82f6",
      leadSettings,
      onAdjustPageSettings
    },
    ref
  ) => {
    // Use internal state for dialog open if not controlled externally
    const [internalQrDialogOpen, setInternalQrDialogOpen] = useState(false);
    const {toast} = useToast();
    const largeQrRef = useRef<QRCodeRef>(null);
    const downloadQrRef = useRef<QRCodeRef>(null);

    // Expose download method to parent component
    useImperativeHandle(ref, () => ({
      download: () => {
        console.log("QRCodeDisplay download method called");
        console.log("downloadQrRef.current:", downloadQrRef.current);

        if (downloadQrRef.current) {
          // High-resolution QR code is available, download immediately
          console.log("Calling downloadQrRef.current.download()");
          downloadQrRef.current.download();
          toast({
            title: "QR Code Downloaded",
            description: "High-resolution QR code has been downloaded"
          });
        } else {
          console.log(
            "High-resolution QR code not available, fallback to display QR"
          );
          if (largeQrRef.current) {
            // Fallback to display QR code if high-res not available
            largeQrRef.current.download();
            toast({
              title: "QR Code Downloaded",
              description: "QR code has been downloaded"
            });
          } else {
            toast({
              title: "Error",
              description: "QR code could not be generated. Please try again.",
              variant: "destructive"
            });
          }
        }
      }
    }));

    // Use external state if provided, otherwise use internal state
    const qrDialogOpen =
      dialogOpen !== undefined ? dialogOpen : internalQrDialogOpen;
    const setQrDialogOpen = onDialogOpenChange || setInternalQrDialogOpen;

    if (!user?.publicPath) {
      return null;
    }

    // Get the public profile URL
    const baseUrl = window.location.origin;

    // Only add fromQr parameter if captureFromQr is enabled in lead settings
    const shouldCaptureFromQr = leadSettings?.captureFromQr === true;
    const queryParam = shouldCaptureFromQr ? "?fromQr=true" : "";
    const profileUrl = `${baseUrl}/${user.publicPath}${queryParam}`;

    const copyProfileUrl = () => {
      navigator.clipboard.writeText(profileUrl);
      toast({
        title: "URL Copied",
        description: "Profile URL copied to clipboard"
      });
    };

    // Method to share the profile URL using Web Share API
    const shareProfileUrl = () => {
      if (navigator.share) {
        navigator
          .share({
            title: `${user.firstName}'s Badge Profile`,
            url: profileUrl
          })
          .catch((err) => {
            console.error("Error sharing:", err);
            // Fallback to copy
            copyProfileUrl();
          });
      } else {
        // Fallback: Copy to clipboard
        copyProfileUrl();
      }
    };

    return (
      <>
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-[479px] p-0 gap-0 rounded-xl overflow-hidden">
            {/* Modal Header */}
            <div className="relative flex flex-col stretch gap-4 px-6 pt-6 pb-0">
              {/* Content */}
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-2xl font-semibold text-stone-900">
                  {customDialogTitle || "Share your Badge Profile"}
                </DialogTitle>
                <p className="text-sm text-stone-600">
                  {customDescription ||
                    "This is your unique QR code to link to your page"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col justify-center items-center gap-5 px-6 py-5">
              {/* QR Code Container */}
              <div className="flex flex-col justify-center items-center self-stretch gap-5 px-6 py-5 bg-stone-50 rounded-lg">
                <div className="flex flex-col justify-center items-center w-[173px] h-[185px]">
                  <QRCodeStyled
                    ref={largeQrRef}
                    data={profileUrl}
                    width={173}
                    height={173}
                    color={brandColor}
                    type="canvas"
                    dotType="rounded"
                    showControls={false}
                    downloadFileName={`${user.firstName}-${user.lastName}-qr-code`}
                    className="shadow-none"
                    logoImage={logoImage}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-stretch items-stretch gap-2.5 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 gap-1 px-3.5 py-2.5 border border-stone-200 rounded-lg shadow-sm"
                    onClick={shareProfileUrl}
                  >
                    <Share2 className="h-4 w-4 text-stone-600" />
                    <span className="text-sm font-semibold text-stone-600">
                      Share
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1 h-10 gap-1 px-3.5 py-2.5 border border-stone-200 rounded-lg shadow-sm"
                    onClick={copyProfileUrl}
                  >
                    <Copy className="h-4 w-4 text-stone-600" />
                    <span className="text-sm font-semibold text-stone-600">
                      Copy Link
                    </span>
                  </Button>
                </div>
              </div>

              {/* Footer Section */}
              <div className="flex justify-center items-center self-stretch flex-wrap gap-1.5">
                <p className="text-sm text-stone-600">
                  Form submission required to view page
                </p>
                <Button
                  variant="link"
                  className="h-6 p-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={() => {
                    if (onAdjustPageSettings) {
                      onAdjustPageSettings();
                    } else {
                      // Fallback to the existing toast
                      toast({
                        title: "Coming Soon",
                        description:
                          "Page settings adjustment will be available soon."
                      });
                    }
                  }}
                >
                  Adjust Page settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden high-resolution QR code for downloads (1024x1024) */}
        <div style={{display: "none"}} aria-hidden="true">
          <QRCodeStyled
            ref={downloadQrRef}
            data={profileUrl}
            width={1024}
            height={1024}
            color={brandColor}
            type="canvas"
            dotType="rounded"
            showControls={false}
            downloadFileName={`${user.firstName}-${user.lastName}-qr-code-hd`}
            logoImage={logoImage}
          />
        </div>
      </>
    );
  }
);

QRCodeDisplay.displayName = "QRCodeDisplay";

export default QRCodeDisplay;
