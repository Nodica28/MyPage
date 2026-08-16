// Script to migrate all users to have QR codes
// This is a one-time script to be run to ensure all users have QR codes

import {db} from "../server/db";
import {users, organizations} from "../shared/schema";
import {eq, isNull} from "drizzle-orm";
console.log("QR Code Migration Started");
console.log("Checking for users without QR codes...");

async function migrateQRCodes() {
  try {
    // Import the QR code generator utility
    const {generateQRCode} = await import("../server/utils/qrCodeGenerator");

    // Get all users that don't have a QR code but have a publicPath
    const usersWithoutQRCode = await db
      .select()
      .from(users)
      .where(isNull(users.qrCodeUrl))
      .and(eq(users.publicPath, null).not());

    console.log(
      `Found ${usersWithoutQRCode.length} users without QR codes but with public paths`
    );

    // Get all users that have a QR code (for reporting only)
    const usersWithQRCode = await db
      .select()
      .from(users)
      .where(isNull(users.qrCodeUrl).not());

    console.log(
      `Found ${usersWithQRCode.length} users that already have QR codes`
    );

    let successCount = 0;
    let errorCount = 0;

    // Process each user without a QR code
    for (const user of usersWithoutQRCode) {
      try {
        let orgColor = "#4E5BA6"; // Default color
        let qrLogoUrl = undefined;

        // If user belongs to an organization, get the organization's QR settings
        if (user.organizationId) {
          try {
            const [org] = await db
              .select()
              .from(organizations)
              .where(eq(organizations.id, user.organizationId));

            if (org) {
              orgColor = org.qrCodeColor || org.defaultColor || orgColor;
              qrLogoUrl = org.qrLogoUrl;
              console.log(
                `[User ${user.id}] Using organization settings: color=${orgColor}, hasLogo=${!!qrLogoUrl}`
              );
            }
          } catch (orgError) {
            console.error(
              `[User ${user.id}] Error getting organization:`,
              orgError
            );
            // Continue with defaults
          }
        }

        // Build the profile URL
        // Assuming localhost for migration, this will be updated when regenerated in production
        const baseUrl = "http://localhost:3000";
        const profileUrl = `${baseUrl}/${user.publicPath}`;

        console.log(
          `[User ${user.id}] Generating QR code for URL: ${profileUrl}`
        );

        // Configure QR code options with circular dots style
        const qrCodeOptions = {
          width: 400,
          margin: 4,
          errorCorrectionLevel: "H",
          color: {
            dark: orgColor,
            light: "#FFFFFF"
          },
          dotType: "dots",
          dotScale: 1.0,
          logoShape: "circle",
          customMarkers: true,
          logoUrl: qrLogoUrl
        };

        // Generate QR code
        const qrCodeUrl = await generateQRCode(profileUrl, qrCodeOptions);

        // Update user with QR code URL
        await db.update(users).set({qrCodeUrl}).where(eq(users.id, user.id));

        console.log(
          `[User ${user.id}] QR code successfully generated and saved`
        );
        successCount++;
      } catch (error) {
        console.error(`[User ${user.id}] Error generating QR code:`, error);
        errorCount++;
      }
    }

    console.log("\nQR Code Migration Summary:");
    console.log(`Total users processed: ${usersWithoutQRCode.length}`);
    console.log(`Successful QR code generations: ${successCount}`);
    console.log(`Failed QR code generations: ${errorCount}`);
    console.log(`Users already with QR codes: ${usersWithQRCode.length}`);
    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration script error:", error);
  } finally {
    // Close the database connection
    await db.destroy();
  }
}

// Run the migration
migrateQRCodes().catch(console.error);
