-- auth admin user - can bypass RLS
CREATE ROLE ${schema_admin_user} NOLOGIN NOINHERIT;

GRANT USAGE ON SCHEMA ${schema} TO ${schema_admin_user};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${schema_admin_user};

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${schema} TO ${schema_admin_user};

ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${schema_admin_user};

ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${schema_admin_user};

-- Grant bypass RLS privilege to auth admin
ALTER ROLE ${schema_admin_user} BYPASSRLS;

GRANT ${schema_admin_user} TO ${db_conn_user};

-- schema user - must follow RLS, no direct access to auth tables
CREATE ROLE ${schema_user} NOLOGIN NOINHERIT;

GRANT USAGE ON SCHEMA ${schema} TO ${schema_user};

-- Grant permissions on all tables except auth tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${schema_user};

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${schema} TO ${schema_user};

ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${schema_user};

ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema}
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${schema_user};

-- Remove permissions on auth tables (must go through RLS)
REVOKE ALL ON TABLE ${schema}.users FROM ${schema_user};
REVOKE ALL ON TABLE ${schema}.sessions FROM ${schema_user};
REVOKE ALL ON TABLE ${schema}.refresh_tokens FROM ${schema_user};
REVOKE ALL ON TABLE ${schema}.user_passcode FROM ${schema_user};

GRANT ${schema_user} TO ${db_conn_user};
