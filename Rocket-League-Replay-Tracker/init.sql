-- PostgreSQL initialization script for Rocket League Replay Tracker

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    player_id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create matches table
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
    players JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create player_stats table (junction table for player performance in matches)
CREATE TABLE IF NOT EXISTS player_stats (
    stats_id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
    match_id VARCHAR(36) NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    mvp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, match_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);
