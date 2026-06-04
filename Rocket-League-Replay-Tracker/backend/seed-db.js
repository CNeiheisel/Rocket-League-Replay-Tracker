#!/usr/bin/env node
/**
 * Seed the database with sample player data from BallChasing API
 * This populates the players table and player_stats with realistic data
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

// Sample match data with player stats
const sampleMatches = [
  {
    match_id: 'seed-match-001',
    match_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    map_name: 'Beckwith Park',
    game_mode: 'Ranked Standard',
    duration: 300,
    blue_score: 3,
    orange_score: 2,
    winning_team: 'blue',
    players: [
      { name: 'Flailium', team: 'blue', goals: 2, assists: 1, saves: 4 },
      { name: 'bassin', team: 'blue', goals: 1, assists: 2, saves: 3 },
      { name: 'xaulty', team: 'blue', goals: 0, assists: 0, saves: 2 },
      { name: 'Kumi', team: 'orange', goals: 1, assists: 1, saves: 5 },
      { name: 'Enochc', team: 'orange', goals: 1, assists: 0, saves: 2 },
      { name: 'Chief', team: 'orange', goals: 0, assists: 1, saves: 4 }
    ]
  },
  {
    match_id: 'seed-match-002',
    match_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    map_name: 'Sovereign Heights',
    game_mode: 'Ranked Standard',
    duration: 320,
    blue_score: 4,
    orange_score: 1,
    winning_team: 'blue',
    players: [
      { name: 'xaulty', team: 'blue', goals: 3, assists: 1, saves: 2, mvp: true },
      { name: 'Flailium', team: 'blue', goals: 1, assists: 2, saves: 1 },
      { name: 'bassin', team: 'blue', goals: 0, assists: 1, saves: 3 },
      { name: 'Kumi', team: 'orange', goals: 1, assists: 0, saves: 4 },
      { name: 'Chief', team: 'orange', goals: 0, assists: 0, saves: 2 },
      { name: 'Enochc', team: 'orange', goals: 0, assists: 0, saves: 3 }
    ]
  },
  {
    match_id: 'seed-match-003',
    match_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    map_name: 'Mannfield',
    game_mode: 'Ranked Standard',
    duration: 290,
    blue_score: 2,
    orange_score: 2,
    winning_team: 'draw',
    players: [
      { name: 'bassin', team: 'blue', goals: 1, assists: 0, saves: 5 },
      { name: 'xaulty', team: 'blue', goals: 1, assists: 1, saves: 2 },
      { name: 'Flailium', team: 'blue', goals: 0, assists: 1, saves: 3 },
      { name: 'Enochc', team: 'orange', goals: 1, assists: 1, saves: 4, mvp: true },
      { name: 'Kumi', team: 'orange', goals: 1, assists: 0, saves: 1 },
      { name: 'Chief', team: 'orange', goals: 0, assists: 1, saves: 4 }
    ]
  }
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const match of sampleMatches) {
      // Insert match
      await client.query(
        `INSERT INTO matches (match_id, match_date, map_name, game_mode, duration, blue_score, orange_score, winning_team)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (match_id) DO NOTHING`,
        [
          match.match_id,
          match.match_date,
          match.map_name,
          match.game_mode,
          match.duration,
          match.blue_score,
          match.orange_score,
          match.winning_team
        ]
      );

      // Insert players and stats
      for (const playerData of match.players) {
        // Get or create player
        let playerResult = await client.query(
          `SELECT player_id FROM players WHERE player_name = $1`,
          [playerData.name]
        );

        let playerId;
        if (playerResult.rows.length === 0) {
          playerResult = await client.query(
            `INSERT INTO players (player_name, platform) VALUES ($1, $2) RETURNING player_id`,
            [playerData.name, 'steam']
          );
        }
        playerId = playerResult.rows[0].player_id;

        // Insert player stats
        await client.query(
          `INSERT INTO player_stats (match_id, player_id, team, goals, assists, saves, mvp)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (match_id, player_id) DO NOTHING`,
          [
            match.match_id,
            playerId,
            playerData.team,
            playerData.goals || 0,
            playerData.assists || 0,
            playerData.saves || 0,
            playerData.mvp || false
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✓ Database seeded successfully with sample data!');
    
    // Show summary
    const playerCount = await client.query('SELECT COUNT(*) as count FROM players');
    const matchCount = await client.query('SELECT COUNT(*) as count FROM matches');
    const statsCount = await client.query('SELECT COUNT(*) as count FROM player_stats');
    
    console.log(`\nDatabase Summary:`);
    console.log(`  Players: ${playerCount.rows[0].count}`);
    console.log(`  Matches: ${matchCount.rows[0].count}`);
    console.log(`  Stats: ${statsCount.rows[0].count}`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error seeding database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
