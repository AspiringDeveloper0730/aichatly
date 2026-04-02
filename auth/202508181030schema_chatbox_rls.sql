CREATE OR REPLACE FUNCTION ${schema}.zoer_copliot_enable()
RETURNS boolean AS $$
DECLARE
val text;
BEGIN
    -- Try to read zoer.copliot.enable parameter, return NULL if not exists
    val := current_setting('zoer.copliot.enable', true);

    -- Explicit judgment
    IF val IS NULL THEN
        RETURN false;  -- Not exists, default false
    ELSIF  val = 'true'THEN
        RETURN true;   -- Exists and is true value
ELSE
        RETURN false;  -- Exists but not true value
END IF;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Create RLS policies for users table
CREATE POLICY users_chatbox_disable ON ${schema}.users
    FOR ALL
    USING (NOT ${schema}.zoer_copliot_enable())
    WITH CHECK (NOT ${schema}.zoer_copliot_enable());


-- Allow admin role to always read users table
CREATE POLICY users_admin_read ON ${schema}.users
    FOR SELECT
    TO ${schema_admin_user}
    USING (true);


-- Create RLS policies for sessions table
CREATE POLICY sessions_chatbox_disable ON ${schema}.sessions
    FOR ALL
    USING (NOT ${schema}.zoer_copliot_enable())
    WITH CHECK (NOT ${schema}.zoer_copliot_enable());

-- Create RLS policies for refresh_tokens table
CREATE POLICY refresh_tokens_chatbox_disable ON ${schema}.refresh_tokens
    FOR ALL
    USING (NOT ${schema}.zoer_copliot_enable())
    WITH CHECK (NOT ${schema}.zoer_copliot_enable());

-- Create RLS policies for user_passcode table
CREATE POLICY user_passcode_chatbox_disable ON ${schema}.user_passcode
    FOR ALL
    USING (NOT ${schema}.zoer_copliot_enable())
    WITH CHECK (NOT ${schema}.zoer_copliot_enable());