-- Add is_beta_tester column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;

-- Set default value for existing users (they are regular users)
UPDATE users
SET is_beta_tester = false
WHERE is_beta_tester IS NULL;

