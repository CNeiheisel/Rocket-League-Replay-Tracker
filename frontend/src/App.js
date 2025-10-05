import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, TrendingUp, Award, Target, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://rocket-league-replay-tracker.onrender.com/api';

export default function RocketLeagueDashboard() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ team: '', days: 30 });
  const [uploadStatus, setUploadStatus] = useState('');

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
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_URL}/players`);
      const data = await response.json();
      setPlayers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
    }
  };

  const fetchTrends = async (playerId) => {
    try {
      const response = await fetch(`${API_URL}/stats/trends?player_id=${playerId}&days=${filter.days}`);
      const data = await response.json();
      setTrends(data);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const [replayId, setReplayId] = useState('');
  const [batchReplayIds, setBatchReplayIds] = useState('');

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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
          Rocket League Replay Tracker
        </h1>
        <p className="text-gray-400">Michigan State University Varsity Team</p>
      </div>

      {/* Import Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <Upload className="text-blue-400 mt-1" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Import Replay from BallChasing</h3>
            
            {/* Single Replay Import */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Replay ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., 63e3132f-c3c9-4182-ae44-8e253ec64f45"
                  value={replayId}
                  onChange={(e) => setReplayId(e.target.value)}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-400"
                  onKeyPress={(e) => e.key === 'Enter' && handleReplayImport()}
                />
                <button
                  onClick={handleReplayImport}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition font-medium"
                >
                  Import
                </button>
              </div>
            </div>

            {/* Batch Import */}
            <details className="cursor-pointer">
              <summary className="text-sm text-gray-400 hover:text-gray-300 mb-2">
                Batch Import (click to expand)
              </summary>
              <div className="mt-2">
                <textarea
                  placeholder="Enter replay IDs (one per line)"
                  value={batchReplayIds}
                  onChange={(e) => setBatchReplayIds(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-400 min-h-[100px] font-mono text-sm"
                />
                <button
                  onClick={handleBatchImport}
                  className="mt-2 bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded-lg transition font-medium"
                >
                  Batch Import
                </button>
              </div>
            </details>
          </div>
          {uploadStatus && (
            <div className={`px-4 py-2 rounded-lg ${
              uploadStatus.includes('✓') ? 'bg-green-900/50 text-green-400' : 
              uploadStatus.includes('⚠') ? 'bg-yellow-900/50 text-yellow-400' : 
              'bg-blue-900/50 text-blue-400'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Get replay IDs from <a href="https://ballchasing.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ballchasing.com</a>
        </div>
      </div>


      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-400" size={20} />
            <span className="text-gray-400 text-sm">Total Matches</span>
          </div>
          <div className="text-3xl font-bold">{matches.length}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-orange-400" size={20} />
            <span className="text-gray-400 text-sm">Total Players</span>
          </div>
          <div className="text-3xl font-bold">{players.length}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-400" size={20} />
            <span className="text-gray-400 text-sm">Avg Goals/Game</span>
          </div>
          <div className="text-3xl font-bold">
            {players.length > 0 
              ? (players.reduce((sum, p) => sum + parseFloat(p.avg_goals || 0), 0) / players.length).toFixed(2)
              : '0.00'}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-yellow-400" size={20} />
            <span className="text-gray-400 text-sm">Total MVPs</span>
          </div>
          <div className="text-3xl font-bold">
            {players.reduce((sum, p) => sum + parseInt(p.mvp_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* Player Selection */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <Search className="text-gray-400" size={20} />
          <select
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-400"
            onChange={(e) => {
              const player = players.find(p => p.player_id === parseInt(e.target.value));
              setSelectedPlayer(player);
            }}
            value={selectedPlayer?.player_id || ''}
          >
            <option value="">Select a player to view stats</option>
            {players.map(player => (
              <option key={player.player_id} value={player.player_id}>
                {player.player_name} - {player.matches_played} matches
              </option>
            ))}
          </select>
          
          <select
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-400"
            value={filter.days}
            onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value) })}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Performance Trends */}
      {selectedPlayer && trends.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Performance Trends - {selectedPlayer.player_name}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Legend />
              <Line type="monotone" dataKey="avg_goals" stroke="#3B82F6" name="Goals" strokeWidth={2} />
              <Line type="monotone" dataKey="avg_assists" stroke="#F59E0B" name="Assists" strokeWidth={2} />
              <Line type="monotone" dataKey="avg_saves" stroke="#10B981" name="Saves" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Players */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Top Players</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Player</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Matches</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Goals</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Assists</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Saves</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">MVPs</th>
              </tr>
            </thead>
            <tbody>
              {players.slice(0, 10).map((player, idx) => (
                <tr 
                  key={player.player_id} 
                  className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition"
                  onClick={() => setSelectedPlayer(player)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#{idx + 1}</span>
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">{player.matches_played}</td>
                  <td className="text-center py-3 px-4 text-blue-400 font-semibold">{player.total_goals}</td>
                  <td className="text-center py-3 px-4 text-orange-400 font-semibold">{player.total_assists}</td>
                  <td className="text-center py-3 px-4 text-green-400 font-semibold">{player.total_saves}</td>
                  <td className="text-center py-3 px-4 text-yellow-400 font-semibold">{player.mvp_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Matches</h2>
        <div className="space-y-3">
          {matches.slice(0, 10).map(match => (
            <div key={match.match_id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium mb-1">{match.map_name || 'Unknown Map'}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(match.match_date).toLocaleDateString()} • {match.game_mode || 'Standard'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded ${match.winning_team === 'blue' ? 'bg-blue-600' : 'bg-blue-900'}`}>
                        Blue {match.blue_score}
                      </span>
                      <span className="text-gray-500">-</span>
                      <span className={`px-3 py-1 rounded ${match.winning_team === 'orange' ? 'bg-orange-600' : 'bg-orange-900'}`}>
                        {match.orange_score} Orange
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
