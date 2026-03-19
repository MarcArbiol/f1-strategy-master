# 🏎 Strategy Master — F1 Race Engineer Simulator

<div align="center">

![Strategy Master Banner](https://img.shields.io/badge/F1-TELEMETRY_SIM_v2.4-e8002d?style=for-the-badge&labelColor=050608&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xOSAzSDVjLTEuMSAwLTIgLjktMiAydjE0YzAgMS4xLjkgMiAyIDJoMTRjMS4xIDAgMi0uOSAyLTJWNWMwLTEuMS0uOS0yLTItMnoiLz48L3N2Zz4=)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&labelColor=050608&logo=react)
![Vite](https://img.shields.io/badge/Vite-8.0-646cff?style=for-the-badge&labelColor=050608&logo=vite)
![License](https://img.shields.io/badge/License-MIT-00ff87?style=for-the-badge&labelColor=050608)
![Status](https://img.shields.io/badge/Status-LIVE-00ff87?style=for-the-badge&labelColor=050608)

**Step into the pitwall. Manage tire degradation, predict the perfect pit window, and outsmart the AI engineer.**

[🚀 **PLAY NOW**](https://MarcArbiol.github.io/f1-strategy-master/) · [📖 How to Play](#how-to-play) · [🛠 Tech Stack](#tech-stack) · [🚀 Run Locally](#run-locally)

---

</div>

## 🎮 What Is This?

**Strategy Master** is a browser-based F1 race engineer simulator. Instead of just watching a race, you sit on the pitwall and make the calls that win or lose championships.

You receive live telemetry data — tire degradation, lap times, fuel load — and must predict the **optimal pit stop window** before your tires fall off a cliff. Your prediction accuracy is scored against the AI engineer's optimal model, turning the "boring" middle laps of a race into a tense strategy game.

> *Inspired by real F1 strategy mechanics and the OpenF1 telemetry API.*

---

## 🖥 Live Demo

👉 **[https://MarcArbiol.github.io/f1-strategy-master/](https://MarcArbiol.github.io/f1-strategy-master/)**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 **Live Tire Degradation Chart** | Real-time SVG graph showing actual wear vs predicted model vs historical average |
| 🎯 **Pit Window Predictor** | Select your pit lap — scored against the AI engineer's optimal window |
| 📊 **Lap Time Telemetry** | Live chart of every lap time as the race progresses |
| 🏁 **Race Leaderboard** | Track your position against 4 AI drivers in real time |
| 🔧 **Compound Strategy** | Choose Soft / Medium / Hard at each stop with smart recommendations |
| 📻 **Engineer Radio Feed** | Live messages from your virtual race engineer |
| ⏱ **Simulation Speed** | Run at 1x, 2x, or 4x speed |
| 🏆 **S–D Grade Rating** | Post-race debrief with personalised improvement tips |
| 🎓 **Built-in Tutorial** | 4-step interactive how-to-play guide for new players |

---

## 🏁 How to Play

### 1. 📋 Pre-Race Setup
Choose your starting **tire compound** and **circuit**. Read the tire guide — your starting compound determines your first pit window.

| Compound | Max Life | Grip | Best For |
|---|---|---|---|
| 🔴 **SOFT** | 22 laps | 100% | Short stints, attack pace |
| 🟡 **MEDIUM** | 35 laps | 96% | Balanced strategy, flexibility |
| ⚪ **HARD** | 50 laps | 92% | Long stints, fuel-saving |

### 2. 👁 Monitor the Tires
Watch the **Tire Degradation Model** chart during the race:
- **Coloured line** = your actual tire wear right now
- **Gold dashed line** = what the model predicts next
- **Grey dashed line** = historical average from past races
- **Orange zone** = the cliff — below 65% wear accelerates rapidly

### 3. 🎯 Predict Your Pit Window
Before your tires hit the cliff, use the **Pit Window Predictor** to commit to a lap. A ⭐ marks the model's suggestion. The closer your call is to optimal, the more points you earn.

### 4. 🔧 Execute the Stop
When your lap arrives, the **BOX BOX BOX** screen appears. Choose your next compound wisely — the app shows you exactly how many laps remain and which compound is recommended.

### 5. 🏆 Score Points
- **+5 pts/lap** — tires above 75% health
- **+2 pts/lap** — tires between 60–75%
- **−5 pts/lap** — tires cliffed below 60%
- **Up to +200 pts** — pit prediction accuracy bonus

---

## 🏆 Scoring & Grades

| Grade | Score | Rating | Description |
|---|---|---|---|
| **S** | 2000+ | Race Winner 🥇 | Perfect strategy, optimal pit calls |
| **A** | 1600+ | Podium 🥈 | Strong calls, minimal timing errors |
| **B** | 1200+ | Points Finish | Good instincts, a few laps off optimal |
| **C** | 800+ | Midfield | Reactive, not proactive |
| **D** | 0+ | Back of Grid | Tire management issues, poor timing |

---

## 🛠 Tech Stack

```
Frontend    React 18 + Vite 8
Styling     Pure CSS-in-JS (no external UI library)
Charts      Hand-crafted SVG (no chart library needed)
Fonts       Orbitron · Rajdhani · Share Tech Mono (Google Fonts)
Deployment  GitHub Pages via gh-pages
```

---

## 🚀 Run Locally

**Prerequisites:** Node.js 18+ and Git installed.

```bash
# Clone the repo
git clone https://github.com/MarcArbiol/f1-strategy-master.git

# Go into the folder
cd f1-strategy-master

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production
```bash
npm run build
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

---

## 📁 Project Structure

```
f1-strategy-master/
├── src/
│   ├── App.jsx          # Main app — all game logic and UI
│   └── main.jsx         # React entry point
├── public/              # Static assets
├── index.html           # HTML shell
├── vite.config.js       # Vite config (includes base path for GitHub Pages)
├── package.json         # Dependencies and scripts
└── README.md            # You are here
```

---

## 🗺 Roadmap

- [ ] Real telemetry data via the [OpenF1 API](https://openf1.org)
- [ ] Multiplayer — race against friends' strategy calls
- [ ] Weather system — rain changes optimal compounds mid-race
- [ ] Safety car simulation — forces reactive strategy changes
- [ ] More circuits — full 2025 F1 calendar
- [ ] Mobile layout optimisation

---

## 🙏 Acknowledgements

- Inspired by the **OpenF1 API** and real Formula 1 race strategy mechanics
- Tire degradation model based on publicly available F1 telemetry data patterns
- Built with [React](https://react.dev) + [Vite](https://vitejs.dev)

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">

Made with ❤️ and way too much coffee · [Play the game →](https://MarcArbiol.github.io/f1-strategy-master/)

</div>
