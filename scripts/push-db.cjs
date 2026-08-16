#!/usr/bin/env node

// Run this script to push database changes without interactive prompts
const { spawn } = require("child_process");

console.log("Pushing schema to database without interactive prompts...");
const process = spawn("npx", ["drizzle-kit", "push"], {
  stdio: "inherit"
});

process.on("close", (code) => {
  if (code === 0) {
    console.log("Schema pushed successfully!");
  } else {
    console.error(`Schema push failed with code ${code}`);
    process.exit(1);
  }
});
