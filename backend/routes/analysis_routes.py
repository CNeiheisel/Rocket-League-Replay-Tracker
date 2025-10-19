

from flask import Blueprint, request, jsonify
from ai_coach.analyzer import analyze_player_stats


analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')


@analysis_bp.route('/analyze', methods=['POST'])
def analyze_player():
    """
    Analyze player statistics and return improvement advice
    
    Expected JSON body:
    {
        "stats": {
            "score": 450,
            "goals": 1.1,
            "assists": 0.7,
            ...
        },
        "current_rank": "Gold",
        "target_rank": "Platinum" (optional)
    }
    
    Returns:
    {
        "success": true,
        "overall_assessment": "...",
        "advice": [...],
        "all_gaps": [...],
        "percentiles": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        player_stats = data.get('stats', {})
        current_rank = data.get('current_rank', 'Gold')
        target_rank = data.get('target_rank', None)
        
        if not player_stats:
            return jsonify({
                "success": False,
                "error": "Stats dictionary is required"
            }), 400
        
        # Perform analysis
        result = analyze_player_stats(
            player_stats=player_stats,
            current_rank=current_rank,
            target_rank=target_rank
        )
        
        return jsonify(result), 200
    
    except KeyError as e:
        return jsonify({
            "success": False,
            "error": f"Missing required field: {str(e)}"
        }), 400
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Analysis failed: {str(e)}"
        }), 500


@analysis_bp.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    """
    Analyze multiple players or games at once
    
    Expected JSON body:
    {
        "games": [
            {
                "stats": {...},
                "current_rank": "Gold"
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        games = data.get('games', [])
        
        if not games:
            return jsonify({
                "success": False,
                "error": "No games provided"
            }), 400
        
        results = []
        for game in games:
            result = analyze_player_stats(
                player_stats=game.get('stats', {}),
                current_rank=game.get('current_rank', 'Gold'),
                target_rank=game.get('target_rank', None)
            )
            results.append(result)
        
        return jsonify({
            "success": True,
            "count": len(results),
            "results": results
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Batch analysis failed: {str(e)}"
        }), 500


@analysis_bp.route('/benchmarks', methods=['GET'])
def get_benchmarks():
    """
    Get benchmark data for all ranks
    
    Query params:
    - rank: (optional) specific rank to get benchmarks for
    
    Returns benchmark data
    """
    from ai_coach.benchmarks import RANK_BENCHMARKS
    
    rank = request.args.get('rank', None)
    
    if rank:
        if rank in RANK_BENCHMARKS:
            return jsonify({
                "success": True,
                "rank": rank,
                "benchmarks": RANK_BENCHMARKS[rank]
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Rank '{rank}' not found"
            }), 404
    
    return jsonify({
        "success": True,
        "benchmarks": RANK_BENCHMARKS
    }), 200


@analysis_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "RL AI Coach"
    }), 200
