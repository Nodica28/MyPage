-- Add auth_tokens table for magic link authentication
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS auth_tokens_token_idx ON auth_tokens (token);
CREATE INDEX IF NOT EXISTS auth_tokens_email_idx ON auth_tokens (email);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_idx ON auth_tokens (expires);
