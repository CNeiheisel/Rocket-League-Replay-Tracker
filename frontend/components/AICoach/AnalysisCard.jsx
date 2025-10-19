
import React from 'react';
import { TrendingUp, Target, Award, AlertCircle } from 'lucide-react';


const AnalysisCard = ({ analysis }) => {
  if (!analysis || !analysis.success) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-xl p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Award className="text-yellow-400" size={32} />
        <div>
          <h2 className="text-2xl font-bold">AI Coach Analysis</h2>
          <p className="text-blue-200 text-sm">Personalized improvement recommendations</p>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-green-400 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-lg mb-1">Overall Assessment</h3>
            <p className="text-blue-100">{analysis.overall_assessment}</p>
          </div>
        </div>
      </div>

      {/* Priority Advice */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-3">
          <Target className="text-yellow-400" size={24} />
          Top 3 Areas to Improve
        </h3>
        
        {analysis.advice && analysis.advice.map((item, idx) => (
          <div 
            key={idx} 
            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:border-blue-400/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                {item.priority}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                <p className="text-blue-100 text-sm mb-3">{item.advice}</p>
                
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
                  <div className="mt-2">
                    <p className="text-xs text-blue-300 font-semibold mb-1">Recommended Training:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.drills.map((drill, dIdx) => (
                        <span 
                          key={dIdx}
                          className="bg-blue-600/30 text-blue-200 text-xs px-2 py-1 rounded"
                        >
                          {drill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      {analysis.all_gaps && analysis.all_gaps.length > 0 && (
        <div className="mt-6 bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-400" />
            All Stats vs Next Rank
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {analysis.all_gaps.slice(0, 6).map((gap, idx) => (
              <div key={idx} className="bg-slate-900/30 rounded p-2 text-sm">
                <div className="text-blue-300 text-xs capitalize mb-1">
                  {gap.stat.replace(/_/g, ' ')}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">{gap.player_value}</span>
                  <span className={`text-xs font-bold ${gap.gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {gap.gap > 0 ? '↓' : '↑'} {Math.abs(gap.gap_percentage).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisCard;
