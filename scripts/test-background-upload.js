#!/usr/bin/env node

/**
 * Test script for the background image upload endpoints
 * To run this script:
 * node scripts/test-background-upload.js
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

// Set this to the base URL of your server
const BASE_URL = "http://localhost:3000";

// Test file path - change this to an image file on your system
const TEST_FILE_PATH = "client/public/assets/backgrounds/mountain.jpg";

async function testUploadEndpoint(endpoint, filePath) {
  console.log(`\nTesting endpoint: ${endpoint}...`);
  console.log("------------------------------------------");

  try {
    // Create form data with the test image
    const form = new FormData();
    form.append("file", fs.createReadStream(path.resolve(filePath)));

    console.log(`Uploading file: ${filePath} to ${endpoint}`);

    // Start time to measure performance
    const startTime = Date.now();

    // Upload the file
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      body: form,
      headers: {
        Accept: "application/json"
      }
    });

    // End time
    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    console.log(`Status: ${response.status}`);
    console.log(`Response type: ${response.headers.get("content-type")}`);
    console.log(`Time taken: ${timeTaken}ms`);

    // Get response as text first to see if it's valid JSON
    const text = await response.text();

    if (!text) {
      console.log("Empty response received");
      return;
    }

    console.log(`Response length: ${text.length} chars`);

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      console.log("Response parsed as JSON successfully:", data);

      if (data.url) {
        console.log(`Image URL: ${data.url}`);
      }

      if (data.success === false) {
        console.error(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error parsing response as JSON:", error.message);

      // If it's HTML, show the first 100 chars
      if (text.startsWith("<!")) {
        console.log("Received HTML response (first 100 chars):");
        console.log(text.substring(0, 100) + "...");
      } else {
        console.log("Raw response (first 100 chars):");
        console.log(text.substring(0, 100) + "...");
      }
    }
  } catch (error) {
    console.error("Request error:", error.message);
  }
}

async function runTests() {
  console.log("BACKGROUND UPLOAD ENDPOINT TESTER");
  console.log("=================================");

  // Test the different upload endpoints
  await testUploadEndpoint("/api/background-upload", TEST_FILE_PATH);
  await testUploadEndpoint("/api/raw-upload", TEST_FILE_PATH);
  await testUploadEndpoint("/api/upload-simple", TEST_FILE_PATH);
  await testUploadEndpoint("/api/upload", TEST_FILE_PATH);

  console.log("\nTests completed.");
}

runTests().catch(console.error);
