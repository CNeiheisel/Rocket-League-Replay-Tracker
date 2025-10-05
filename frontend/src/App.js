import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Upload, TrendingUp, Award, Target, Search, Zap, Users, Trophy, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://rocket-league-replay-tracker.onrender.com/api';

export default function RocketLeagueDashboard() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ team: '', days: 30 });
  const [uploadStatus, setUploadStatus] = useState('');
  const [replayId, setReplayId] = useState('');
  const [batchReplayIds, setBatchReplayIds] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMatches();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchTrends(selectedPlayer.player_id);
    }
  }, [selectedPlayer, filter.days]);

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_URL}/matches?limit=20`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_URL}/players`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPlayers(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
      setLoading(false);
    }
  };

  const fetchTrends = async (playerId) => {
    try {
      const response = await fetch(`${API_URL}/stats/trends?player_id=${playerId}&days=${filter.days}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTrends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      setTrends([]);
    }
  };

  const handleReplayImport = async () => {
    if (!replayId.trim()) {
      setUploadStatus('Please enter a replay ID');
      return;
    }

    setUploadStatus('Importing replay...');
    try {
      const response = await fetch(`${API_URL}/replays/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replay_id: replayId }),
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadStatus('✓ Import successful!');
        setReplayId('');
        fetchMatches();
        fetchPlayers();
        setTimeout(() => setUploadStatus(''), 3000);
      } else if (response.status === 409) {
        setUploadStatus('⚠ Replay already imported');
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus('✗ Import failed: ' + data.error);
      }
    } catch (error) {
      setUploadStatus('✗ Import error');
      console.error('Import error:', error);
    }
  };

  const handleBatchImport = async () => {
    const ids = batchReplayIds.split('\n').map(id => id.trim()).filter(id => id);
    if (ids.length === 0) {
      setUploadStatus('Please enter replay IDs');
      return;
    }

    setUploadStatus(`Importing ${ids.length} replays...`);
    try {
      const response = await fetch(`${API_URL}/replays/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replay_ids: ids }),
      });
      const data = await response.json();
      
      setUploadStatus(
        `✓ Success: ${data.success.length} | ⚠ Skipped: ${data.skipped.length} | ✗ Failed: ${data.failed.length}`
      );
      setBatchReplayIds('');
      fetchMatches();
      fetchPlayers();
      setTimeout(() => setUploadStatus(''), 5000);
    } catch (error) {
      setUploadStatus('✗ Batch import error');
      console.error('Batch import error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <div className="text-white text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  const getPlayerRadarData = () => {
    if (!selectedPlayer) return [];
    return [
      { stat: 'Goals', value: parseFloat(selectedPlayer.avg_goals) * 10 },
      { stat: 'Assists', value: parseFloat(selectedPlayer.avg_assists) * 10 },
      { stat: 'Saves', value: parseFloat(selectedPlayer.avg_saves) * 10 },
      { stat: 'Shots', value: (parseFloat(selectedPlayer.total_shots) / parseFloat(selectedPlayer.matches_played)) * 2 },
      { stat: 'MVPs', value: (parseFloat(selectedPlayer.mvp_count) / parseFloat(selectedPlayer.matches_played)) * 50 }
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-3">
            <Zap className="text-blue-400 animate-pulse" size={40} />
            <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              Rocket League Replay Tracker
            </h1>
            <Zap className="text-orange-400 animate-pulse" size={40} />
          </div>
          <p className="text-gray-300 text-lg font-medium flex items-center justify-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            Michigan State University Varsity Team
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {['overview', 'players', 'matches'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Import Section */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/10 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
              <Upload className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                Import Replay from BallChasing
                <span className="text-sm font-normal text-gray-400">Get replay IDs from ballchasing.com</span>
              </h3>
              
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., 63e3132f-c3c9-4182-ae44-8e253ec64f45"
                    value={replayId}
                    onChange={(e) => setReplayId(e.target.value)}
                    className="flex-1 bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleReplayImport()}
                  />
                  <button
                    onClick={handleReplayImport}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-8 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                  >
                    Import
                  </button>
                </div>
              </div>

              <details className="cursor-pointer group">
                <summary className="text-sm text-gray-400 hover:text-gray-300 mb-2 font-medium">
                  📦 Batch Import (click to expand)
                </summary>
                <div className="mt-2 space-y-2">
                  <textarea
                    placeholder="Enter replay IDs (one per line)"
                    value={batchReplayIds}
                    onChange={(e) => setBatchReplayIds(e.target.value)}
                    className="w-full bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 min-h-[100px] font-mono text-sm transition-all"
                  />
                  <button
                    onClick={handleBatchImport}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-6 py-2 rounded-xl transition-all font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
                  >
                    Batch Import
                  </button>
                </div>
              </details>
            </div>
            {uploadStatus && (
              <div className={`px-4 py-3 rounded-xl font-semibold animate-fade-in ${
                uploadStatus.includes('✓') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
                uploadStatus.includes('⚠') ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {uploadStatus}
              </div>
            )}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { icon: Target, label: 'Total Matches', value: matches.length, color: 'from-blue-500 to-cyan-500', iconColor: 'text-cyan-300' },
                { icon: Users, label: 'Total Players', value: players.length, color: 'from-purple-500 to-pink-500', iconColor: 'text-pink-300' },
                { icon: TrendingUp, label: 'Avg Goals/Game', value: players.length > 0 ? (players.reduce((sum, p) => sum + parseFloat(p.avg_goals || 0), 0) / players.length).toFixed(2) : '0.00', color: 'from-green-500 to-emerald-500', iconColor: 'text-emerald-300' },
                { icon: Trophy, label: 'Total MVPs', value: players.reduce((sum, p) => sum + parseInt(p.mvp_count || 0), 0), color: 'from-yellow-500 to-orange-500', iconColor: 'text-orange-300' }
              ].map((stat, idx) => (
                <div key={idx} className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl hover:scale-105 transition-all duration-300 hover:shadow-blue-500/20">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={stat.iconColor} size={24} />
                  </div>
                  <div className="text-gray-400 text-sm font-medium mb-1">{stat.label}</div>
                  <div className="text-4xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Player Selection & Trends */}
            {players.length > 0 && (
              <>
                <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Search className="text-gray-400" size={24} />
                    <select
                      className="flex-1 min-w-[300px] bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 font-medium transition-all"
                      onChange={(e) => {
                        const player = players.find(p => p.player_id === parseInt(e.target.value));
                        setSelectedPlayer(player);
                      }}
                      value={selectedPlayer?.player_id || ''}
                    >
                      <option value="">Select a player to view detailed stats</option>
                      {players.map(player => (
                        <option key={player.player_id} value={player.player_id}>
                          {player.player_name} - {player.matches_played} matches • {player.total_goals} goals
                        </option>
                      ))}
                    </select>
                    
                    <select
                      className="bg-slate-900/50 text-white px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 font-medium transition-all"
                      value={filter.days}
                      onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value) })}
                    >
                      <option value={7}>Last 7 Days</option>
                      <option value={30}>Last 30 Days</option>
                      <option value={90}>Last 90 Days</option>
                    </select>
                  </div>
                </div>

                {selectedPlayer && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Performance Trends */}
                    {trends.length > 0 && (
                      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                          <TrendingUp className="text-blue-400" />
                          Performance Trends - {selectedPlayer.player_name}
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', padding: '12px' }}
                              labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="avg_goals" stroke="#3B82F6" name="Goals" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
                            <Line type="monotone" dataKey="avg_assists" stroke="#F59E0B" name="Assists" strokeWidth={3} dot={{ fill: '#F59E0B', r: 5 }} />
                            <Line type="monotone" dataKey="avg_saves" stroke="#10B981" name="Saves" strokeWidth={3} dot={{ fill: '#10B981', r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Player Radar Chart */}
                    <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Award className="text-purple-400" />
                        Player Profile
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={getPlayerRadarData()}>
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis dataKey="stat" stroke="#9CA3AF" />
                          <PolarRadiusAxis stroke="#9CA3AF" />
                          <Radar name={selectedPlayer.player_name} dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Trophy className="text-yellow-400" />
              Top Players Leaderboard
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-700">
                    <th className="text-left py-4 px-4 text-gray-400 font-bold">Rank</th>
                    <th className="text-left py-4 px-4 text-gray-400 font-bold">Player</th>
                    <th className="text-center py-4 px-4 text-gray-400 font-bold">Matches</th>
                    <th className="text-center py-4 px-4 text-gray-400 font-bold">Goals</th>
                    <th className="text-center py-4 px-4 text-gray-400 font-bold">Assists</th>
                    <th className="text-center py-4 px-4 text-gray-400 font-bold">Saves</th>
                    <th className="text-center py-4 px-4 text-gray-400 font-bold">MVPs</th>
                  </tr>
                </thead>
                <tbody>
                  {players.slice(0, 10).map((player, idx) => (
                    <tr 
                      key={player.player_id} 
                      className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                      onClick={() => { setSelectedPlayer(player); setActiveTab('overview'); }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {idx < 3 ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                              idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                              idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                              'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900'
                            }`}>
                              {idx + 1}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-bold w-8 text-center">#{idx + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-lg group-hover:text-blue-400 transition-colors">{player.player_name}</div>
                      </td>
                      <td className="text-center py-4 px-4 font-semibold">{player.matches_played}</td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                          {player.total_goals}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 font-bold">
                          {player.total_assists}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-bold">
                          {player.total_saves}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 font-bold">
                          {player.mvp_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Calendar className="text-green-400" />
              Recent Matches
            </h2>
            <div className="space-y-4">
              {matches.slice(0, 10).map(match => (
                <div key={match.match_id} className="bg-slate-900/50 rounded-xl p-5 hover:bg-slate-800/50 transition-all duration-200 border border-white/5 hover:border-white/10 group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                        {match.map_name || 'Unknown Map'}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(match.match_date).toLocaleDateString()}
                        </span>
                        <span>{match.game_mode || 'Standard'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                        match.winning_team === 'blue' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
                          : 'bg-blue-900/30'
                      }`}>
                        Blue {match.blue_score}
                      </div>
                      <span className="text-gray-500 font-bold">VS</span>
                      <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                        match.winning_team === 'orange' 
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30' 
                          : 'bg-orange-900/30'
                      }`}>
                        {match.orange_score} Orange
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
