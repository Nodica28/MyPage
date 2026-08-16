-- Add Slack fields to organizations table to store created channel metadata
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT;

