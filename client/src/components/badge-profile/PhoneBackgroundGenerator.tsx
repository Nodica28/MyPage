import React, {useRef, useImperativeHandle, forwardRef} from "react";
import QRCodeStyling from "qr-code-styling";
import {UserProfile} from "@/types/user";

interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
  socialProfiles?: Record<string, any> | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  qrLogoUrl?: string | null;
  qrCodeColor?: string | null;
}

interface PhoneBackgroundGeneratorProps {
  user: UserProfile;
  organization?: Organization | null;
  brandColor?: string;
  logoImage?: string;
}

export interface PhoneBackgroundGeneratorRef {
  downloadPhoneBackground: () => Promise<void>;
}

const PhoneBackgroundGenerator = forwardRef<
  PhoneBackgroundGeneratorRef,
  PhoneBackgroundGeneratorProps
>(({user, organization, brandColor = "#6248FF", logoImage}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper function to draw rounded rectangle (for browser compatibility)
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const generatePhoneBackground = async (): Promise<void> => {
    console.log("Starting phone background generation...");

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not available");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Canvas context not available");
      return;
    }

    // Set canvas dimensions for phone background (9:16 aspect ratio)
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Main container dimensions and position
    const containerWidth = 720;
    const containerHeight = 1200;
    const containerX = (width - containerWidth) / 2;
    const containerY = (height - containerHeight) / 2;

    // Draw main container with rounded corners and shadow
    ctx.save();

    // Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.13)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = 5;

    // Container background
    ctx.fillStyle = "#FFFFFF";
    drawRoundedRect(
      ctx,
      containerX,
      containerY,
      containerWidth,
      containerHeight,
      50
    );
    ctx.fill();

    // Container border
    ctx.strokeStyle = "#D7D3D0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Profile section
    const profileY = containerY + 80;

    // Profile picture container
    const profilePicSize = 200;
    const profilePicX = containerX + (containerWidth - profilePicSize) / 2;
    const profilePicY = profileY;

    // Draw profile picture background with gradient
    const gradient = ctx.createLinearGradient(
      profilePicX,
      profilePicY,
      profilePicX + profilePicSize,
      profilePicY + profilePicSize
    );
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.8)");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#D7D3D0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      profilePicX + profilePicSize / 2,
      profilePicY + profilePicSize / 2,
      profilePicSize / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Load and draw profile picture if available
    if (user.profileImage) {
      console.log("Loading profile image:", user.profileImage);
      try {
        const img = new Image();
        // Remove crossOrigin to avoid CORS issues with internal API
        // img.crossOrigin = "anonymous";

        // Add timeout to prevent hanging
        const imageLoadPromise = new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn("Profile image loading timed out after 5 seconds");
            resolve();
          }, 5000);

          img.onload = () => {
            clearTimeout(timeout);
            console.log("Profile image loaded successfully");
            try {
              ctx.save();
              ctx.beginPath();
              ctx.arc(
                profilePicX + profilePicSize / 2,
                profilePicY + profilePicSize / 2,
                (profilePicSize - 20) / 2,
                0,
                2 * Math.PI
              );
              ctx.clip();

              // Calculate dimensions for "cover" behavior (like CSS object-fit: cover)
              const targetSize = profilePicSize - 20;
              const targetX = profilePicX + 10;
              const targetY = profilePicY + 10;
              
              // Calculate scale to cover the entire circle
              const scaleX = targetSize / img.width;
              const scaleY = targetSize / img.height;
              const scale = Math.max(scaleX, scaleY); // Use larger scale to ensure full coverage
              
              // Calculate actual dimensions after scaling
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              
              // Center the image in the circle
              const offsetX = (targetSize - scaledWidth) / 2;
              const offsetY = (targetSize - scaledHeight) / 2;
              
              ctx.drawImage(
                img,
                targetX + offsetX,
                targetY + offsetY,
                scaledWidth,
                scaledHeight
              );
              ctx.restore();
            } catch (drawError) {
              console.warn("Error drawing profile image:", drawError);
            }
            resolve();
          };

          img.onerror = (error) => {
            clearTimeout(timeout);
            console.warn("Failed to load profile image:", error);
            resolve(); // Continue even if image fails to load
          };
        });

        img.src = user.profileImage;
        await imageLoadPromise;
      } catch (error) {
        console.warn("Error in profile picture loading:", error);
      }
    } else {
      console.log("No profile image available");
    }

    console.log("Drawing user name and job info...");

    // User name
    const nameY = profileY + profilePicSize + 40;
    ctx.fillStyle = "#1C1917";
    ctx.font = "bold 48px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const userName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User Name";
    ctx.fillText(userName, containerX + containerWidth / 2, nameY);

    // Job title and company with text wrapping
    const jobY = nameY + 60;
    ctx.fillStyle = "#44403C";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const jobTitle = user.title || "Professional";
    const companyName = organization?.name || user.companyName || "Company";

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontWeight: string = "400") => {
      ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== "") {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // Helper function to draw multi-line text
    const drawMultilineText = (lines: string[], x: number, startY: number, lineHeight: number, fontSize: number, fontWeight: string = "400") => {
      ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        ctx.fillText(line, x, y);
      });
    };

    // Text container constraints
    const textPadding = 40;
    const maxTextWidth = containerWidth - (textPadding * 2);
    const centerX = containerX + containerWidth / 2;
    
    // Try different approaches for fitting the text
    const jobTitleText = jobTitle;
    const companyText = `at ${companyName}`;
    
    // Variable to track the bottom position of the text
    let textBottomY = jobY;
    
    // Approach 1: Try to fit everything on one line with original font size
    let fontSize = 36;
    ctx.font = `400 ${fontSize}px Inter, sans-serif`;
    let jobTitleWidth = ctx.measureText(jobTitleText).width;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    let companyWidth = ctx.measureText(companyText).width;
    let totalWidth = jobTitleWidth + ctx.measureText(" ").width + companyWidth;
    
    if (totalWidth <= maxTextWidth) {
      // Single line - draw job title and company separately for different font weights
      const startX = centerX - totalWidth / 2;
      
      // Draw job title (regular weight)
      ctx.font = `400 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(jobTitleText, startX, jobY);
      
      // Draw company name (bold weight)
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.fillText(` ${companyText}`, startX + jobTitleWidth, jobY);
      
      // Update text bottom position
      textBottomY = jobY + fontSize / 2;
    } else {
      // Approach 2: Try smaller font size on one line
      fontSize = 32;
      ctx.font = `400 ${fontSize}px Inter, sans-serif`;
      jobTitleWidth = ctx.measureText(jobTitleText).width;
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      companyWidth = ctx.measureText(companyText).width;
      totalWidth = jobTitleWidth + ctx.measureText(" ").width + companyWidth;
      
      if (totalWidth <= maxTextWidth) {
        // Single line with smaller font
        const startX = centerX - totalWidth / 2;
        
        // Draw job title (regular weight)
        ctx.font = `400 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(jobTitleText, startX, jobY);
        
        // Draw company name (bold weight)
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.fillText(` ${companyText}`, startX + jobTitleWidth, jobY);
        
        // Update text bottom position
        textBottomY = jobY + fontSize / 2;
      } else {
        // Approach 3: Multi-line text
        fontSize = 32;
        const lineHeight = fontSize + 8;
        
        // Check if job title fits on one line
        ctx.font = `400 ${fontSize}px Inter, sans-serif`;
        const jobTitleFitsOneLine = ctx.measureText(jobTitleText).width <= maxTextWidth;
        
        if (jobTitleFitsOneLine) {
          // Job title on first line, company on second line
          ctx.textAlign = "center";
          ctx.fillText(jobTitleText, centerX, jobY);
          
          // Check if company text fits on one line
          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          const companyFitsOneLine = ctx.measureText(companyText).width <= maxTextWidth;
          
          if (companyFitsOneLine) {
            ctx.fillText(companyText, centerX, jobY + lineHeight);
            // Update text bottom position
            textBottomY = jobY + lineHeight + fontSize / 2;
          } else {
            // Wrap company text
            const companyLines = wrapText(companyText, maxTextWidth, fontSize, "600");
            drawMultilineText(companyLines, centerX, jobY + lineHeight, lineHeight, fontSize, "600");
            // Update text bottom position
            textBottomY = jobY + lineHeight + (companyLines.length * lineHeight) - lineHeight / 2 + fontSize / 2;
          }
        } else {
          // Both need wrapping
          const jobLines = wrapText(jobTitleText, maxTextWidth, fontSize, "400");
          const companyLines = wrapText(companyText, maxTextWidth, fontSize, "600");
          
          // Draw job title lines
          drawMultilineText(jobLines, centerX, jobY, lineHeight, fontSize, "400");
          
          // Draw company lines
          const companyStartY = jobY + (jobLines.length * lineHeight);
          drawMultilineText(companyLines, centerX, companyStartY, lineHeight, fontSize, "600");
          
          // Update text bottom position
          textBottomY = companyStartY + (companyLines.length * lineHeight) - lineHeight / 2 + fontSize / 2;
        }
      }
    }

    // QR Code section
    const qrSize = 400; // Slightly smaller to fit better in the container
    const qrX = containerX + (containerWidth - qrSize) / 2;
    const qrY = textBottomY + 80; // Position after text with spacing

    // QR Code background container
    const qrContainerPadding = 30;
    const qrContainerX = qrX - qrContainerPadding;
    const qrContainerY = qrY - qrContainerPadding;
    const qrContainerWidth = qrSize + qrContainerPadding * 2;
    const qrContainerHeight = qrSize + qrContainerPadding * 2; // Extra space for spacing

    console.log(
      `Drawing QR container at (${qrContainerX}, ${qrContainerY}) with size ${qrContainerWidth}x${qrContainerHeight}`
    );

    // QR Code background
    ctx.fillStyle = "#FAFAF9";
    ctx.strokeStyle = "#D7D3D0";
    ctx.lineWidth = 1.5;
    drawRoundedRect(
      ctx,
      qrContainerX,
      qrContainerY,
      qrContainerWidth,
      qrContainerHeight,
      30
    );
    ctx.fill();
    ctx.stroke();

    console.log(
      `QR code will be drawn at (${qrX}, ${qrY}) with size ${qrSize}x${qrSize}`
    );

    // Generate and draw QR code
    const qrUrl = user.publicPath
      ? `${window.location.origin}/${user.publicPath}`
      : `${window.location.origin}/profile/${user.id}`;
    console.log("Generating QR code for URL:", qrUrl);

    try {
      // Function to get absolute URL for logo image (same as in QRCodeStyled)
      const getAbsoluteLogoUrl = (logoPath: string) => {
        if (!logoPath) return "";
        if (logoPath.startsWith("http") || logoPath.startsWith("data:")) {
          return logoPath;
        }
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        return `${baseUrl}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
      };

      const absoluteLogoUrl = getAbsoluteLogoUrl(
        logoImage || organization?.qrLogoUrl || ""
      );
      console.log("Using logo URL:", absoluteLogoUrl);

      // Create QRCodeStyling instance with the same settings as QRCodeDisplay
      const qrCode = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        type: "canvas",
        data: qrUrl,
        margin: 0,
        dotsOptions: {
          color: brandColor,
          type: "rounded"
        },
        backgroundOptions: {
          color: "#FFFFFF"
        },
        cornersSquareOptions: {
          type: "extra-rounded",
          color: brandColor
        },
        cornersDotOptions: {
          type: "dot",
          color: brandColor
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

      console.log("QR code styling instance created");

      // Get the raw data (canvas) from QRCodeStyling
      const qrBlob = await qrCode.getRawData();
      if (qrBlob) {
        console.log("QR code blob generated successfully");

        // Convert blob to image
        const qrImg = new Image();
        let qrDrawn = false;

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn(
              "QR code image loading timed out, drawing placeholder"
            );
            if (!qrDrawn) {
              // Draw placeholder if QR code fails
              ctx.fillStyle = "#E5E7EB";
              ctx.fillRect(qrX, qrY, qrSize, qrSize);
              ctx.fillStyle = "#6B7280";
              ctx.font = "24px Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(
                "QR Code",
                containerX + containerWidth / 2,
                qrY + qrSize / 2
              );
            }
            resolve();
          }, 5000);

          qrImg.onload = () => {
            clearTimeout(timeout);
            console.log(
              "QR code image loaded, dimensions:",
              qrImg.width,
              "x",
              qrImg.height
            );
            try {
              // Save context state
              ctx.save();

              // Ensure proper drawing settings
              ctx.globalAlpha = 1.0;
              ctx.globalCompositeOperation = "source-over";

              // Draw the QR code
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              console.log(
                `QR code drawn to canvas at position (${qrX}, ${qrY}) with size ${qrSize}x${qrSize}`
              );

              // Restore context state
              ctx.restore();
              qrDrawn = true;
            } catch (drawError) {
              console.error("Error drawing QR code to canvas:", drawError);
            }
            resolve();
          };

          qrImg.onerror = (error) => {
            clearTimeout(timeout);
            console.error("QR code image load error:", error);
            // Draw placeholder if QR code fails
            ctx.fillStyle = "#E5E7EB";
            ctx.fillRect(qrX, qrY, qrSize, qrSize);
            ctx.fillStyle = "#6B7280";
            ctx.font = "24px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              "QR Code",
              containerX + containerWidth / 2,
              qrY + qrSize / 2
            );
            resolve();
          };

          // Convert blob to data URL and set as image source
          const url = URL.createObjectURL(qrBlob as Blob);
          qrImg.src = url;
        });
      } else {
        throw new Error("Failed to generate QR code blob");
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      // Draw placeholder if QR code generation fails
      ctx.fillStyle = "#E5E7EB";
      ctx.fillRect(qrX, qrY, qrSize, qrSize);
      ctx.fillStyle = "#6B7280";
      ctx.font = "24px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "QR Code",
        containerX + containerWidth / 2,
        qrY + qrSize / 2
      );
    }

    // Call-to-action text
    const ctaY = qrY + qrSize + 120; // Adjusted spacing
    ctx.fillStyle = "#1C1917";
    ctx.font = "500 36px Akshar, sans-serif"; // Slightly smaller font
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.4px";
    ctx.fillText("👋 LET'S CONNECT", containerX + containerWidth / 2, ctaY);

    console.log(`CTA text drawn at y position: ${ctaY}`);

    console.log("Phone background generation completed successfully");
  };

  useImperativeHandle(ref, () => ({
    downloadPhoneBackground: async () => {
      console.log("downloadPhoneBackground called");
      try {
        await generatePhoneBackground();

        const canvas = canvasRef.current;
        if (!canvas) {
          console.error("Canvas not available for download");
          return;
        }

        console.log("Creating download link...");
        // Create download link
        const link = document.createElement("a");
        const fileName = `${user.firstName || "user"}-${user.lastName || "badge"}-phone-background.png`;

        link.download = fileName;
        link.href = canvas.toDataURL("image/png");

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("Download triggered successfully");
      } catch (error) {
        console.error("Error in downloadPhoneBackground:", error);
        throw error;
      }
    }
  }));

  return (
    <canvas ref={canvasRef} style={{display: "none"}} aria-hidden="true" />
  );
});

PhoneBackgroundGenerator.displayName = "PhoneBackgroundGenerator";

export {PhoneBackgroundGenerator};
