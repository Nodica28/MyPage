#!/bin/bash

# Convert the script to CommonJS format temporarily
echo "Converting script to CommonJS format..."
sed 's/import { db } from "..\/server\/db.js";/const { db } = require("..\/server\/db");/g' \
    -e 's/import { users, organizations } from "..\/shared\/schema.js";/const { users, organizations } = require("..\/shared\/schema");/g' \
    -e 's/import { eq, isNull } from "drizzle-orm";/const { eq, isNull } = require("drizzle-orm");/g' \
    -e 's/import path from "path";/const path = require("path");/g' \
    -e 's/import { fileURLToPath } from "url";//g' \
    -e 's/import { dirname } from "path";//g' \
    -e 's/const __filename = fileURLToPath(import.meta.url);//g' \
    -e 's/const __dirname = dirname(__filename);//g' \
    -e 's/const projectRoot = path.join(__dirname, '\''..'\'')/const projectRoot = path.join(__dirname, '\''..'\'')/g' \
    -e 's/const { generateQRCode } = await import("..\/server\/utils\/qrCodeGenerator.js");/const { generateQRCode } = require("..\/server\/utils\/qrCodeGenerator");/g' \
    scripts/migrate-qr-codes.js > scripts/migrate-qr-codes-temp.js

# Run the script with Node
echo "Running QR code migration..."
NODE_PATH=$(pwd) tsx scripts/migrate-qr-codes-temp.js

# Clean up
echo "Cleaning up temporary files..."
rm scripts/migrate-qr-codes-temp.js

echo "Migration completed."