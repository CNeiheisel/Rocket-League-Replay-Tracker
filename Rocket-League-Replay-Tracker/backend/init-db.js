#!/usr/bin/env node
/**
 * Initialize Rocket League Replay Tracker database schema
 * Run this once to set up the Neon PostgreSQL database
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    mode: 'require'
  }
});

const SQL = `
-- Create players table
CREATE TABLE IF NOT EXISTS players (
    player_id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_name, platform)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create player_stats table (junction table for player performance in matches)
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_stats(team);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);
`;

async function initDatabase() {
  try {
    console.log('Connecting to Neon database...');
    const client = await pool.connect();
    
    console.log('Dropping existing tables...');
    // Drop tables in reverse dependency order
    await client.query('DROP TABLE IF EXISTS player_stats CASCADE');
    await client.query('DROP TABLE IF EXISTS matches CASCADE');
    await client.query('DROP TABLE IF EXISTS players CASCADE');
    
    console.log('Creating tables...');
    await client.query(SQL);
    
    console.log('✓ Database schema initialized successfully!');
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('✗ Error initializing database:', err);
    process.exit(1);
  }
}

initDatabase();
