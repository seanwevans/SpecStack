-- db/init.sql

-- Create web_anon role
CREATE ROLE web_anon NOLOGIN;

-- Create basic pets table
CREATE TABLE pets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT
);

-- Create create_pet() function
CREATE OR REPLACE FUNCTION create_pet(name TEXT, tag TEXT DEFAULT NULL)
RETURNS SETOF pets AS $$
INSERT INTO pets (name, tag)
VALUES (name, tag)
RETURNING *;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO web_anon;
