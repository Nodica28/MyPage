-- Add Slack OAuth fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS slack_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_access_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS slack_scopes TEXT;

