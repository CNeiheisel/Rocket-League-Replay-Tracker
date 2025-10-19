/**
 * API routes for AI Coach analysis
 * Express.js routes
 */

const express = require('express');
const router = express.Router();
const { analyzePlayerStats } = require('../ai_coach/analyzer');
const { RANK_BENCHMARKS } = require('../ai_coach/benchmarks');

/**
 * POST /api/analysis/analyze
 * Analyze player statistics and return improvement advice
 */
router.post('/analyze', (req, res) => {
  try {
    const { stats, current_rank, target_rank } = req.body;

    if (!stats || Object.keys(stats).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Stats object is required'
      });
    }

    if (!current_rank) {
      return res.status(400).json({
        success: false,
        error: 'current_rank is required'
      });
    }

    // Perform analysis
    const result = analyzePlayerStats(stats, current_rank, target_rank);

    return res.json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: `Analysis failed: ${error.message}`
    });
  }
});

/**
 * POST /api/analysis/batch-analyze
 * Analyze multiple players or games at once
 */
router.post('/batch-analyze', (req, res) => {
  try {
    const { games } = req.body;

    if (!games || !Array.isArray(games) || games.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Games array is required'
      });
    }

    const results = games.map(game => {
      return analyzePlayerStats(
        game.stats || {},
        game.current_rank || 'Gold',
        game.target_rank || null
      );
    });

    return res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('Batch analysis error:', error);
    return res.status(500).json({
      success: false,
      error: `Batch analysis failed: ${error.message}`
    });
  }
});

/**
 * GET /api/analysis/benchmarks
 * Get benchmark data for all ranks or a specific rank
 */
router.get('/benchmarks', (req, res) => {
  try {
    const { rank } = req.query;

    if (rank) {
      if (RANK_BENCHMARKS[rank]) {
        return res.json({
          success: true,
          rank,
          benchmarks: RANK_BENCHMARKS[rank]
        });
      } else {
        return res.status(404).json({
          success: false,
          error: `Rank '${rank}' not found`
        });
      }
    }

    return res.json({
      success: true,
      benchmarks: RANK_BENCHMARKS
    });

  } catch (error) {
    console.error('Benchmarks error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analysis/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RL AI Coach'
  });
});

module.exports = router;
