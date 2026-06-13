/**
 * API routes for AI Coach analysis
 * Uses Groq (free) for intelligent coaching advice
 */

const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============ HELPERS ============

function buildSingleGamePrompt(stats, playerName, matchInfo) {
  return `You are an expert Rocket League coach analyzing a single game for player "${playerName}".

Match info:
- Map: ${matchInfo.map_name || 'Unknown'}
- Mode: ${matchInfo.game_mode || 'Standard'}
- Team: ${stats.team || 'Unknown'}
- Result: ${matchInfo.winning_team === stats.team ? 'WIN' : 'LOSS'}
- Score: Blue ${matchInfo.blue_score ?? 0} - Orange ${matchInfo.orange_score ?? 0}

Player stats for this game:
- Score: ${stats.score ?? 0}
- Goals: ${stats.goals ?? 0}
- Assists: ${stats.assists ?? 0}
- Saves: ${stats.saves ?? 0}
- Shots: ${stats.shots ?? 0}
- Shooting %: ${stats.shooting_percentage != null ? Number(stats.shooting_percentage).toFixed(1) : 'N/A'}%
- MVP: ${stats.mvp ? 'Yes' : 'No'}

Positioning:
- Time in defensive third: ${stats.time_defensive_third != null ? Number(stats.time_defensive_third).toFixed(1) : 'N/A'}s (${stats.percent_defensive_third != null ? Number(stats.percent_defensive_third).toFixed(1) : 'N/A'}%)
- Time in offensive third: ${stats.time_offensive_third != null ? Number(stats.time_offensive_third).toFixed(1) : 'N/A'}s (${stats.percent_offensive_third != null ? Number(stats.percent_offensive_third).toFixed(1) : 'N/A'}%)
- Time behind ball: ${stats.percent_behind_ball != null ? Number(stats.percent_behind_ball).toFixed(1) : 'N/A'}%
- Time in front of ball: ${stats.percent_infront_ball != null ? Number(stats.percent_infront_ball).toFixed(1) : 'N/A'}%
- Time most back (last defender): ${stats.time_most_back != null ? Number(stats.time_most_back).toFixed(1) : 'N/A'}s
- Time most forward: ${stats.time_most_forward != null ? Number(stats.time_most_forward).toFixed(1) : 'N/A'}s

Boost:
- Avg boost amount: ${stats.boost_avg_amount != null ? Number(stats.boost_avg_amount).toFixed(1) : 'N/A'}
- Boost collected: ${stats.boost_collected ?? 'N/A'}
- Boost stolen from opponents: ${stats.boost_stolen ?? 'N/A'}
- Time at zero boost: ${stats.time_zero_boost != null ? Number(stats.time_zero_boost).toFixed(1) : 'N/A'}s
- Time at full boost: ${stats.time_full_boost != null ? Number(stats.time_full_boost).toFixed(1) : 'N/A'}s

Movement:
- Avg speed: ${stats.avg_speed ?? 'N/A'}
- Time supersonic: ${stats.time_supersonic != null ? Number(stats.time_supersonic).toFixed(1) : 'N/A'}s
- Time on ground: ${stats.percent_ground != null ? Number(stats.percent_ground).toFixed(1) : 'N/A'}%
- Time in low air: ${stats.percent_low_air != null ? Number(stats.percent_low_air).toFixed(1) : 'N/A'}%
- Time in high air: ${stats.percent_high_air != null ? Number(stats.percent_high_air).toFixed(1) : 'N/A'}%

Demos:
- Demos inflicted: ${stats.demos_inflicted ?? 0}
- Demos taken: ${stats.demos_taken ?? 0}

Give specific, actionable coaching feedback on this single game. Be direct and concise.
Identify 2 key things they did well and 2-3 specific areas to improve based on the actual numbers.
Reference the specific stats when giving advice (e.g. "spending 79% of the game behind the ball suggests you were playing too passively").
End with one focused drill or habit to work on before their next game.

You MUST respond with only valid JSON and nothing else — no explanation, no markdown, no code fences. Return exactly this structure:
{
  "overall_assessment": "2-3 sentence summary of their performance this game",
  "strengths": [
    { "title": "strength title", "detail": "specific detail referencing their stats" }
  ],
  "advice": [
    {
      "priority": 1,
      "title": "area title",
      "advice": "specific advice referencing their actual numbers",
      "drills": ["drill 1", "drill 2"]
    }
  ],
  "focus_for_next_game": "one specific thing to focus on next game"
}`;
}

function buildAcrossGamesPrompt(playerName, aggregatedStats, recentGames) {
  const gamesPlayed = recentGames.length;
  const wins = recentGames.filter(g => g.won).length;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed * 100).toFixed(1) : '0.0';

  return `You are an expert Rocket League coach analyzing ${gamesPlayed} games for player "${playerName}".

Overall averages across ${gamesPlayed} games:
- Win rate: ${winRate}%
- Avg score: ${aggregatedStats.avg_score != null ? Number(aggregatedStats.avg_score).toFixed(0) : 'N/A'}
- Avg goals: ${aggregatedStats.avg_goals != null ? Number(aggregatedStats.avg_goals).toFixed(2) : 'N/A'}
- Avg assists: ${aggregatedStats.avg_assists != null ? Number(aggregatedStats.avg_assists).toFixed(2) : 'N/A'}
- Avg saves: ${aggregatedStats.avg_saves != null ? Number(aggregatedStats.avg_saves).toFixed(2) : 'N/A'}
- Avg shots: ${aggregatedStats.avg_shots != null ? Number(aggregatedStats.avg_shots).toFixed(2) : 'N/A'}
- Shooting %: ${aggregatedStats.avg_shooting_pct != null ? Number(aggregatedStats.avg_shooting_pct).toFixed(1) : 'N/A'}%
- MVPs: ${aggregatedStats.mvp_count ?? 0}

Positioning averages:
- Time in defensive third: ${aggregatedStats.avg_defensive_third != null ? Number(aggregatedStats.avg_defensive_third).toFixed(1) : 'N/A'}s
- Time in offensive third: ${aggregatedStats.avg_offensive_third != null ? Number(aggregatedStats.avg_offensive_third).toFixed(1) : 'N/A'}s
- Time behind ball: ${aggregatedStats.avg_behind_ball != null ? Number(aggregatedStats.avg_behind_ball).toFixed(1) : 'N/A'}%
- Time in front of ball: ${aggregatedStats.avg_infront_ball != null ? Number(aggregatedStats.avg_infront_ball).toFixed(1) : 'N/A'}%

Boost averages:
- Avg boost amount: ${aggregatedStats.avg_boost_amount != null ? Number(aggregatedStats.avg_boost_amount).toFixed(1) : 'N/A'}
- Avg boost stolen: ${aggregatedStats.avg_boost_stolen != null ? Number(aggregatedStats.avg_boost_stolen).toFixed(0) : 'N/A'}
- Avg time at zero boost: ${aggregatedStats.avg_zero_boost != null ? Number(aggregatedStats.avg_zero_boost).toFixed(1) : 'N/A'}s

Movement averages:
- Avg speed: ${aggregatedStats.avg_speed != null ? Number(aggregatedStats.avg_speed).toFixed(0) : 'N/A'}
- Avg time supersonic: ${aggregatedStats.avg_supersonic != null ? Number(aggregatedStats.avg_supersonic).toFixed(1) : 'N/A'}s

Recent game results (last ${Math.min(5, recentGames.length)} games):
${recentGames.slice(0, 5).map((g, i) =>
  `Game ${i + 1}: ${g.won ? 'WIN' : 'LOSS'} | Goals: ${g.goals} | Assists: ${g.assists} | Saves: ${g.saves} | Score: ${g.score}`
).join('\n')}

Analyze patterns across these games. Look for consistent habits, both good and bad.
Identify trends (e.g. "you consistently spend too much time in the defensive third" or "your saves spike in losses suggesting defensive scrambling").
Give advice that addresses root causes, not just symptoms.

You MUST respond with only valid JSON and nothing else — no explanation, no markdown, no code fences. Return exactly this structure:
{
  "overall_assessment": "2-3 sentence summary of their performance across these games mentioning trends",
  "strengths": [
    { "title": "strength title", "detail": "specific detail referencing their stats across games" }
  ],
  "advice": [
    {
      "priority": 1,
      "title": "area title",
      "advice": "specific advice referencing their actual numbers and patterns across games",
      "drills": ["drill 1", "drill 2"]
    }
  ],
  "focus_for_next_game": "one specific habit to build based on their patterns"
}`;
}

// ============ ROUTES ============

/**
 * POST /api/analysis/analyze
 * Analyze a single game for a player using Groq
 */
router.post('/analyze', async (req, res) => {
  try {
    const { player_name, stats, match_info } = req.body;

    if (!stats || Object.keys(stats).length === 0) {
      return res.status(400).json({ success: false, error: 'Stats object is required' });
    }

    if (!player_name) {
      return res.status(400).json({ success: false, error: 'player_name is required' });
    }

    const prompt = buildSingleGamePrompt(stats, player_name, match_info || {});

    const message = await client.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({
      success: true,
      overall_assessment: parsed.overall_assessment,
      strengths: parsed.strengths || [],
      advice: (parsed.advice || []).map((a, i) => ({
        priority: a.priority ?? i + 1,
        title: a.title,
        advice: a.advice,
        drills: a.drills || []
      })),
      focus_for_next_game: parsed.focus_for_next_game || '',
      all_gaps: []
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ success: false, error: `Analysis failed: ${error.message}` });
  }
});

/**
 * POST /api/analysis/analyze-player
 * Analyze a player across all their imported games using Groq
 */
router.post('/analyze-player', async (req, res) => {
  try {
    const { player_name, aggregated_stats, recent_games } = req.body;

    if (!player_name) {
      return res.status(400).json({ success: false, error: 'player_name is required' });
    }

    if (!aggregated_stats) {
      return res.status(400).json({ success: false, error: 'aggregated_stats is required' });
    }

    if (!recent_games || recent_games.length === 0) {
      return res.status(400).json({ success: false, error: 'recent_games array is required' });
    }

    const prompt = buildAcrossGamesPrompt(player_name, aggregated_stats, recent_games);

    const message = await client.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({
      success: true,
      overall_assessment: parsed.overall_assessment,
      strengths: parsed.strengths || [],
      advice: (parsed.advice || []).map((a, i) => ({
        priority: a.priority ?? i + 1,
        title: a.title,
        advice: a.advice,
        drills: a.drills || []
      })),
      focus_for_next_game: parsed.focus_for_next_game || '',
      all_gaps: []
    });

  } catch (error) {
    console.error('Across-games analysis error:', error);
    return res.status(500).json({ success: false, error: `Analysis failed: ${error.message}` });
  }
});

/**
 * GET /api/analysis/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RL AI Coach',
    groq: !!process.env.GROQ_API_KEY
  });
});

module.exports = router;