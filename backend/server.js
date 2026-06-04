// server.js - Express Backend for Rocket League Replay Tracker
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const analysisRoutes = require('./routes/analysis');

const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Load environment variables from .env file in the backend folder
require('dotenv').config({ path: path.resolve(__dirname, '.env') });




// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4200',
  process.env.FRONTEND_URL,
  /^https:\/\/rocket-league-replay-tracker.*\.vercel\.app$/
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// PostgreSQL connection pool
const DATABASE_URL = process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'postgres'}`;

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: DATABASE_URL
} : {
  user: String(process.env.POSTGRES_USER || 'postgres'),
  password: String(process.env.POSTGRES_PASSWORD || 'postgres'),
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'postgres'
};

const implicitSsl = process.env.DATABASE_URL && /neon\./i.test(process.env.DATABASE_URL);
const useSsl = process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require' || implicitSsl || process.env.NODE_ENV === 'production';
const sslConfig = useSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false;

console.log('Postgres configuration:', {
  source: process.env.DATABASE_URL ? 'DATABASE_URL' : 'env vars/defaults',
  host: poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
  ssl: Boolean(sslConfig)
});

const pool = new Pool({
  ...poolConfig,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s
  ssl: sslConfig
});


const CPP_PARSER_PATH = './replay_parser'; // Adjust path as needed

// ============ UTILITY FUNCTIONS ============

// Access Ballchasing API key
const BALLCHASING_API_KEY = process.env.BALLCHASING_API_KEY;

if (!BALLCHASING_API_KEY) {
  console.warn("WARNING: BALLCHASING_API_KEY is not set — falling back to DB for match listing.");
} else {
  console.log("API key loaded successfully!");
}

app.get('/api/ballchasing/matches', async (req, res) => {
  const limit = req.query.limit || 20;

  try {
    if (BALLCHASING_API_KEY) {
      try {
        const response = await fetch(`https://ballchasing.com/api/replays?limit=${limit}`, {
          headers: { Authorization: BALLCHASING_API_KEY }
        });

        if (!response.ok) {
          throw new Error(`Ballchasing API error: ${response.status}`);
        }

        const data = await response.json();
        const transformedMatches = (data.list || []).map(match => {
          let matchDate;
          if (typeof match.date === 'number') matchDate = new Date(match.date * 1000).toISOString();
          else if (typeof match.date === 'string') {
            const d = new Date(match.date);
            matchDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
          } else {
            matchDate = new Date().toISOString();
          }

          const players = [];
          if (Array.isArray(match.players) && match.players.length) {
            for (const p of match.players) players.push({ name: p.name || 'Unknown', team: p.team || 'blue' });
          } else {
            if (Array.isArray(match.blue?.players)) {
              for (const p of match.blue.players) players.push({ name: p.name || 'Unknown', team: 'blue' });
            }
            if (Array.isArray(match.orange?.players)) {
              for (const p of match.orange.players) players.push({ name: p.name || 'Unknown', team: 'orange' });
            }
          }

          const blueScore = match.blue?.stats?.core?.goals ?? match.blueScore ?? 0;
          const orangeScore = match.orange?.stats?.core?.goals ?? match.orangeScore ?? 0;
          const winningTeam = (blueScore > orangeScore) ? 'blue' : (orangeScore > blueScore ? 'orange' : 'draw');

          return {
            match_id: match.id,
            match_date: matchDate,
            map_name: match.map_name || match.map_code || 'Unknown Map',
            game_mode: match.playlist_name || 'Standard',
            duration: match.duration || 300,
            blue_score: blueScore,
            orange_score: orangeScore,
            winning_team: winningTeam,
            replay_file_path: match.id,
            players
          };
        });

        res.json(transformedMatches);
        return;
      } catch (err) {
        console.warn('BallChasing API failed, falling back to local DB:', err.message || err);
      }
    }

    // Fallback to DB-sourced matches when BALLCHASING_API_KEY is not set or external fetch fails
    const q = `
      SELECT m.match_id, m.match_date, m.map_name, m.game_mode, m.duration, m.blue_score, m.orange_score, m.winning_team, m.replay_file_path
      FROM matches m
      ORDER BY m.match_date DESC
      LIMIT $1
    `;
    const result = await pool.query(q, [limit]);
    const rows = result.rows || [];

    const out = [];
    for (const r of rows) {
      const pRes = await pool.query(`
        SELECT p.player_name as name, ps.team
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.player_id
        WHERE ps.match_id = $1
      `, [r.match_id]);

      out.push({
        match_id: r.match_id,
        match_date: r.match_date ? new Date(r.match_date).toISOString() : new Date().toISOString(),
        map_name: r.map_name || 'Unknown Map',
        game_mode: r.game_mode || 'Standard',
        duration: r.duration || 300,
        blue_score: r.blue_score || 0,
        orange_score: r.orange_score || 0,
        winning_team: r.winning_team || (r.blue_score > r.orange_score ? 'blue' : (r.orange_score > r.blue_score ? 'orange' : 'draw')),
        replay_file_path: r.replay_file_path || null,
        players: (pRes.rows || []).map(p => ({ name: p.name, team: p.team }))
      });
    }

    res.json(out);
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// Parse replay using C++ + BallChasing API
async function parseReplayFromBallChasing(replayId) {
  try {
    const response = await fetch(`https://ballchasing.com/api/replays/${replayId}`, {
      headers: {
        'Authorization': BALLCHASING_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`BallChasing API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`Replay status: ${data.status}`);
    }

    // Transform to format
    const formatted = {
      replay_id: replayId,
      title: data.title || 'Unknown',
      map: data.map_code || 'Unknown',
      date: data.date || new Date().toISOString(),
      duration: data.duration || 300,
      gameMode: data.playlist_name || 'Standard',
      blueScore: data.blue.stats.core.goals,
      orangeScore: data.orange.stats.core.goals,
      winningTeam: data.blue.stats.core.goals > data.orange.stats.core.goals ? 'blue' : 'orange',
      players: [],
      success: true
    };

    // Process blue team
    if (data.blue.players) {
      for (const player of data.blue.players) {
        formatted.players.push({
          name: player.name,
          team: 'blue',
          platform: player.id?.platform || 'Unknown',
          score: player.stats.core.score,
          goals: player.stats.core.goals,
          assists: player.stats.core.assists,
          saves: player.stats.core.saves,
          shots: player.stats.core.shots,
          mvp: player.mvp || false
        });
      }
    }

    // Process orange team
    if (data.orange.players) {
      for (const player of data.orange.players) {
        formatted.players.push({
          name: player.name,
          team: 'orange',
          platform: player.id?.platform || 'Unknown',
          score: player.stats.core.score,
          goals: player.stats.core.goals,
          assists: player.stats.core.assists,
          saves: player.stats.core.saves,
          shots: player.stats.core.shots,
          mvp: player.mvp || false
        });
      }
    }

    return formatted;
  } catch (error) {
    console.error('BallChasing API error:', error);
    throw error;
  }
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Get all matches
app.get('/api/matches', async (req, res) => {
  try {
    const { limit = 50, offset = 0, player_id, team } = req.query;
    
    let query = `
      SELECT m.*, 
             COUNT(DISTINCT ps.player_id) as player_count
      FROM matches m
      LEFT JOIN player_stats ps ON m.match_id = ps.match_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (player_id) {
      conditions.push(`ps.player_id = $${params.length + 1}`);
      params.push(player_id);
    }
    
    if (team) {
      conditions.push(`ps.team = $${params.length + 1}`);
      params.push(team);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ` GROUP BY m.match_id ORDER BY m.match_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get match details with player stats
app.get('/api/matches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const matchQuery = await pool.query('SELECT * FROM matches WHERE match_id = $1', [id]);
    
    if (matchQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const statsQuery = await pool.query(`
      SELECT ps.*, p.player_name, p.platform
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.player_id
      WHERE ps.match_id = $1
      ORDER BY ps.score DESC
    `, [id]);
    
    res.json({
      match: matchQuery.rows[0],
      players: statsQuery.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Import replay by BallChasing ID
app.post('/api/replays/import', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { replay_id } = req.body;
    
    if (!replay_id) {
      return res.status(400).json({ error: 'No replay_id provided' });
    }
    
    // Check if replay already exists
    const existingReplay = await client.query(
      'SELECT match_id FROM matches WHERE replay_file_path = $1',
      [replay_id]
    );
    
    if (existingReplay.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Replay already imported',
        match_id: existingReplay.rows[0].match_id
      });
    }
    
    // Parse replay using C++ + BallChasing API
    const replayData = await parseReplayFromBallChasing(replay_id);
    
    if (!replayData.success) {
      return res.status(400).json({ error: 'Failed to parse replay' });
    }
    
    await client.query('BEGIN');
    
    // Insert match
    const matchResult = await client.query(`
      INSERT INTO matches (
        match_id, match_date, map_name, game_mode, duration, 
        blue_score, orange_score, winning_team, replay_file_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING match_id
    `, [
      replay_id, // Use BallChasing replay ID as match_id (UUID)
      replayData.date || new Date().toISOString(),
      replayData.map,
      replayData.gameMode,
      replayData.duration,
      replayData.blueScore,
      replayData.orangeScore,
      replayData.winningTeam,
      replay_id // Store BallChasing replay ID
    ]);
    
    const matchId = matchResult.rows[0].match_id;
    // Insert players and stats
for (const playerData of replayData.players) {
  // Insert or get player - check by BOTH name AND platform
  let playerId;
  
  const existingPlayer = await client.query(
    'SELECT player_id FROM players WHERE player_name = $1 AND platform = $2',
    [playerData.name, playerData.platform]
  );
  
  if (existingPlayer.rows.length > 0) {
    // Player exists, use existing ID
    playerId = existingPlayer.rows[0].player_id;
  } else {
    // New player, insert
    const playerResult = await client.query(`
      INSERT INTO players (player_name, platform)
      VALUES ($1, $2)
      RETURNING player_id
    `, [playerData.name, playerData.platform]);
    
    playerId = playerResult.rows[0].player_id;
  }
  
  // Insert player stats
  await client.query(`
    INSERT INTO player_stats (
      match_id, player_id, team, goals, assists, 
      saves, shots, score, mvp
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (match_id, player_id) DO NOTHING
  `, [
    matchId,
    playerId,
    playerData.team,
    playerData.goals,
    playerData.assists,
    playerData.saves,
    playerData.shots,
    playerData.score,
    playerData.mvp
  ]);
}
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      match_id: matchId,
      message: 'Replay imported successfully',
      replay_data: replayData
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import replay' });
  } finally {
    client.release();
  }
});

// Batch import multiple replays
app.post('/api/replays/batch-import', async (req, res) => {
  try {
    const { replay_ids } = req.body;
    
    if (!Array.isArray(replay_ids) || replay_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid replay_ids array' });
    }
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    for (const replay_id of replay_ids) {
      try {
        const response = await fetch(`http://localhost:${port}/api/replays/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replay_id })
        });
        
        const data = await response.json();
        
        if (response.status === 409) {
          results.skipped.push({ replay_id, reason: 'Already exists' });
        } else if (response.ok) {
          results.success.push({ replay_id, match_id: data.match_id });
        } else {
          results.failed.push({ replay_id, error: data.error });
        }
      } catch (err) {
        results.failed.push({ replay_id, error: err.message });
      }
    }
    
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Batch import failed' });
  }
});

// Get player statistics
app.get('/api/players', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.player_id,
             p.player_name,
             COUNT(DISTINCT ps.match_id) AS matches_played,
             COALESCE(SUM(ps.goals), 0) AS total_goals,
             COALESCE(SUM(ps.assists), 0) AS total_assists,
             COALESCE(SUM(ps.saves), 0) AS total_saves,
             COALESCE(SUM(CASE WHEN ps.mvp THEN 1 ELSE 0 END), 0) AS mvp_count,
             COALESCE(AVG(ps.goals), 0) AS avg_goals
      FROM players p
      LEFT JOIN player_stats ps ON p.player_id = ps.player_id
      GROUP BY p.player_id, p.player_name
      ORDER BY total_goals DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get individual player stats
app.get('/api/players/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const playerQuery = await pool.query(`
      SELECT p.player_id,
             p.player_name,
             COUNT(DISTINCT ps.match_id) AS matches_played,
             COALESCE(SUM(ps.goals), 0) AS total_goals,
             COALESCE(SUM(ps.assists), 0) AS total_assists,
             COALESCE(SUM(ps.saves), 0) AS total_saves,
             COALESCE(SUM(CASE WHEN ps.mvp THEN 1 ELSE 0 END), 0) AS mvp_count,
             COALESCE(AVG(ps.goals), 0) AS avg_goals
      FROM players p
      LEFT JOIN player_stats ps ON p.player_id = ps.player_id
      WHERE p.player_id = $1
      GROUP BY p.player_id, p.player_name
    `, [id]);
    
    if (playerQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const recentMatchesQuery = await pool.query(`
      SELECT m.match_id, m.match_date, m.map_name, ps.goals, ps.assists, ps.saves, ps.team, m.winning_team
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.match_id
      WHERE ps.player_id = $1
      ORDER BY m.match_date DESC
      LIMIT 10
    `, [id]);
    
    res.json({
      player: playerQuery.rows[0],
      recent_matches: recentMatchesQuery.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get performance trends
app.get('/api/stats/trends', async (req, res) => {
  try {
    const { player_id, days = 30 } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }
    
    const query = `
      SELECT 
        DATE(m.match_date) as date,
        AVG(ps.goals) as avg_goals,
        AVG(ps.assists) as avg_assists,
        AVG(ps.saves) as avg_saves,
        COUNT(*) as matches_count
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.match_id
      WHERE ps.player_id = $1 
        AND m.match_date >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(m.match_date)
      ORDER BY date ASC
    `;
    
    const result = await pool.query(query, [player_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Search players by name
app.get('/api/players/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      'SELECT * FROM players WHERE player_name ILIKE $1 LIMIT 20',
      [`%${name}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.use('/api/analysis', analysisRoutes);


app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Ready to track Rocket League replays!`);
});
