-- Store rotating Slack bot tokens at the organization level
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slack_bot_access_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_bot_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_bot_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS slack_scopes TEXT;

