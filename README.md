# Rocket League Replay Tracker & AI Coach

A full-stack analytics platform that parses Rocket League replay files and turns them into actionable performance insights. Built for and adopted by the **MSU Varsity Rocket League team**, cutting replay review time by **50%**.

🔗 **Live site:** [rocket-league-replay-tracker.app](https://d2dtgib6veh626.cloudfront.net)

<img width="1917" height="1027" alt="image" src="https://github.com/user-attachments/assets/09f910a0-404c-4f19-8dda-846b18af028f" />

---

## Overview

Reviewing Rocket League replays manually is slow — this project automates it. Upload a replay, and the platform parses it via the **Ballchasing API**, stores structured match/player data in PostgreSQL, and surfaces it through an interactive dashboard with 3D replay visualization and AI-generated coaching feedback.

## Features

- **Replay parsing** — integrates with the Ballchasing API to extract per-player and per-match statistics from `.replay` files
- **Interactive 3D replay viewer** — built with Three.js, letting players visually review positioning and rotations from any point in a match
- **AI coaching module** — powered by Groq LLM, benchmarks a player's stats against historical performance and generates personalized improvement recommendations
- **Statistical aggregation** — tracks trends across matches (boost usage, positioning, shot accuracy, etc.) rather than just single-game snapshots
- **RESTful API** — connects the Angular frontend to the backend/database for replay storage, retrieval, and aggregation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| 3D Visualization | Three.js |
| AI/LLM | Groq |
| Replay Parsing | Ballchasing API |
| Infrastructure | AWS (EC2, S3, CloudFront), Docker |

## Architecture

```
├── backend/          # Express API, Ballchasing integration, Groq AI coaching logic
├── frontend/          # Angular client, Three.js replay viewer
├── database_schema.sql
├── init.sql
├── docker-compose.yml
└── env.example
```

The app is containerized with Docker Compose for local development and deployed on AWS — EC2 for the backend, with S3 and CloudFront serving the frontend.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- A [Ballchasing API](https://ballchasing.com/) key
- A [Groq API](https://groq.com/) key

### Setup

1. Clone the repo
   ```bash
   git clone https://github.com/CNeiheisel/Rocket-League-Replay-Tracker.git
   cd Rocket-League-Replay-Tracker
   ```

2. Copy the environment file and add your API keys
   ```bash
   cp env.example .env
   ```

3. Start the app with Docker Compose
   ```bash
   docker-compose up
   ```

4. The frontend will be available at `http://localhost:<port>` and the backend API at `http://localhost:<port>`

*(Update the ports above to match your actual `docker-compose.yml` config.)*

## Roadmap

- [ ] Expand AI coaching feedback to include rotation and positioning analysis
- [ ] Team-level dashboards for tracking multiple players over a season
- [ ] Support for uploading raw `.replay` files directly (in addition to Ballchasing links)

## About

Built by [Connor Neiheisel](https://github.com/CNeiheisel) — currently in use by the **MSU Varsity Rocket League team**.
