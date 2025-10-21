import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Target, Award, AlertCircle } from 'lucide-react';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #0f172a, #1e3a8a, #0f172a)',
    padding: '24px',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  maxWidth: {
    maxWidth: '1280px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  headerTitle: {
    fontSize: '48px',
    fontWeight: '900',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  headerSubtitle: {
    color: '#93c5fd',
    fontSize: '18px'
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
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.5)',
    background: 'rgba(15, 23, 42, 0.7)',
    color: 'white',
    fontSize: '16px',
    width: '100%'
  },
  button: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
    marginTop: '16px'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    display: 'block',
    color: '#e5e7eb'
  },
  assessmentCard: {
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  assessmentText: {
    color: '#d1fae5',
    fontSize: '18px',
    lineHeight: '1.6'
  },
  adviceContainer: {
    marginTop: '32px'
  },
  adviceTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  adviceCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
    display: 'flex',
    gap: '16px'
  },
  priorityBadge: {
    width: '40px',
    height: '40px',
    minWidth: '40px',
    background: 'linear-gradient(to right, #3b82f6, #2563eb)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  chartCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px'
  },
  gapInfo: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '12px',
    fontSize: '14px'
  }
};

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
      const backendUrl = process.env.REACT_APP_API_URL || 'https://rocket-league-replay-tracker.onrender.com/api';
      
      const response = await fetch(`${backendUrl}/analysis/analyze`, {
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
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Award size={48} style={{color: '#fbbf24'}} />
            Rocket League AI Coach
          </div>
          <p style={styles.headerSubtitle}>AI-Powered Performance Analysis & Training Recommendations</p>
        </div>

        {/* Input Section */}
        <div style={styles.card}>
          <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Target size={24} style={{color: '#60a5fa'}} />
            Player Stats Input
          </h2>
          
          <div style={{marginBottom: '16px'}}>
            <label style={styles.label}>Current Rank</label>
            <select 
              value={currentRank} 
              onChange={(e) => setCurrentRank(e.target.value)}
              style={styles.input}
            >
              {ranks.map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </div>

          <div style={styles.grid2}>
            {Object.keys(playerStats).map(stat => (
              <div key={stat}>
                <label style={styles.label}>
                  {stat.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={playerStats[stat]}
                  onChange={(e) => handleStatChange(stat, e.target.value)}
                  style={styles.input}
                />
              </div>
            ))}
          </div>

          <button
            onClick={analyzePlayer}
            disabled={loading}
            style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
          >
            {loading ? 'Analyzing...' : 'Analyze Performance'}
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && analysis.success && (
          <div>
            {/* Overall Assessment */}
            <div style={styles.assessmentCard}>
              <div>
                <TrendingUp size={32} style={{color: '#22c55e', marginTop: '4px'}} />
              </div>
              <div>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: 'white'}}>Overall Assessment</h3>
                <p style={styles.assessmentText}>{analysis.overall_assessment}</p>
              </div>
            </div>

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <div style={styles.chartCard}>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'white'}}>Performance Percentiles</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff40" />
                    <PolarAngleAxis dataKey="stat" stroke="#ffffff" tick={{ fill: '#fff', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#ffffff40" tick={{ fill: '#fff' }} />
                    <Radar name="Your Stats" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
                <p style={{color: '#93c5fd', fontSize: '14px', textAlign: 'center', marginTop: '12px'}}>50th percentile = average for your rank</p>
              </div>
            )}

            {/* Top Gaps */}
            {analysis.all_gaps && (
              <div style={styles.chartCard}>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'white'}}>Biggest Improvement Areas</h3>
                <div>
                  {analysis.all_gaps.slice(0, 5).map((gap, idx) => (
                    <div key={idx} style={{background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '16px', marginBottom: '12px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <span style={{color: 'white', fontWeight: 'bold'}}>{gap.stat.replace(/_/g, ' ')}</span>
                        <span style={{color: gap.gap > 0 ? '#f87171' : '#86efac', fontWeight: 'bold', fontSize: '14px'}}>
                          {gap.gap > 0 ? '-' : '+'}{Math.abs(gap.gap_percentage).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{display: 'flex', gap: '8px', fontSize: '14px'}}>
                        <span style={{color: '#93c5fd'}}>You: {gap.player_value}</span>
                        <span style={{color: '#6b7280'}}>|</span>
                        <span style={{color: '#86efac'}}>Target: {gap.target_value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priority Advice */}
            <div style={styles.adviceContainer}>
              <h2 style={styles.adviceTitle}>
                <AlertCircle size={32} style={{color: '#fbbf24'}} />
                Priority Training Focus
              </h2>
              
              {analysis.advice.map((item, idx) => (
                <div key={idx} style={styles.adviceCard}>
                  <div style={styles.priorityBadge}>{item.priority}</div>
                  <div style={{flex: 1}}>
                    <h3 style={{fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '12px'}}>{item.title}</h3>
                    <p style={{color: '#bfdbfe', marginBottom: '16px', lineHeight: '1.6'}}>{item.advice}</p>
                    
                    {item.gap_info && (
                      <div style={styles.gapInfo}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <span style={{color: '#93c5fd'}}>Your stat: <strong>{item.gap_info.player_value}</strong></span>
                          <span style={{color: '#86efac'}}>Target: <strong>{item.gap_info.target_value}</strong></span>
                        </div>
                      </div>
                    )}

                    {item.drills && item.drills.length > 0 && (
                      <div style={{background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', padding: '16px', marginTop: '12px'}}>
                        <h4 style={{color: 'white', fontWeight: 'bold', marginBottom: '12px'}}>Recommended Training:</h4>
                        <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                          {item.drills.map((drill, dIdx) => (
                            <li key={dIdx} style={{color: '#93c5fd', marginBottom: '8px', display: 'flex', gap: '8px'}}>
                              <span style={{color: '#60a5fa'}}>•</span>
                              {drill}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
