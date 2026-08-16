#!/bin/bash

echo "Starting database migration for user_organizations..."

# Run the migration script
NODE_PATH=$(pwd) tsx scripts/run-sql-migration.ts

echo "Migration process completed." 