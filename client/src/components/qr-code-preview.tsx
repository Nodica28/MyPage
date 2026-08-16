import {Card, CardContent} from "@/components/ui/card";
import {useState, useEffect} from "react";
import QRPreview from "./assets/dynamic-icons/QRPreview";
import QRLogoPreview from "./assets/dynamic-icons/QRLogoPreview";
interface QRCodePreviewProps {
  color: string;
  size?: number;
  logoUrl?: string;
}

/**
 * A component that renders a QR code preview for settings pages.
 * This component shows a live preview of QR code with current styling options
 * Used by org admins to preview QR code settings before pushing to users.
 */
export function QRCodePreview({
  color,
  size = 200,
  logoUrl = "/badge-qr-logo.svg"
}: QRCodePreviewProps) {
  const [message, setMessage] = useState<string | null>(null);

  // Effects to show a helpful message about the QR code preview
  useEffect(() => {
    setMessage(
      // eslint-disable-next-line
      'Note: QR code will update when you click "Save Changes"'
    );

    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [color, logoUrl]);

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="p-4 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          {message && (
            <div className="text-xs text-slate-500 mb-2 text-center">
              {message}
            </div>
          )}

          <div
            className="bg-white rounded shadow-sm p-4"
            style={{width: size, height: size}}
          >
            {/* QR code preview with SVG */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Apply color to the SVG via CSS currentColor */}
              <div style={{color: color, width: size, height: size}}>
                <QRPreview color={color} style={{width: size, height: size}} />
              </div>

              {/* Logo overlay in the center if it exists */}
              {logoUrl ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <img
                      src={logoUrl}
                      alt="QR Logo"
                      className="object-contain"
                      style={{width: size * 0.22, height: size * 0.22}}
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="bg-white rounded-xl flex items-center justify-center shadow-sm"
                    style={{width: size * 0.22, height: size * 0.22}}
                  >
                    <QRLogoPreview
                      color={color}
                      style={{width: size * 0.22, height: size * 0.22}}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
