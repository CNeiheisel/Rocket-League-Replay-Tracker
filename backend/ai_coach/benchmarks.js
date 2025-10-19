/**
 * Benchmark data and advice templates for Rocket League ranks
 */

const RANK_BENCHMARKS = {
  "Bronze": {
    score: 250,
    goals: 0.8,
    assists: 0.4,
    saves: 1.2,
    shots: 2.5,
    shooting_percentage: 25,
    boost_usage: 45,
    avg_speed: 800,
    time_supersonic: 15,
    time_boost_0_25: 30
  },
  "Silver": {
    score: 350,
    goals: 1.0,
    assists: 0.6,
    saves: 1.5,
    shots: 3.5,
    shooting_percentage: 28,
    boost_usage: 50,
    avg_speed: 950,
    time_supersonic: 20,
    time_boost_0_25: 25
  },
  "Gold": {
    score: 450,
    goals: 1.2,
    assists: 0.8,
    saves: 1.8,
    shots: 4.5,
    shooting_percentage: 32,
    boost_usage: 55,
    avg_speed: 1100,
    time_supersonic: 25,
    time_boost_0_25: 20
  },
  "Platinum": {
    score: 550,
    goals: 1.4,
    assists: 1.0,
    saves: 2.0,
    shots: 5.5,
    shooting_percentage: 35,
    boost_usage: 60,
    avg_speed: 1200,
    time_supersonic: 30,
    time_boost_0_25: 15
  },
  "Diamond": {
    score: 650,
    goals: 1.6,
    assists: 1.2,
    saves: 2.3,
    shots: 6.5,
    shooting_percentage: 38,
    boost_usage: 65,
    avg_speed: 1300,
    time_supersonic: 35,
    time_boost_0_25: 12
  },
  "Champion": {
    score: 750,
    goals: 1.8,
    assists: 1.4,
    saves: 2.5,
    shots: 7.5,
    shooting_percentage: 42,
    boost_usage: 70,
    avg_speed: 1400,
    time_supersonic: 40,
    time_boost_0_25: 10
  },
  "Grand Champion": {
    score: 850,
    goals: 2.0,
    assists: 1.6,
    saves: 2.8,
    shots: 8.5,
    shooting_percentage: 45,
    boost_usage: 75,
    avg_speed: 1500,
    time_supersonic: 45,
    time_boost_0_25: 8
  },
  "Supersonic Legend": {
    score: 950,
    goals: 2.2,
    assists: 1.8,
    saves: 3.0,
    shots: 9.5,
    shooting_percentage: 48,
    boost_usage: 80,
    avg_speed: 1600,
    time_supersonic: 50,
    time_boost_0_25: 5
  }
};

const ADVICE_MAP = {
  shooting_percentage: {
    title: "Shot Accuracy & Quality",
    advice: "Your shooting percentage is below average for your rank. Focus on taking higher quality shots rather than just shooting whenever possible. Practice shooting packs in training and work on powershots and accurate placement.",
    drills: [
      "Shooting Consistency by Poquito",
      "Wall Shots Training",
      "Powershot Training Pack",
      "Ground Shots by Wayprotein"
    ]
  },
  saves: {
    title: "Defensive Positioning & Saves",
    advice: "You're making fewer saves than typical for your rank. This often indicates positioning issues - either you're too far forward or arriving late to defense. Practice shadow defense and reading opponent shots earlier.",
    drills: [
      "Shadow Defense Tutorial by Virge",
      "Save Training Packs",
      "Backboard Defense Practice",
      "Defensive Positioning Workshop"
    ]
  },
  assists: {
    title: "Passing & Team Play",
    advice: "Your assist numbers suggest you might be ball-chasing or not setting up teammates effectively. Work on recognizing when to pass instead of shoot and practice infield passes and centers.",
    drills: [
      "Passing Plays Workshop",
      "Infield Pass Training",
      "Center Ball Practice",
      "Team Play Tutorial by Thanovic"
    ]
  },
  boost_usage: {
    title: "Boost Management & Efficiency",
    advice: "Your boost usage patterns need improvement. Good boost management means collecting small pads efficiently and not always going for corner boost. Stay aware of your boost level and plan rotations around boost availability.",
    drills: [
      "Small Pad Collection Routes",
      "Boost Starvation Drills",
      "Efficient Rotation Practice",
      "No-Boost Challenge Games"
    ]
  },
  time_supersonic: {
    title: "Speed & Momentum Control",
    advice: "You're not maintaining supersonic speed enough. Higher ranks spend more time at max speed. Work on powerslide cuts, wave dashing, and maintaining momentum through rotations.",
    drills: [
      "Speed Flip Tutorial by SpookLuke",
      "Wave Dash Practice",
      "Momentum Maintenance Workshop",
      "Fast Aerials Training"
    ]
  },
  avg_speed: {
    title: "Overall Game Speed",
    advice: "Your average speed is lower than your rank peers. Focus on faster rotations, better boost management, and maintaining momentum. Speed creates opportunities and prevents opponents from setting up.",
    drills: [
      "Fast Aerials Workshop",
      "Speed Challenge Custom Games",
      "Quick Rotation Drills",
      "Recovery Training"
    ]
  },
  score: {
    title: "Overall Game Impact",
    advice: "Your overall score suggests you're not impacting games as much as you could. This is often a positioning and game sense issue. Focus on being in the right place at the right time.",
    drills: [
      "Replay Analysis Session",
      "Positioning Tutorials by Virge",
      "Rotation Practice Modes",
      "Game Sense Workshop by Thanovic"
    ]
  },
  goals: {
    title: "Finishing & Offensive Pressure",
    advice: "You're scoring fewer goals than average for your rank. Work on recognizing scoring chances, improving shot power and accuracy, and following up on your shots.",
    drills: [
      "Finishing Training Packs",
      "Redirect Practice",
      "Follow-up Shot Training",
      "Offensive Positioning Workshop"
    ]
  },
  shots: {
    title: "Shot Volume & Pressure",
    advice: "You're taking fewer shots than typical for your rank. This could mean you're too passive offensively. More shots means more pressure and more chances to score.",
    drills: [
      "Shot Variety Training",
      "Quick Shot Practice",
      "Pressure Training",
      "Offensive Awareness Workshop"
    ]
  },
  time_boost_0_25: {
    title: "Low Boost Management",
    advice: "You're spending too much time with low boost. Focus on collecting small pads more efficiently and not wasting boost unnecessarily. Learn to play effectively even with low boost.",
    drills: [
      "Small Pad Collection Practice",
      "Low Boost Challenge",
      "Boost Path Awareness Training",
      "Conservative Boost Usage Workshop"
    ]
  }
};

module.exports = {
  RANK_BENCHMARKS,
  ADVICE_MAP
};
