-- Create users table
create table ${schema}.users (
    id BIGSERIAL PRIMARY KEY,
    email varchar(255) not null unique,
    password varchar(255) not null,
    role varchar(255) null default '${schema_user}',
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp
);

comment on column ${schema}.users.role is 'role enum: ${schema_user},${schema_admin_user}';

-- Enable RLS on users table immediately after creation
ALTER TABLE ${schema}.users ENABLE ROW LEVEL SECURITY;

-- Create update time trigger
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON ${schema}.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- sessions table
CREATE TABLE IF NOT EXISTS ${schema}.sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ip varchar(255) NOT NULL,
    user_agent varchar(255) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp,
    updated_at timestamp with time zone NOT NULL DEFAULT current_timestamp,
    refresh_at timestamp with time zone
);

-- Enable RLS on sessions table immediately after creation
ALTER TABLE ${schema}.sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON ${schema}.sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- refresh_tokens table
CREATE TABLE IF NOT EXISTS ${schema}.refresh_tokens (
    id bigserial PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token text NOT NULL,
    session_id BIGINT NOT NULL,
    revoked boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp,
    updated_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);

-- Enable RLS on refresh_tokens table immediately after creation
ALTER TABLE ${schema}.refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_refresh_tokens_updated_at
BEFORE UPDATE ON ${schema}.refresh_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- user_passcode table
CREATE TABLE ${schema}.user_passcode (
   id BIGSERIAL PRIMARY KEY,
   passcode VARCHAR(255) NOT NULL,                     -- verification code
   passcode_type VARCHAR(255) NOT NULL DEFAULT 'EMAIL', -- verification type: EMAIL/PHONE, default EMAIL
   pass_object VARCHAR(255) NOT NULL,                  -- verification target
   valid_until TIMESTAMP with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '3 minutes'), -- valid for 3 minutes
   retry_count INT NOT NULL DEFAULT 0,                 -- retry times, default 0
   revoked boolean NOT NULL DEFAULT false,
   created_at TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, -- created time
   updated_at TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP  -- updated time
);

-- Trigger: bind existing function
CREATE TRIGGER user_passcode_updated_at_trg
    BEFORE UPDATE ON ${schema}.user_passcode
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_pass_object ON ${schema}.user_passcode(pass_object);

ALTER TABLE ${schema}.user_passcode ENABLE ROW LEVEL SECURITY;

