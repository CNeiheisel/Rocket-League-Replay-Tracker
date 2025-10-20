import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, TrendingUp, Award, Target, Search, Zap, Users, Trophy, Calendar } from 'lucide-react';

const API_URL = typeof process !== 'undefined' && process.env?.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL 
  : 'https://rocket-league-replay-tracker.onrender.com/api';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
    color: 'white',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '48px',
    fontWeight: '900',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa, #fb923c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#d1d5db',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  card: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    marginBottom: '24px'
  },
  button: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '16px'
  },
  buttonPrimary: {
    background: 'linear-gradient(to right, #3b82f6, #2563eb)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
  },
  buttonOrange: {
    background: 'linear-gradient(to right, #f97316, #dc2626)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: 'white',
    fontSize: '16px',
    width: '100%'
  },
  statCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.3s',
    cursor: 'pointer'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '900',
    background: 'linear-gradient(to right, white, #d1d5db)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    textAlign: 'left',
    padding: '16px',
    color: '#9ca3af',
    fontWeight: '700',
    borderBottom: '2px solid #374151'
  },
  tableRow: {
    borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '16px'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: '700',
    fontSize: '14px'
  },
  tab: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '16px',
    marginRight: '12px'
  },
  tabActive: {
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)'
  },
  tabInactive: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white'
  }
};

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
      <div style={{...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '20px', fontWeight: '600'}}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px'}}>
            <Zap style={{color: '#60a5fa'}} size={40} />
            <h1 style={styles.title}>Rocket League Replay Tracker</h1>
            <Zap style={{color: '#fb923c'}} size={40} />
          </div>
          <p style={styles.subtitle}>
            <Trophy style={{color: '#fbbf24'}} size={20} />
            Michigan State University Varsity Team
          </p>
        </div>

        {/* Tabs */}
{/* Tabs */}
<div style={{textAlign: 'center', marginBottom: '32px'}}>
  {['overview', 'players', 'matches'].map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{...styles.tab, ...(activeTab === tab ? styles.tabActive : styles.tabInactive)}}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
  <button
    onClick={() => window.location.href = '/ai-coach'}
    style={{...styles.tab, ...styles.tabInactive}}
  >
    AI Coach
  </button>
</div>

        {/* Import Section */}
        <div style={styles.card}>
          <div style={{display: 'flex', alignItems: 'start', gap: '16px'}}>
            <div style={{background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '12px', borderRadius: '12px'}}>
              <Upload style={{color: 'white'}} size={24} />
            </div>
            <div style={{flex: 1}}>
              <h3 style={{fontSize: '20px', fontWeight: '700', marginBottom: '16px'}}>
                Import Replay from BallChasing
              </h3>
              
              <div style={{marginBottom: '16px', display: 'flex', gap: '12px'}}>
                <input
                  type="text"
                  placeholder="e.g., 63e3132f-c3c9-4182-ae44-8e253ec64f45"
                  value={replayId}
                  onChange={(e) => setReplayId(e.target.value)}
                  style={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && handleReplayImport()}
                />
                <button
                  onClick={handleReplayImport}
                  style={{...styles.button, ...styles.buttonPrimary}}
                >
                  Import
                </button>
              </div>

              <details>
                <summary style={{color: '#9ca3af', cursor: 'pointer', marginBottom: '12px'}}>
                  📦 Batch Import
                </summary>
                <div>
                  <textarea
                    placeholder="Enter replay IDs (one per line)"
                    value={batchReplayIds}
                    onChange={(e) => setBatchReplayIds(e.target.value)}
                    style={{...styles.input, minHeight: '100px', fontFamily: 'monospace'}}
                  />
                  <button
                    onClick={handleBatchImport}
                    style={{...styles.button, ...styles.buttonOrange, marginTop: '12px'}}
                  >
                    Batch Import
                  </button>
                </div>
              </details>
            </div>
            {uploadStatus && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontWeight: '600',
                background: uploadStatus.includes('✓') ? 'rgba(34, 197, 94, 0.2)' :
                           uploadStatus.includes('⚠') ? 'rgba(234, 179, 8, 0.2)' :
                           'rgba(59, 130, 246, 0.2)',
                color: uploadStatus.includes('✓') ? '#86efac' :
                       uploadStatus.includes('⚠') ? '#fde047' : '#93c5fd',
                border: '1px solid',
                borderColor: uploadStatus.includes('✓') ? 'rgba(34, 197, 94, 0.3)' :
                            uploadStatus.includes('⚠') ? 'rgba(234, 179, 8, 0.3)' :
                            'rgba(59, 130, 246, 0.3)'
              }}>
                {uploadStatus}
              </div>
            )}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px'}}>
              {[
                { icon: Target, label: 'Total Matches', value: matches.length, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
                { icon: Users, label: 'Total Players', value: players.length, gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
                { icon: TrendingUp, label: 'Avg Goals/Game', value: players.length > 0 ? (players.reduce((sum, p) => sum + parseFloat(p.avg_goals || 0), 0) / players.length).toFixed(2) : '0.00', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                { icon: Trophy, label: 'Total MVPs', value: players.reduce((sum, p) => sum + parseInt(p.mvp_count || 0), 0), gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' }
              ].map((stat, idx) => (
                <div key={idx} style={styles.statCard} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <div style={{background: stat.gradient, padding: '12px', borderRadius: '12px', display: 'inline-block', marginBottom: '12px'}}>
                    <stat.icon style={{color: 'white'}} size={24} />
                  </div>
                  <div style={{color: '#9ca3af', fontSize: '14px', marginBottom: '8px', fontWeight: '600'}}>{stat.label}</div>
                  <div style={styles.statValue}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Player Selection */}
            {players.length > 0 && (
              <>
                <div style={styles.card}>
                  <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                    <Search style={{color: '#9ca3af'}} size={24} />
                    <select
                      style={{...styles.input, flex: 1, minWidth: '300px'}}
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
                      style={styles.input}
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
                  <div style={styles.card}>
                    <h2 style={{fontSize: '24px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <TrendingUp style={{color: '#60a5fa'}} />
                      Performance Trends - {selectedPlayer.player_name}
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', padding: '12px' }}
                          labelStyle={{ color: '#9ca3af', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="avg_goals" stroke="#3b82f6" name="Goals" strokeWidth={3} />
                        <Line type="monotone" dataKey="avg_assists" stroke="#f59e0b" name="Assists" strokeWidth={3} />
                        <Line type="monotone" dataKey="avg_saves" stroke="#10b981" name="Saves" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div style={styles.card}>
            <h2 style={{fontSize: '28px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Trophy style={{color: '#fbbf24'}} />
              Top Players Leaderboard
            </h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Rank</th>
                  <th style={styles.tableHeader}>Player</th>
                  <th style={{...styles.tableHeader, textAlign: 'center'}}>Matches</th>
                  <th style={{...styles.tableHeader, textAlign: 'center'}}>Goals</th>
                  <th style={{...styles.tableHeader, textAlign: 'center'}}>Assists</th>
                  <th style={{...styles.tableHeader, textAlign: 'center'}}>Saves</th>
                  <th style={{...styles.tableHeader, textAlign: 'center'}}>MVPs</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0, 10).map((player, idx) => (
                  <tr 
                    key={player.player_id} 
                    style={styles.tableRow}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setSelectedPlayer(player); setActiveTab('overview'); }}
                  >
                    <td style={styles.tableCell}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        background: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                   idx === 1 ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' :
                                   idx === 2 ? 'linear-gradient(135deg, #fb923c, #f97316)' : 'transparent',
                        color: idx < 3 ? '#000' : '#6b7280'
                      }}>
                        {idx + 1}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '700', fontSize: '16px'}}>{player.player_name}</div>
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>{player.matches_played}</td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <span style={{...styles.badge, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd'}}>
                        {player.total_goals}
                      </span>
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <span style={{...styles.badge, background: 'rgba(249, 115, 22, 0.2)', color: '#fdba74'}}>
                        {player.total_assists}
                      </span>
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <span style={{...styles.badge, background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7'}}>
                        {player.total_saves}
                      </span>
                    </td>
                    <td style={{...styles.tableCell, textAlign: 'center'}}>
                      <span style={{...styles.badge, background: 'rgba(251, 191, 36, 0.2)', color: '#fde047'}}>
                        {player.mvp_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div style={styles.card}>
            <h2 style={{fontSize: '28px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Calendar style={{color: '#10b981'}} />
              Recent Matches
            </h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {matches.slice(0, 10).map(match => (
                <div key={match.match_id} style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <div style={{fontWeight: '700', fontSize: '18px', marginBottom: '8px'}}>
                        {match.map_name || 'Unknown Map'}
                      </div>
                      <div style={{color: '#9ca3af', fontSize: '14px'}}>
                        {new Date(match.match_date).toLocaleDateString()} • {match.game_mode || 'Standard'}
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '18px',
                        background: match.winning_team === 'blue' ? 'linear-gradient(to right, #3b82f6, #2563eb)' : 'rgba(59, 130, 246, 0.3)',
                        boxShadow: match.winning_team === 'blue' ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
                      }}>
                        Blue {match.blue_score}
                      </div>
                      <span style={{color: '#6b7280', fontWeight: '700'}}>VS</span>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '18px',
                        background: match.winning_team === 'orange' ? 'linear-gradient(to right, #f97316, #dc2626)' : 'rgba(249, 115, 22, 0.3)',
                        boxShadow: match.winning_team === 'orange' ? '0 4px 15px rgba(249, 115, 22, 0.3)' : 'none'
                      }}>
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
    </div>
  );
}
