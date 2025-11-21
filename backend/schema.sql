-- REALM Database Schema
-- For PostgreSQL (Supabase) or standalone PostgreSQL

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_username ON accounts(username);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  class_id VARCHAR(50) NOT NULL,
  race_id VARCHAR(50),
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,
  gold INTEGER DEFAULT 25,
  
  -- Stats (JSONB for flexibility)
  stats JSONB DEFAULT '{"hp": 20, "maxHp": 20, "atk": 5, "def": 2}'::jsonb,
  player_stats JSONB DEFAULT '{}'::jsonb,
  
  -- Inventory and equipment (JSONB arrays)
  inventory JSONB DEFAULT '[]'::jsonb,
  equipment JSONB DEFAULT '{"weapon": null, "armor": null, "charm": null}'::jsonb,
  skills JSONB DEFAULT '{}'::jsonb,
  
  -- Position
  current_zone VARCHAR(100) DEFAULT 'thronehold',
  current_tile JSONB DEFAULT '{"x": 20, "y": 20}'::jsonb,
  
  -- Game state
  active_quests JSONB DEFAULT '[]'::jsonb,
  completed_quests JSONB DEFAULT '[]'::jsonb,
  discovered_lore JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  faction_standings JSONB DEFAULT '{}'::jsonb,
  settlements JSONB DEFAULT '[]'::jsonb,
  owned_tiles JSONB DEFAULT '[]'::jsonb,
  structures JSONB DEFAULT '[]'::jsonb,
  visibility JSONB DEFAULT '[]'::jsonb,
  
  -- Resources
  resources JSONB DEFAULT '{"food": 50, "ore": 10, "timber": 20, "essence": 0}'::jsonb,
  
  -- Metadata
  guild_id UUID,
  faction_id VARCHAR(100),
  shop JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT max_characters_per_account CHECK (
    (SELECT COUNT(*) FROM characters WHERE account_id = characters.account_id) <= 8
  )
);

CREATE INDEX idx_characters_account_id ON characters(account_id);
CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_characters_updated_at ON characters(updated_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate character data
CREATE OR REPLACE FUNCTION validate_character_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate stats structure
  IF NOT (NEW.stats ? 'hp' AND NEW.stats ? 'maxHp') THEN
    RAISE EXCEPTION 'Invalid stats structure: must contain hp and maxHp';
  END IF;
  
  -- Validate inventory is array
  IF jsonb_typeof(NEW.inventory) != 'array' THEN
    RAISE EXCEPTION 'Inventory must be a JSON array';
  END IF;
  
  -- Validate level is positive
  IF NEW.level < 1 OR NEW.level > 100 THEN
    RAISE EXCEPTION 'Level must be between 1 and 100';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_character_before_insert BEFORE INSERT ON characters
  FOR EACH ROW EXECUTE FUNCTION validate_character_data();

CREATE TRIGGER validate_character_before_update BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION validate_character_data();

