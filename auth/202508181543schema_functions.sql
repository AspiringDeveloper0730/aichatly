-- Create update time trigger
CREATE OR REPLACE FUNCTION ${schema}.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- get jwt token user id
CREATE OR REPLACE FUNCTION ${schema}.uid()
RETURNS BIGINT AS $$
BEGIN
RETURN NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub';
END;
$$ LANGUAGE plpgsql STABLE;