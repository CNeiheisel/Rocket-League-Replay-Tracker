import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Target, Award, AlertCircle } from 'lucide-react';

const RocketLeagueAnalyzer = () => {
  const [playerStats, setPlayerStats] = useState({
    score: 450,
    goals: 1.1,
    assists: 0.7,
    saves: 1.6,
    shots: 4.2,
    shooting_percentage: 30,
    boost_usage: 52,
    avg_speed: 1050,
    time_supersonic: 22,
    time_boost_0_25: 23
  });
  
  const [currentRank, setCurrentRank] = useState('Gold');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Grand Champion', 'Supersonic Legend'];

  const analyzePlayer = async () => {
    setLoading(true);
    
    try {
      // Use your actual backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${backendUrl}/api/analysis/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stats: playerStats,
          current_rank: currentRank
        })
      });
      
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze. Make sure your backend is running.');
    }
    
    setLoading(false);
  };

  const handleStatChange = (stat, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [stat]: parseFloat(value) || 0
    }));
  };

  const radarData = analysis?.percentiles ? Object.keys(analysis.percentiles).slice(0, 6).map(key => ({
    stat: key.replace(/_/g, ' '),
    value: analysis.percentiles[key]
  })) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Award className="text-yellow-400" size={48} />
            Rocket League AI Coach
          </h1>
          <p className="text-blue-200 text-lg">AI-Powered Performance Analysis & Training Recommendations</p>
        </div>

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Target size={24} className="text-blue-400" />
            Player Stats Input
          </h2>
          
          <div className="mb-4">
            <label className="text-white font-semibold mb-2 block">Current Rank</label>
            <select 
              value={currentRank} 
              onChange={(e) => setCurrentRank(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-800 text-white border border-blue-500/50 focus:border-blue-400 outline-none"
            >
              {ranks.map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {Object.keys(playerStats).map(stat => (
              <div key={stat}>
                <label className="text-white text-sm font-semibold mb-1 block capitalize">
                  {stat.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={playerStats[stat]}
                  onChange={(e) => handleStatChange(stat, e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 text-white border border-blue-500/50 focus:border-blue-400 outline-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={analyzePlayer}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Analyzing...' : 'Analyze Performance'}
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && analysis.success && (
          <div className="space-y-6">
            {/* Overall Assessment */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-start gap-4">
                <TrendingUp className="text-green-400 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Overall Assessment</h3>
                  <p className="text-green-100 text-lg">{analysis.overall_assessment}</p>
                </div>
              </div>
            </div>

            {/* Visualizations */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Radar Chart */}
              {radarData.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Performance Percentiles</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#ffffff40" />
                      <PolarAngleAxis dataKey="stat" stroke="#ffffff" tick={{ fill: '#fff', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#ffffff40" tick={{ fill: '#fff' }} />
                      <Radar name="Your Stats" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className="text-blue-200 text-sm text-center mt-2">50th percentile = average for your rank</p>
                </div>
              )}

              {/* Top Gaps */}
              {analysis.all_gaps && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Biggest Improvement Areas</h3>
                  <div className="space-y-3">
                    {analysis.all_gaps.slice(0, 5).map((gap, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-semibold capitalize">{gap.stat.replace(/_/g, ' ')}</span>
                          <span className={`text-sm font-bold ${gap.gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {gap.gap > 0 ? '-' : '+'}{Math.abs(gap.gap_percentage).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <span className="text-blue-300">You: {gap.player_value}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-green-300">Target: {gap.target_value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Priority Advice */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-yellow-400" size={32} />
                Priority Training Focus
              </h2>
              
              {analysis.advice.map((item, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-blue-400/50 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {item.priority}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-blue-100 mb-4 leading-relaxed">{item.advice}</p>
                      
                      {/* Gap Info */}
                      {item.gap_info && (
                        <div className="bg-slate-900/50 rounded px-3 py-2 mb-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-300">Your stat: <strong>{item.gap_info.player_value}</strong></span>
                            <span className="text-green-300">Target: <strong>{item.gap_info.target_value}</strong></span>
                          </div>
                        </div>
                      )}

                      {/* Training Drills */}
                      {item.drills && item.drills.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-2">Recommended Training:</h4>
                          <ul className="space-y-1">
                            {item.drills.map((drill, dIdx) => (
                              <li key={dIdx} className="text-blue-200 flex items-center gap-2">
                                <span className="text-blue-400">•</span>
                                {drill}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RocketLeagueAnalyzer;
