"""
Rocket League AI Coach - Analysis Module
Analyzes player stats and generates improvement advice
"""

import numpy as np
from typing import Dict, List, Any, Optional
from .benchmarks import RANK_BENCHMARKS, ADVICE_MAP


class RLStatsAnalyzer:
    """Analyzes Rocket League player statistics and provides improvement advice"""
    
    def __init__(self):
        self.benchmarks = RANK_BENCHMARKS
        self.advice_map = ADVICE_MAP
    
    def calculate_stat_gaps(
        self, 
        player_stats: Dict, 
        current_rank: str, 
        target_rank: Optional[str] = None
    ) -> List[Dict]:
        """
        Calculate gaps between player stats and target rank benchmarks
        
        Args:
            player_stats: Dictionary of player statistics
            current_rank: Player's current rank
            target_rank: Target rank to compare against (defaults to next rank)
            
        Returns:
            List of stat gaps sorted by severity
        """
        # Determine target rank if not specified
        if not target_rank or target_rank not in self.benchmarks:
            rank_list = list(self.benchmarks.keys())
            current_idx = rank_list.index(current_rank) if current_rank in rank_list else 0
            target_rank = rank_list[min(current_idx + 1, len(rank_list) - 1)]
        
        target_benchmarks = self.benchmarks[target_rank]
        gaps = []
        
        for stat, target_value in target_benchmarks.items():
            if stat in player_stats:
                player_value = player_stats[stat]
                gap = target_value - player_value
                gap_percentage = (gap / target_value) * 100 if target_value != 0 else 0
                
                gaps.append({
                    "stat": stat,
                    "player_value": round(player_value, 2),
                    "target_value": round(target_value, 2),
                    "gap": round(gap, 2),
                    "gap_percentage": round(gap_percentage, 2)
                })
        
        # Sort by absolute gap percentage (biggest issues first)
        gaps.sort(key=lambda x: abs(x["gap_percentage"]), reverse=True)
        return gaps
    
    def generate_advice(self, gaps: List[Dict], top_n: int = 3) -> List[Dict]:
        """
        Generate actionable advice based on stat gaps
        
        Args:
            gaps: List of stat gaps from calculate_stat_gaps
            top_n: Number of advice items to generate
            
        Returns:
            List of advice dictionaries with priority, drills, and explanations
        """
        advice_list = []
        
        for i, gap in enumerate(gaps[:top_n]):
            stat = gap["stat"]
            if stat in self.advice_map:
                advice_item = {
                    "priority": i + 1,
                    "stat": stat,
                    "gap_info": gap,
                    **self.advice_map[stat]
                }
                advice_list.append(advice_item)
        
        return advice_list
    
    def calculate_percentiles(self, player_stats: Dict, current_rank: str) -> Dict:
        """
        Calculate where player stands relative to their rank benchmarks
        
        Args:
            player_stats: Dictionary of player statistics
            current_rank: Player's current rank
            
        Returns:
            Dictionary of percentile scores (0-100) for each stat
        """
        if current_rank not in self.benchmarks:
            return {}
        
        rank_benchmarks = self.benchmarks[current_rank]
        percentiles = {}
        
        for stat, benchmark in rank_benchmarks.items():
            if stat in player_stats:
                player_value = player_stats[stat]
                # Calculate percentile (50 = exactly at benchmark)
                percentile = (player_value / benchmark) * 50 if benchmark != 0 else 50
                percentiles[stat] = round(min(max(percentile, 0), 100), 1)
        
        return percentiles
    
    def get_overall_assessment(self, gaps: List[Dict]) -> str:
        """
        Generate overall performance assessment
        
        Args:
            gaps: List of stat gaps
            
        Returns:
            String with overall assessment message
        """
        if not gaps:
            return "Unable to assess performance with current data."
        
        # Calculate average gap percentage for top 5 stats
        avg_gap = np.mean([abs(g['gap_percentage']) for g in gaps[:5]])
        
        if avg_gap < 10:
            return "You're performing at or above your rank level! Focus on consistency and you'll rank up soon."
        elif avg_gap < 25:
            return "You're close to the next rank. Focus on the key areas below to push through."
        elif avg_gap < 40:
            return "There's room for improvement. Concentrate on the priority areas to advance your rank."
        else:
            return "Significant improvement needed. Focus on fundamentals in the priority areas below - you've got this!"
    
    def analyze_player(
        self, 
        player_stats: Dict, 
        current_rank: str,
        target_rank: Optional[str] = None,
        advice_count: int = 3
    ) -> Dict:
        """
        Complete player analysis pipeline
        
        Args:
            player_stats: Dictionary of player statistics
            current_rank: Player's current rank
            target_rank: Optional target rank (defaults to next rank)
            advice_count: Number of advice items to return
            
        Returns:
            Complete analysis dictionary with gaps, advice, percentiles, and assessment
        """
        # Calculate all components
        gaps = self.calculate_stat_gaps(player_stats, current_rank, target_rank)
        advice = self.generate_advice(gaps, top_n=advice_count)
        percentiles = self.calculate_percentiles(player_stats, current_rank)
        overall = self.get_overall_assessment(gaps)
        
        return {
            "success": True,
            "overall_assessment": overall,
            "advice": advice,
            "all_gaps": gaps,
            "percentiles": percentiles,
            "current_rank": current_rank,
            "target_rank": target_rank or self._get_next_rank(current_rank)
        }
    
    def _get_next_rank(self, current_rank: str) -> str:
        """Helper to get next rank in progression"""
        rank_list = list(self.benchmarks.keys())
        current_idx = rank_list.index(current_rank) if current_rank in rank_list else 0
        next_idx = min(current_idx + 1, len(rank_list) - 1)
        return rank_list[next_idx]


# Convenience function for simple usage
def analyze_player_stats(
    player_stats: Dict, 
    current_rank: str,
    target_rank: Optional[str] = None
) -> Dict:
    """
    Quick analysis function
    
    Args:
        player_stats: Dictionary of player statistics
        current_rank: Player's current rank
        target_rank: Optional target rank
        
    Returns:
        Complete analysis results
    """
    analyzer = RLStatsAnalyzer()
    return analyzer.analyze_player(player_stats, current_rank, target_rank)
