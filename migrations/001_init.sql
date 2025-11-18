
CREATE TABLE IF NOT EXISTS "users" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id text UNIQUE,
  email text UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'user',
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "inventories" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  image_url text,
  is_public boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "inventory_fields" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL, 
  description text,
  show_in_table boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "items" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES "users"(id),
  custom_id text,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS items_inventory_customid_idx ON "items" (inventory_id, custom_id);


CREATE TABLE IF NOT EXISTS "custom_id_elements" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  element_type text NOT NULL, 
  params jsonb,
  created_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "custom_id_sequences" (
  inventory_id uuid PRIMARY KEY,
  last_seq bigint NOT NULL DEFAULT 0
);


CREATE TABLE IF NOT EXISTS "inventory_access" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  can_write boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(inventory_id, user_id)
);


CREATE TABLE IF NOT EXISTS "discussion_posts" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);


CREATE TABLE IF NOT EXISTS "likes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES "items"(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, user_id)
);


CREATE TABLE IF NOT EXISTS "tags" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "inventory_tags" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES "inventories"(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES "tags"(id) ON DELETE CASCADE,
  UNIQUE(inventory_id, tag_id)
);


CREATE TABLE IF NOT EXISTS "sessions" (
  sid text PRIMARY KEY,
  sess jsonb NOT NULL,
  expires timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON "sessions" (expires);

ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token text;

ALTER TABLE "inventories" ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION inventories_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION items_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('simple', coalesce(NEW.custom_id,'')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventories_search_update ON "inventories";
CREATE TRIGGER inventories_search_update BEFORE INSERT OR UPDATE ON "inventories"
FOR EACH ROW EXECUTE PROCEDURE inventories_search_trigger();

DROP TRIGGER IF EXISTS items_search_update ON "items";
CREATE TRIGGER items_search_update BEFORE INSERT OR UPDATE ON "items"
FOR EACH ROW EXECUTE PROCEDURE items_search_trigger();

CREATE INDEX IF NOT EXISTS inventories_search_idx ON "inventories" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS items_search_idx ON "items" USING GIN (search_vector);


CREATE OR REPLACE FUNCTION next_custom_seq(inv uuid) RETURNS bigint AS $$
DECLARE
  v bigint;
BEGIN
  LOOP
    UPDATE custom_id_sequences SET last_seq = last_seq + 1
      WHERE inventory_id = inv
      RETURNING last_seq INTO v;
    IF FOUND THEN
      RETURN v;
    END IF;

    BEGIN
      INSERT INTO custom_id_sequences (inventory_id, last_seq) VALUES (inv, 1);
      RETURN 1;
    EXCEPTION WHEN unique_violation THEN
      
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
