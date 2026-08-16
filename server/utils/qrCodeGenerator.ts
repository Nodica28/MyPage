import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import Jimp from "jimp";
import axios from "axios"; // Add axios for HTTP requests

// Simple import without DOM dependencies
console.log(
  "[QR Code] Initialized QR code generator with logo support using Jimp"
);

// QR Code style options
export interface QRCodeStyleOptions {
  width?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
  logoUrl?: string; // Path to the logo image or DB image URL
}

/**
 * Generates a QR code with optimized options for better aesthetics
 * including support for logo overlay using Jimp
 */
export async function generateQRCode(
  data: string,
  options: QRCodeStyleOptions = {}
): Promise<string> {
  const {
    width = 400, // Standard size
    errorCorrectionLevel = "H", // High error correction for logo support
    margin = 4, // Standard QR code margin
    color = {dark: "#000000", light: "#FFFFFF"}, // Default to black for better contrast
    logoUrl // Path to the logo image
  } = options;

  console.log("[QR Code] Generating QR code with options:", {
    width,
    errorCorrectionLevel,
    margin,
    color,
    logoUrl: logoUrl || "none"
  });

  try {
    // Generate a QR code using qrcode library
    const qrOptions = {
      errorCorrectionLevel: errorCorrectionLevel as any,
      margin: margin,
      color: {
        dark: color.dark,
        light: color.light
      },
      width: width
    };

    // Generate the QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(data, qrOptions);

    // If no logo is provided, return the QR code as is
    if (!logoUrl) {
      console.log("[QR Code] Generated QR code without logo");
      return qrCodeDataUrl;
    }

    console.log("[QR Code] Attempting to add logo to QR code:", logoUrl);

    try {
      // Load QR code image from data URL
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
      const qrImage = await Jimp.read(qrBuffer);

      // Load logo image from different sources
      let logoImage: Jimp;

      // Check if the logo URL is a database image URL
      if (logoUrl.startsWith("/api/db-images/")) {
        console.log("[QR Code] Using logo from database:", logoUrl);

        try {
          // Get the server's base URL from environment or use localhost
          const baseUrl = process.env.SERVER_URL || "http://localhost:5000";
          const fullUrl = `${baseUrl}${logoUrl}`;

          console.log("[QR Code] Fetching image from:", fullUrl);

          // Fetch the image from the database API
          const response = await axios.get(fullUrl, {
            responseType: "arraybuffer"
          });

          // Create a buffer from the response data
          const imageBuffer = Buffer.from(response.data);

          // Load the image into Jimp
          logoImage = await Jimp.read(imageBuffer);
          console.log("[QR Code] Successfully loaded image from database");
        } catch (dbError) {
          console.error(
            "[QR Code] Failed to load image from database:",
            dbError
          );
          return qrCodeDataUrl; // Return QR code without logo on error
        }
      }
      // Process local file paths (original method)
      else if (logoUrl.startsWith("/uploads/")) {
        const basePath = process.cwd();
        const logoFilePath = path.join(basePath, logoUrl.substring(1));
        console.log("[QR Code] Using logo from local path:", logoFilePath);

        // Verify the file exists
        if (!fs.existsSync(logoFilePath)) {
          console.error("[QR Code] Logo file not found:", logoFilePath);
          return qrCodeDataUrl; // Return QR code without logo
        }

        // Load the image from the file system
        logoImage = await Jimp.read(logoFilePath);
      }
      // Handle other URL formats
      else {
        console.log("[QR Code] Logo URL is not a supported format:", logoUrl);
        return qrCodeDataUrl; // Return QR code without logo
      }

      // Resize logo to 25% of QR code size
      const logoSize = Math.floor(qrImage.getWidth() * 0.25);
      logoImage.resize(logoSize, logoSize);

      // Create a white circle mask for the logo
      const circleMask = new Jimp(logoSize, logoSize, 0xffffffff);

      // Apply the mask to the logo (a simple approach without perfect circle)
      logoImage.mask(circleMask, 0, 0);

      // Calculate position to center the logo
      const logoX = (qrImage.getWidth() - logoImage.getWidth()) / 2;
      const logoY = (qrImage.getHeight() - logoImage.getHeight()) / 2;

      // Overlay the logo onto the QR code
      qrImage.composite(logoImage, logoX, logoY, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 1,
        opacityDest: 1
      });

      // Convert back to data URL
      const finalQrBuffer = await qrImage.getBufferAsync(Jimp.MIME_PNG);
      const finalDataUrl = `data:image/png;base64,${finalQrBuffer.toString("base64")}`;

      console.log("[QR Code] Successfully generated QR code with logo");
      return finalDataUrl;
    } catch (logoError) {
      console.error("[QR Code] Failed to add logo to QR code:", logoError);
      return qrCodeDataUrl; // Return QR code without logo on error
    }
  } catch (error) {
    console.error("[QR Code] QR code generation failed:", error);
    throw new Error("Failed to generate QR code");
  }
}
