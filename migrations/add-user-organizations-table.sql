-- Create the user_organizations table
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_workspace_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_organizations_user_id_idx ON user_organizations (user_id);
CREATE INDEX IF NOT EXISTS user_organizations_org_id_idx ON user_organizations (organization_id);

-- Migrate existing user-organization relationships
INSERT INTO user_organizations (user_id, organization_id, is_workspace_admin, is_primary, is_active)
SELECT 
  id AS user_id, 
  organization_id, 
  is_workspace_admin,
  true AS is_primary, -- Mark as primary organization
  true AS is_active
FROM users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Note: We're not removing the organization_id column from users table yet
-- to ensure backward compatibility during transition 