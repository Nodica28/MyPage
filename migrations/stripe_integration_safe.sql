-- Safe migration for Stripe integration
-- This only adds new tables and columns without modifying existing data

-- Add subscription fields to users table (only if they don't exist)
DO $$ 
BEGIN
    -- Add stripe_customer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- Add subscription_status column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
        ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free';
    END IF;
    
    -- Add subscription_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_id') THEN
        ALTER TABLE users ADD COLUMN subscription_id TEXT;
    END IF;
    
    -- Add plan_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_type') THEN
        ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free';
    END IF;
    
    -- Add headshot_credits column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'headshot_credits') THEN
        ALTER TABLE users ADD COLUMN headshot_credits INTEGER DEFAULT 0;
    END IF;
    
    -- Add subscription_period_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_period_end') THEN
        ALTER TABLE users ADD COLUMN subscription_period_end TIMESTAMP;
    END IF;
    
    -- Add subscription_cancel_at_period_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_cancel_at_period_end') THEN
        ALTER TABLE users ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    stripe_subscription_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    type TEXT NOT NULL CHECK (type IN ('subscription', 'credits')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for payments table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_user_id_idx') THEN
        CREATE INDEX payments_user_id_idx ON payments(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_stripe_payment_intent_idx') THEN
        CREATE INDEX payments_stripe_payment_intent_idx ON payments(stripe_payment_intent_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_type_idx') THEN
        CREATE INDEX payments_type_idx ON payments(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_status_idx') THEN
        CREATE INDEX payments_status_idx ON payments(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_created_at_idx') THEN
        CREATE INDEX payments_created_at_idx ON payments(created_at);
    END IF;
END $$;

-- Create headshot_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS headshot_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    headshot_request_id INTEGER,
    credits_cost INTEGER DEFAULT 1,
    type TEXT NOT NULL CHECK (type IN ('monthly_allowance', 'purchased_credits')),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for headshot_usage table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'headshot_usage_user_id_idx') THEN
        CREATE INDEX headshot_usage_user_id_idx ON headshot_usage(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'headshot_usage_headshot_request_idx') THEN
        CREATE INDEX headshot_usage_headshot_request_idx ON headshot_usage(headshot_request_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'headshot_usage_created_at_idx') THEN
        CREATE INDEX headshot_usage_created_at_idx ON headshot_usage(created_at);
    END IF;
END $$;

-- Give all existing users free plan with 2 trial credits
UPDATE users 
SET 
    subscription_status = 'free',
    plan_type = 'free',
    headshot_credits = 2
WHERE 
    subscription_status IS NULL 
    OR headshot_credits IS NULL 
    OR headshot_credits = 0;

COMMIT;
