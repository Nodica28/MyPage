#!/bin/bash

echo "Starting user organizations migration..."

# Run the migration script with Node
NODE_PATH=$(pwd) tsx migrations/migrate-user-organizations.ts

echo "Migration process completed." 