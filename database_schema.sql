CREATE TABLE IF NOT EXISTS players (
    player_id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(36) PRIMARY KEY,
    match_date TIMESTAMP WITH TIME ZONE,
    map_name VARCHAR(255),
    game_mode VARCHAR(255),
    duration INTEGER,
    blue_score INTEGER DEFAULT 0,
    orange_score INTEGER DEFAULT 0,
    winning_team VARCHAR(50),
    replay_file_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_stats (
    stats_id SERIAL PRIMARY KEY,
    match_id VARCHAR(36) NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    team VARCHAR(50),
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    mvp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, player_id)
);

-- If tables already existed from older schema, patch them safely
ALTER TABLE players ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS team VARCHAR(50);
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS shots INTEGER DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'players_player_name_key'
    ) THEN
        ALTER TABLE players DROP CONSTRAINT players_player_name_key;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'players_player_name_platform_key'
    ) THEN
        ALTER TABLE players
        ADD CONSTRAINT players_player_name_platform_key UNIQUE (player_name, platform);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_stats(team);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);