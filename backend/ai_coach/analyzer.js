/**
 * Rocket League AI Coach - Analysis Module (JavaScript)
 * Analyzes player stats and generates improvement advice
 */

const { RANK_BENCHMARKS, ADVICE_MAP } = require('./benchmarks');

class RLStatsAnalyzer {
  constructor() {
    this.benchmarks = RANK_BENCHMARKS;
    this.adviceMap = ADVICE_MAP;
  }

  /**
   * Calculate gaps between player stats and target rank benchmarks
   */
  calculateStatGaps(playerStats, currentRank, targetRank = null) {
    // Determine target rank if not specified
    if (!targetRank || !this.benchmarks[targetRank]) {
      const rankList = Object.keys(this.benchmarks);
      const currentIdx = rankList.indexOf(currentRank);
      const nextIdx = Math.min(currentIdx + 1, rankList.length - 1);
      targetRank = rankList[nextIdx];
    }

    const targetBenchmarks = this.benchmarks[targetRank];
    const gaps = [];

    for (const [stat, targetValue] of Object.entries(targetBenchmarks)) {
      if (stat in playerStats) {
        const playerValue = playerStats[stat];
        const gap = targetValue - playerValue;
        const gapPercentage = targetValue !== 0 ? (gap / targetValue) * 100 : 0;

        gaps.push({
          stat,
          player_value: Math.round(playerValue * 100) / 100,
          target_value: Math.round(targetValue * 100) / 100,
          gap: Math.round(gap * 100) / 100,
          gap_percentage: Math.round(gapPercentage * 100) / 100
        });
      }
    }

    // Sort by absolute gap percentage (biggest issues first)
    gaps.sort((a, b) => Math.abs(b.gap_percentage) - Math.abs(a.gap_percentage));
    return gaps;
  }

  /**
   * Generate actionable advice based on stat gaps
   */
  generateAdvice(gaps, topN = 3) {
    const adviceList = [];

    for (let i = 0; i < Math.min(topN, gaps.length); i++) {
      const gap = gaps[i];
      const stat = gap.stat;

      if (stat in this.adviceMap) {
        adviceList.push({
          priority: i + 1,
          stat,
          gap_info: gap,
          ...this.adviceMap[stat]
        });
      }
    }

    return adviceList;
  }

  /**
   * Calculate percentiles relative to rank benchmarks
   */
  calculatePercentiles(playerStats, currentRank) {
    if (!this.benchmarks[currentRank]) {
      return {};
    }

    const rankBenchmarks = this.benchmarks[currentRank];
    const percentiles = {};

    for (const [stat, benchmark] of Object.entries(rankBenchmarks)) {
      if (stat in playerStats) {
        const playerValue = playerStats[stat];
        // Calculate percentile (50 = exactly at benchmark)
        const percentile = benchmark !== 0 ? (playerValue / benchmark) * 50 : 50;
        percentiles[stat] = Math.round(Math.min(Math.max(percentile, 0), 100) * 10) / 10;
      }
    }

    return percentiles;
  }

  /**
   * Generate overall performance assessment
   */
  getOverallAssessment(gaps) {
    if (!gaps || gaps.length === 0) {
      return "Unable to assess performance with current data.";
    }

    // Calculate average gap percentage for top 5 stats
    const topGaps = gaps.slice(0, 5);
    const avgGap = topGaps.reduce((sum, g) => sum + Math.abs(g.gap_percentage), 0) / topGaps.length;

    if (avgGap < 10) {
      return "You're performing at or above your rank level! Focus on consistency and you'll rank up soon.";
    } else if (avgGap < 25) {
      return "You're close to the next rank. Focus on the key areas below to push through.";
    } else if (avgGap < 40) {
      return "There's room for improvement. Concentrate on the priority areas to advance your rank.";
    } else {
      return "Significant improvement needed. Focus on fundamentals in the priority areas below - you've got this!";
    }
  }

  /**
   * Get next rank in progression
   */
  _getNextRank(currentRank) {
    const rankList = Object.keys(this.benchmarks);
    const currentIdx = rankList.indexOf(currentRank);
    const nextIdx = Math.min(currentIdx + 1, rankList.length - 1);
    return rankList[nextIdx];
  }

  /**
   * Complete player analysis pipeline
   */
  analyzePlayer(playerStats, currentRank, targetRank = null, adviceCount = 3) {
    // Calculate all components
    const gaps = this.calculateStatGaps(playerStats, currentRank, targetRank);
    const advice = this.generateAdvice(gaps, adviceCount);
    const percentiles = this.calculatePercentiles(playerStats, currentRank);
    const overall = this.getOverallAssessment(gaps);

    return {
      success: true,
      overall_assessment: overall,
      advice,
      all_gaps: gaps,
      percentiles,
      current_rank: currentRank,
      target_rank: targetRank || this._getNextRank(currentRank)
    };
  }
}

/**
 * Convenience function for simple usage
 */
function analyzePlayerStats(playerStats, currentRank, targetRank = null) {
  const analyzer = new RLStatsAnalyzer();
  return analyzer.analyzePlayer(playerStats, currentRank, targetRank);
}

module.exports = {
  RLStatsAnalyzer,
  analyzePlayerStats
};
