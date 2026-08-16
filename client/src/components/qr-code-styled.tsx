"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import QRCodeStyling from "qr-code-styling";

export interface QRCodeRef {
  download: () => void;
}

export interface QRCodeStyledProps {
  data: string;
  width?: number;
  height?: number;
  margin?: number;
  type?: "canvas" | "svg";
  shape?: "square" | "circle";
  color?: string;
  backgroundColor?: string;
  dotType?:
    | "rounded"
    | "dots"
    | "classy"
    | "classy-rounded"
    | "square"
    | "extra-rounded";
  cornersDotType?: "dot" | "square" | "extra-rounded";
  cornersSquareType?: "dot" | "square" | "extra-rounded";
  logoImage?: string;
  downloadFileName?: string;
  showControls?: boolean;
  className?: string;
}

export const QRCodeStyled = forwardRef<QRCodeRef, QRCodeStyledProps>(
  (
    {
      data,
      width = 150,
      height = 150,
      margin = 0,
      type = "svg",
      shape = "square",
      color = "#000000",
      backgroundColor = "#ffffff",
      dotType = "rounded",
      cornersDotType = "dot",
      cornersSquareType = "extra-rounded",
      logoImage = "",
      downloadFileName = "qr-code",
      showControls = false,
      className = ""
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const qrCodeRef = useRef<QRCodeStyling | null>(null);
    const [dataURL, setDataURL] = useState<string | null>(null);

    // Function to get absolute URL for logo image
    const getAbsoluteLogoUrl = (logoPath: string) => {
      if (!logoPath) return "";

      // If it's already an absolute URL or a data URL, return as is
      if (logoPath.startsWith("http") || logoPath.startsWith("data:")) {
        return logoPath;
      }

      // If it's a relative path, make it absolute
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      return `${baseUrl}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
    };

    useImperativeHandle(ref, () => ({
      download: () => {
        if (qrCodeRef.current) {
          qrCodeRef.current.download({
            name: downloadFileName,
            extension: type === "svg" ? "svg" : "png"
          });
        }
      }
    }));

    useEffect(() => {
      if (!data) return;

      const absoluteLogoUrl = getAbsoluteLogoUrl(logoImage);

      const qrCode = new QRCodeStyling({
        width,
        height,
        type,
        shape,
        data,
        margin,
        dotsOptions: {
          color: color,
          type: dotType
        },
        backgroundOptions: {
          color: backgroundColor
        },
        cornersSquareOptions: {
          type: cornersSquareType,
          color: color
        },
        cornersDotOptions: {
          type: cornersDotType,
          color: color
        },
        ...(absoluteLogoUrl
          ? {
              image: absoluteLogoUrl,
              imageOptions: {
                crossOrigin: "anonymous",
                imageSize: 0.5,
                margin: 0.4,
                hideBackgroundDots: true
              }
            }
          : {})
      });

      qrCodeRef.current = qrCode;

      // Clear existing QR code
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        qrCode.append(containerRef.current);
      }

      // Generate data URL for download button
      if (showControls) {
        qrCode.getRawData().then((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob as Blob);
            setDataURL(url);
          }
        });
      }

      return () => {
        // Cleanup dataURL when component unmounts
        if (dataURL) {
          URL.revokeObjectURL(dataURL);
        }
      };
    }, [
      data,
      width,
      height,
      margin,
      type,
      shape,
      color,
      backgroundColor,
      dotType,
      cornersSquareType,
      cornersDotType,
      logoImage,
      showControls
    ]);

    return (
      <div className={`qr-code-container ${className}`}>
        <div ref={containerRef} className="qr-code"></div>
        {showControls && (
          <div className="qr-controls mt-2 flex justify-center">
            <button
              onClick={() => {
                if (qrCodeRef.current) {
                  qrCodeRef.current.download({
                    name: downloadFileName,
                    extension: type === "svg" ? "svg" : "png"
                  });
                }
              }}
              className="text-xs bg-transparent hover:bg-gray-100 text-gray-800 py-1 px-2 border border-gray-300 rounded"
            >
              Download QR
            </button>
          </div>
        )}
      </div>
    );
  }
);

QRCodeStyled.displayName = "QRCodeStyled";

export default QRCodeStyled;
