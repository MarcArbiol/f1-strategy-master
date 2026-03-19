import { useState, useEffect, useRef, useCallback } from "react";

// ─── Fonts & Global Styles ────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&family=Share+Tech+Mono&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #050608;
      --panel:    #0a0c10;
      --border:   #1a1f2e;
      --accent:   #e8002d;
      --gold:     #ffd700;
      --teal:     #00d4ff;
      --green:    #00ff87;
      --orange:   #ff6b00;
      --muted:    #3a4055;
      --text:     #c8d0e0;
      --dim:      #5a6070;
      --font-display: 'Orbitron', monospace;
      --font-body:    'Rajdhani', sans-serif;
      --font-mono:    'Share Tech Mono', monospace;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      overflow-x: hidden;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }

    /* Scanline overlay */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
      pointer-events: none;
      z-index: 9999;
    }

    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes slideIn { from{transform:translateX(-20px);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes glow { 0%,100%{box-shadow:0 0 5px var(--accent)} 50%{box-shadow:0 0 20px var(--accent), 0 0 40px rgba(232,0,45,0.3)} }
    @keyframes fadeUp { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes ticker { from{transform:translateX(100vw)} to{transform:translateX(-100%)} }
    @keyframes scanLine { 0%{top:-5%} 100%{top:105%} }
    @keyframes countUp { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
  `}</style>
);

// ─── Data Layer ───────────────────────────────────────────────────────────────
const TEAMS = {
  "Red Bull":    { color: "#3671C6", accent: "#FFD700" },
  "Ferrari":     { color: "#E8002D", accent: "#FFFFFF" },
  "Mercedes":    { color: "#27F4D2", accent: "#FFFFFF" },
  "McLaren":     { color: "#FF8000", accent: "#000000" },
  "Aston Martin":{ color: "#358C75", accent: "#CEDC00" },
};

const TIRE_COMPOUNDS = {
  SOFT:   { color: "#e8002d", label: "S", degradRate: 0.045, maxLife: 22, grip: 1.00 },
  MEDIUM: { color: "#ffd700", label: "M", degradRate: 0.028, maxLife: 35, grip: 0.96 },
  HARD:   { color: "#c8d0e0", label: "H", degradRate: 0.018, maxLife: 50, grip: 0.92 },
};

const CIRCUITS = [
  { name: "Bahrain Grand Prix", laps: 57, fuel: 110 },
  { name: "Saudi Arabian GP",   laps: 50, fuel: 105 },
  { name: "Australian GP",      laps: 58, fuel: 108 },
  { name: "Monaco GP",          laps: 78, fuel: 78  },
];

// Generate historical degradation data for comparison
function generateHistoricalData(compound, laps) {
  const c = TIRE_COMPOUNDS[compound];
  return Array.from({ length: laps }, (_, i) => {
    const natural = 100 - i * c.degradRate * 100;
    const noise = (Math.random() - 0.5) * 3;
    return Math.max(0, natural + noise);
  });
}

// Simulate live telemetry for a lap
function generateLapTelemetry(lap, compound, tireDeg, fuelLoad) {
  const c = TIRE_COMPOUNDS[compound];
  const baseTime = 93.5;
  const tirePenalty = (100 - tireDeg) * 0.04;
  const fuelBonus = (fuelLoad / 110) * 0.8;
  const variation = (Math.random() - 0.5) * 0.4;
  return +(baseTime + tirePenalty + fuelBonus + variation).toFixed(3);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const LiveDot = ({ color = "var(--green)" }) => (
  <span style={{
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: color, animation: "pulse 1.2s infinite", marginRight: 6
  }} />
);

const TireIcon = ({ compound, size = 32 }) => {
  const c = TIRE_COMPOUNDS[compound];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.color, display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "var(--font-display)",
      fontSize: size * 0.38, fontWeight: 900, color: "#fff",
      boxShadow: `0 0 12px ${c.color}60`, flexShrink: 0,
      border: `2px solid ${c.color}`,
    }}>{c.label}</div>
  );
};

const GlassPanel = ({ children, style = {}, glow }) => (
  <div style={{
    background: "linear-gradient(135deg, rgba(10,12,16,0.95) 0%, rgba(14,17,24,0.9) 100%)",
    border: `1px solid ${glow ? glow : "var(--border)"}`,
    borderRadius: 4,
    boxShadow: glow ? `0 0 20px ${glow}30, inset 0 1px 0 ${glow}20` : "none",
    ...style,
  }}>{children}</div>
);

// Lap time chart (SVG)
const LapTimeChart = ({ laptimes, currentLap }) => {
  if (laptimes.length < 2) return (
    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
      AWAITING LAP DATA...
    </div>
  );
  const W = 500, H = 110;
  const min = Math.min(...laptimes) - 0.5;
  const max = Math.max(...laptimes) + 0.5;
  const xs = laptimes.map((_, i) => (i / (laptimes.length - 1)) * W);
  const ys = laptimes.map(t => H - ((t - min) / (max - min)) * H);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const fill = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ") + ` L${xs[xs.length - 1]},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ltGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#ltGrad)" />
      <path d={path} fill="none" stroke="var(--teal)" strokeWidth="2" />
      {laptimes.map((t, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={i === laptimes.length - 1 ? 4 : 2}
          fill={i === laptimes.length - 1 ? "var(--gold)" : "var(--teal)"} />
      ))}
    </svg>
  );
};

// Tire degradation chart (SVG)
const TireDegChart = ({ actual, predicted, historical, compound }) => {
  const c = TIRE_COMPOUNDS[compound];
  const W = 500, H = 140;
  const toY = v => H - (v / 100) * H;
  const toX = (i, len) => (i / Math.max(len - 1, 1)) * W;

  const actPath = actual.length > 1
    ? actual.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, actual.length)},${toY(v)}`).join(" ")
    : null;
  const predPath = predicted.length > 1
    ? predicted.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, predicted.length)},${toY(v)}`).join(" ")
    : null;
  const histPath = historical.length > 1
    ? historical.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, historical.length)},${toY(v)}`).join(" ")
    : null;

  // Cliff warning zone
  const cliffStart = 70;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 150 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cliffGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[25, 50, 75, 100].map(v => (
        <line key={v} x1={0} y1={toY(v)} x2={W} y2={toY(v)}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {/* Cliff zone */}
      <rect x={0} y={toY(cliffStart)} width={W} height={H - toY(cliffStart)}
        fill="url(#cliffGrad)" />
      <line x1={0} y1={toY(cliffStart)} x2={W} y2={toY(cliffStart)}
        stroke="var(--orange)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
      <text x={6} y={toY(cliffStart) - 4} fontSize={9} fill="var(--orange)" fontFamily="var(--font-mono)" opacity="0.7">CLIFF ZONE</text>

      {/* Historical avg */}
      {histPath && <path d={histPath} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5,3" />}
      {/* Predicted */}
      {predPath && <path d={predPath} fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="8,4" />}
      {/* Actual */}
      {actPath && <path d={actPath} fill="none" stroke={c.color} strokeWidth="2.5" />}
      {actual.length > 0 && (
        <circle cx={toX(actual.length - 1, actual.length)} cy={toY(actual[actual.length - 1])} r={5}
          fill={c.color} stroke="#fff" strokeWidth="1.5" />
      )}
    </svg>
  );
};

// Strategy timeline bar
const StrategyBar = ({ stints, totalLaps, userPitLap, onPitSelect }) => {
  return (
    <div style={{ position: "relative", height: 36 }}>
      <div style={{ display: "flex", height: "100%", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)" }}>
        {stints.map((s, i) => {
          const c = TIRE_COMPOUNDS[s.compound];
          const width = ((s.laps) / totalLaps) * 100;
          return (
            <div key={i} style={{
              width: `${width}%`, background: c.color + "30",
              borderRight: i < stints.length - 1 ? `2px solid ${c.color}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontSize: 11, color: c.color,
              position: "relative",
            }}>
              <TireIcon compound={s.compound} size={18} />
              <span style={{ marginLeft: 4 }}>{s.laps}L</span>
            </div>
          );
        })}
      </div>
      {/* Lap markers */}
      {userPitLap && (
        <div style={{
          position: "absolute", top: 0,
          left: `${(userPitLap / totalLaps) * 100}%`,
          height: "100%", width: 2,
          background: "var(--green)", opacity: 0.8,
          transform: "translateX(-50%)",
        }}>
          <div style={{
            position: "absolute", bottom: "100%", left: "50%",
            transform: "translateX(-50%)", whiteSpace: "nowrap",
            fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--green)",
            marginBottom: 2,
          }}>YOUR BOX</div>
        </div>
      )}
    </div>
  );
};

// Pit prediction widget
const PitPredictionWidget = ({ currentLap, totalLaps, compound, tireDeg, onPredict }) => {
  const [selectedLap, setSelectedLap] = useState(null);
  const minPit = currentLap + 1;
  const maxPit = Math.min(totalLaps - 10, currentLap + 20);
  const optimalPit = currentLap + Math.ceil((tireDeg - 65) / 1.5);

  return (
    <GlassPanel style={{ padding: 16 }} glow="var(--green)">
      <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--green)", letterSpacing: 3, marginBottom: 12 }}>
        PIT WINDOW PREDICTOR
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {Array.from({ length: maxPit - minPit + 1 }, (_, i) => minPit + i).map(lap => {
          const isOptimal = lap === optimalPit;
          const isSelected = lap === selectedLap;
          return (
            <button key={lap} onClick={() => setSelectedLap(lap)} style={{
              width: 36, height: 36, border: `1px solid ${isSelected ? "var(--green)" : isOptimal ? "var(--gold)" : "var(--border)"}`,
              background: isSelected ? "rgba(0,255,135,0.15)" : isOptimal ? "rgba(255,215,0,0.1)" : "transparent",
              color: isSelected ? "var(--green)" : isOptimal ? "var(--gold)" : "var(--dim)",
              fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer",
              borderRadius: 2, transition: "all 0.15s",
              position: "relative",
            }}>
              {lap}
              {isOptimal && !isSelected && (
                <div style={{
                  position: "absolute", top: -6, right: -6, width: 10, height: 10,
                  background: "var(--gold)", borderRadius: "50%", fontSize: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>★</div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
        ★ PREDICTED OPTIMAL: LAP {optimalPit}
      </div>
      <button
        onClick={() => selectedLap && onPredict(selectedLap)}
        disabled={!selectedLap}
        style={{
          width: "100%", padding: "10px", border: `1px solid ${selectedLap ? "var(--green)" : "var(--border)"}`,
          background: selectedLap ? "rgba(0,255,135,0.1)" : "transparent",
          color: selectedLap ? "var(--green)" : "var(--dim)",
          fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 2,
          cursor: selectedLap ? "pointer" : "not-allowed", borderRadius: 2,
          transition: "all 0.2s",
        }}
      >
        {selectedLap ? `COMMIT: BOX LAP ${selectedLap}` : "SELECT PIT LAP"}
      </button>
    </GlassPanel>
  );
};

// Score widget
const ScoreWidget = ({ score, delta, accuracy }) => (
  <GlassPanel style={{ padding: 16, textAlign: "center" }} glow="var(--gold)">
    <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--gold)", letterSpacing: 3, marginBottom: 8 }}>
      ENGINEER SCORE
    </div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 42, color: "var(--gold)", lineHeight: 1, animation: "countUp 0.5s ease" }}>
      {score}
    </div>
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
      {delta > 0 ? `+${delta}` : delta} PTS THIS STINT
    </div>
    {accuracy !== null && (
      <div style={{
        marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12,
        color: accuracy >= 80 ? "var(--green)" : accuracy >= 60 ? "var(--gold)" : "var(--accent)",
      }}>
        ACCURACY: {accuracy}%
      </div>
    )}
  </GlassPanel>
);

// Leaderboard row
const LeaderRow = ({ pos, name, gap, compound, laps }) => {
  const c = TIRE_COMPOUNDS[compound];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "6px 10px", borderBottom: "1px solid var(--border)",
      animation: "slideIn 0.3s ease",
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 11,
        color: pos === 1 ? "var(--gold)" : "var(--dim)", width: 20, textAlign: "right",
      }}>{pos}</div>
      <TireIcon compound={compound} size={20} />
      <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 }}>{name}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>L{laps}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: pos === 1 ? "var(--green)" : "var(--text)", minWidth: 60, textAlign: "right" }}>
        {pos === 1 ? "LEADER" : `+${gap}`}
      </div>
    </div>
  );
};

// Radio message feed
const RadioFeed = ({ messages }) => (
  <div style={{ height: 100, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
    {messages.slice(-6).reverse().map((m, i) => (
      <div key={i} style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: i === 0 ? "var(--green)" : "var(--dim)",
        padding: "3px 0", borderBottom: "1px solid var(--border)",
        animation: i === 0 ? "fadeUp 0.3s ease" : "none",
      }}>
        <span style={{ color: "var(--teal)" }}>[{m.lap}]</span> {m.text}
      </div>
    ))}
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function F1StrategyMaster() {
  const CIRCUIT = CIRCUITS[0];
  const TOTAL_LAPS = CIRCUIT.laps;

  const [phase, setPhase] = useState("pre"); // pre | racing | pitstop | result
  const [currentLap, setCurrentLap] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapSpeed, setLapSpeed] = useState(1200); // ms per lap

  // Driver state
  const [compound, setCompound] = useState("SOFT");
  const [tireDeg, setTireDeg] = useState(100);
  const [stintLap, setStintLap] = useState(0);
  const [fuelLoad, setFuelLoad] = useState(CIRCUIT.fuel);
  const [laptimes, setLaptimes] = useState([]);
  const [stints, setStints] = useState([]);
  const [totalStintLaps, setTotalStintLaps] = useState(0);

  // Tire deg tracking
  const [actualDegHistory, setActualDegHistory] = useState([100]);
  const [predictedDegHistory, setPredictedDegHistory] = useState([]);
  const [historicalDeg] = useState(() => generateHistoricalData("SOFT", TOTAL_LAPS));

  // Strategy
  const [userPitLap, setUserPitLap] = useState(null);
  const [aiPitLap, setAiPitLap] = useState(null);
  const [pitsMade, setPitsMade] = useState(0);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([
    { name: "VER", compound: "SOFT",   laps: 0, gap: 0 },
    { name: "LEC", compound: "MEDIUM", laps: 0, gap: 1.2 },
    { name: "NOR", compound: "SOFT",   laps: 0, gap: 2.8 },
    { name: "HAM", compound: "HARD",   laps: 0, gap: 4.1 },
    { name: "YOU", compound: "SOFT",   laps: 0, gap: 0, isUser: true },
  ]);
  const [userPos, setUserPos] = useState(5);

  // Comms
  const [radioFeed, setRadioFeed] = useState([
    { lap: 0, text: "ALL SYSTEMS GO. RACE STARTS IN 30 SECONDS." },
  ]);

  // Score
  const [score, setScore] = useState(1000);
  const [scoreDelta, setScoreDelta] = useState(0);
  const [predictionAccuracy, setPredictionAccuracy] = useState(null);

  const timerRef = useRef(null);

  const addRadio = useCallback((text, lap) => {
    setRadioFeed(prev => [...prev, { lap, text }]);
  }, []);

  // Build predicted degradation curve from current state
  const buildPredicted = useCallback((fromDeg, fromLap, cmp) => {
    const c = TIRE_COMPOUNDS[cmp];
    return Array.from({ length: 20 }, (_, i) => {
      const deg = fromDeg - i * c.degradRate * 100;
      return Math.max(0, deg);
    });
  }, []);

  // Simulate one lap
  const simLap = useCallback(() => {
    setCurrentLap(prev => {
      const lap = prev + 1;
      if (lap > TOTAL_LAPS) { setIsRunning(false); setPhase("result"); return prev; }

      setStintLap(s => s + 1);
      setFuelLoad(f => Math.max(0, f - CIRCUIT.fuel / TOTAL_LAPS));

      // Degrade tire (with cliff effect below 65%)
      setTireDeg(deg => {
        const c = TIRE_COMPOUNDS[compound];
        const cliffMultiplier = deg < 65 ? 2.2 : 1;
        const newDeg = Math.max(0, deg - c.degradRate * 100 * cliffMultiplier * (0.9 + Math.random() * 0.2));

        setActualDegHistory(h => [...h, newDeg]);
        setPredictedDegHistory(buildPredicted(newDeg, lap, compound));

        // Score per lap based on tire management
        const mgmtBonus = newDeg > 75 ? 5 : newDeg > 60 ? 2 : newDeg > 40 ? 0 : -5;
        setScore(s => s + mgmtBonus);
        setScoreDelta(mgmtBonus);

        return newDeg;
      });

      // Lap time
      setLaptimes(lt => {
        const t = generateLapTelemetry(lap, compound, tireDeg, fuelLoad);
        return [...lt, t];
      });

      // Leaderboard update
      setLeaderboard(lb => lb.map(d => ({ ...d, laps: d.laps + 1 })));

      // AI pit call (lap 18-22 for first stint)
      if (!aiPitLap && lap === 18 + Math.floor(Math.random() * 4)) {
        setAiPitLap(lap + 2);
        addRadio(`AI ENGINEER: OPTIMAL BOX WINDOW LAP ${lap + 2}`, lap);
      }

      // User pit window approaching
      if (userPitLap && lap === userPitLap - 3) {
        addRadio(`ENGINEER: 3 LAPS TO YOUR PREDICTED BOX.`, lap);
      }

      // Trigger pit stop
      if (lap === userPitLap) {
        setPhase("pitstop");
        setIsRunning(false);
        addRadio(`BOX BOX BOX. PIT STOP NOW.`, lap);
      }

      // Low tire warning
      if (tireDeg < 60 && tireDeg > 55) {
        addRadio(`WARNING: TIRE DEGRADATION CRITICAL. CONSIDER BOXING.`, lap);
      }

      return lap;
    });
  }, [compound, tireDeg, fuelLoad, userPitLap, aiPitLap, addRadio, buildPredicted]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(simLap, lapSpeed);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, simLap, lapSpeed]);

  const startRace = () => {
    setPhase("racing");
    setIsRunning(true);
    addRadio("LIGHTS OUT AND AWAY WE GO!", 1);
  };

  const executePitStop = (newCompound) => {
    const prevCompound = compound;
    setCompound(newCompound);
    setTireDeg(100);
    setStintLap(0);
    setActualDegHistory([100]);
    setPredictedDegHistory([]);
    setPitsMade(p => p + 1);
    setStints(s => [...s, { compound: prevCompound, laps: stintLap + 1 }]);

    // Score the prediction accuracy
    const accuracy = userPitLap && aiPitLap
      ? Math.max(0, 100 - Math.abs(userPitLap - aiPitLap) * 8)
      : null;
    if (accuracy !== null) {
      setPredictionAccuracy(accuracy);
      const bonus = Math.floor(accuracy * 2);
      setScore(s => s + bonus);
      addRadio(`PIT STOP COMPLETE. +${bonus} STRATEGY POINTS.`, currentLap);
    }

    setPhase("racing");
    setIsRunning(true);
    setUserPitLap(null);
    setAiPitLap(null);
  };

  const handleUserPredict = (lap) => {
    setUserPitLap(lap);
    addRadio(`YOUR CALL: BOX LAP ${lap} COMMITTED.`, currentLap);
  };

  const progress = (currentLap / TOTAL_LAPS) * 100;
  const lastLap = laptimes[laptimes.length - 1];
  const bestLap = laptimes.length ? Math.min(...laptimes) : null;
  const c = TIRE_COMPOUNDS[compound];

  // ─── PRE-RACE SCREEN ────────────────────────────────────────────────────────
  if (phase === "pre") {
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [selectedCircuit, setSelectedCircuit] = useState(0);
    const circ = CIRCUITS[selectedCircuit];

    const tutorialSteps = [
      {
        icon: "👁",
        title: "MONITOR THE TIRES",
        color: "var(--teal)",
        desc: "Watch the Tire Degradation chart in real time. The colored line is your ACTUAL wear. The gold dashed line is the MODEL PREDICTION. The grey line is the historical average from past races.",
        tip: "When your actual line drops BELOW the historical average, your tires are degrading faster than normal — time to think about pitting.",
      },
      {
        icon: "🎯",
        title: "PREDICT YOUR PIT WINDOW",
        color: "var(--green)",
        desc: "Before your tires hit the cliff (below 65% health), use the Pit Window Predictor panel to select which lap you want to pit on. A gold star marks the model's optimal suggestion.",
        tip: "Don't wait too long! Once tires cliff, lap times drop sharply and you lose positions. Pit 2–3 laps before the cliff for best results.",
      },
      {
        icon: "🔧",
        title: "EXECUTE THE PIT STOP",
        color: "var(--orange)",
        desc: "When your committed lap arrives, the BOX BOX BOX screen appears. You must choose your next tire compound. Each compound has different speed, grip, and longevity trade-offs.",
        tip: "If you're leading, fit Hards to cover more laps. If you're chasing, fit Softs for maximum attack pace.",
      },
      {
        icon: "🏆",
        title: "SCORE POINTS",
        color: "var(--gold)",
        desc: "You earn points every lap for tire management (+5 healthy, -5 cliffed) and a big bonus for how closely your pit prediction matched the AI engineer's optimal window.",
        tip: "A perfect prediction (within 1 lap of optimal) earns up to 200 bonus points. Aim for an S-rank score of 2000+.",
      },
    ];

    return (
      <>
        <GlobalStyles />
        <style>{`
          @keyframes staggerIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
          .stagger-1{animation:staggerIn 0.5s ease 0.1s both}
          .stagger-2{animation:staggerIn 0.5s ease 0.2s both}
          .stagger-3{animation:staggerIn 0.5s ease 0.3s both}
          .stagger-4{animation:staggerIn 0.5s ease 0.4s both}
          .stagger-5{animation:staggerIn 0.5s ease 0.5s both}
          .stagger-6{animation:staggerIn 0.5s ease 0.6s both}
          .hover-lift{transition:transform 0.2s,box-shadow 0.2s}
          .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.4)}
        `}</style>

        {/* Tutorial Modal */}
        {showTutorial && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              maxWidth: 520, width: "100%",
              background: "linear-gradient(135deg, #0e1118 0%, #0a0c10 100%)",
              border: "1px solid var(--border)", borderRadius: 6,
              overflow: "hidden", animation: "staggerIn 0.3s ease both",
            }}>
              {/* Modal header */}
              <div style={{
                background: `linear-gradient(90deg, ${tutorialSteps[tutorialStep].color}20, transparent)`,
                borderBottom: "1px solid var(--border)", padding: "16px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: tutorialSteps[tutorialStep].color, letterSpacing: 3 }}>
                  HOW TO PLAY — STEP {tutorialStep + 1} OF {tutorialSteps.length}
                </div>
                <button onClick={() => setShowTutorial(false)} style={{
                  background: "none", border: "1px solid var(--border)", color: "var(--dim)",
                  fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
                  padding: "4px 10px", borderRadius: 2,
                }}>✕ CLOSE</button>
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, background: "var(--border)" }}>
                <div style={{
                  height: "100%", background: tutorialSteps[tutorialStep].color,
                  width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>

              {/* Step dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "16px 0 0" }}>
                {tutorialSteps.map((_, i) => (
                  <button key={i} onClick={() => setTutorialStep(i)} style={{
                    width: i === tutorialStep ? 24 : 8, height: 8, borderRadius: 4,
                    background: i === tutorialStep ? tutorialSteps[tutorialStep].color : "var(--border)",
                    border: "none", cursor: "pointer", transition: "all 0.3s",
                  }} />
                ))}
              </div>

              {/* Content */}
              <div style={{ padding: "20px 24px 24px" }}>
                <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>
                  {tutorialSteps[tutorialStep].icon}
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 14,
                  color: tutorialSteps[tutorialStep].color, letterSpacing: 2,
                  textAlign: "center", marginBottom: 16,
                }}>
                  {tutorialSteps[tutorialStep].title}
                </div>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text)",
                  lineHeight: 1.7, marginBottom: 16, textAlign: "center",
                }}>
                  {tutorialSteps[tutorialStep].desc}
                </div>
                <div style={{
                  background: `${tutorialSteps[tutorialStep].color}10`,
                  border: `1px solid ${tutorialSteps[tutorialStep].color}40`,
                  borderRadius: 3, padding: "12px 16px",
                }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: tutorialSteps[tutorialStep].color, letterSpacing: 2, marginBottom: 6 }}>
                    💡 PRO TIP
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                    {tutorialSteps[tutorialStep].tip}
                  </div>
                </div>

                {/* Nav buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={() => setTutorialStep(s => Math.max(0, s - 1))}
                    disabled={tutorialStep === 0}
                    style={{
                      flex: 1, padding: "10px", fontFamily: "var(--font-display)", fontSize: 10,
                      letterSpacing: 2, border: "1px solid var(--border)",
                      background: "transparent", color: tutorialStep === 0 ? "var(--muted)" : "var(--text)",
                      cursor: tutorialStep === 0 ? "not-allowed" : "pointer", borderRadius: 2,
                    }}>← PREV</button>
                  {tutorialStep < tutorialSteps.length - 1 ? (
                    <button onClick={() => setTutorialStep(s => s + 1)} style={{
                      flex: 2, padding: "10px", fontFamily: "var(--font-display)", fontSize: 10,
                      letterSpacing: 2, border: `1px solid ${tutorialSteps[tutorialStep].color}`,
                      background: `${tutorialSteps[tutorialStep].color}15`,
                      color: tutorialSteps[tutorialStep].color,
                      cursor: "pointer", borderRadius: 2,
                    }}>NEXT →</button>
                  ) : (
                    <button onClick={() => setShowTutorial(false)} style={{
                      flex: 2, padding: "10px", fontFamily: "var(--font-display)", fontSize: 10,
                      letterSpacing: 2, border: "1px solid var(--green)",
                      background: "rgba(0,255,135,0.1)", color: "var(--green)",
                      cursor: "pointer", borderRadius: 2,
                    }}>GOT IT — LET'S RACE ✓</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 30% 20%, #0f1420 0%, #050608 60%)",
          overflowY: "auto",
        }}>
          {/* Decorative grid */}
          <div style={{
            position: "fixed", inset: 0, opacity: 0.025,
            backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "50px 50px", pointerEvents: "none",
          }} />
          {/* Top accent line */}
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--gold) 60%, transparent 100%)",
          }} />

          <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 60px", position: "relative", zIndex: 1 }}>

            {/* Hero */}
            <div className="stagger-1" style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, var(--accent))" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: 5 }}>F1 TELEMETRY SIM v2.4</div>
                <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, var(--accent), transparent)" }} />
              </div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(36px, 8vw, 72px)",
                fontWeight: 900, lineHeight: 1, marginBottom: 12,
                background: "linear-gradient(135deg, #ffffff 0%, #c8d0e0 50%, #e8002d 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                STRATEGY<br />MASTER
              </h1>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--dim)", letterSpacing: 4, marginBottom: 20 }}>
                RACE ENGINEER SIMULATOR
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
                Step into the pitwall. Manage tire degradation, predict the perfect pit window, and outsmart the AI engineer to lead your driver to victory.
              </div>
            </div>

            {/* How to play button + quick stats */}
            <div className="stagger-2" style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
              <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} className="hover-lift" style={{
                padding: "12px 32px", fontFamily: "var(--font-display)", fontSize: 11,
                letterSpacing: 3, border: "1px solid var(--teal)",
                background: "rgba(0,212,255,0.08)", color: "var(--teal)",
                cursor: "pointer", borderRadius: 3, display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>📖</span> HOW TO PLAY
              </button>
            </div>

            {/* Quick reference cards */}
            <div className="stagger-3" style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--dim)", letterSpacing: 4, textAlign: "center", marginBottom: 16 }}>
                GAME OVERVIEW
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  { icon: "📊", color: "var(--teal)",   title: "MONITOR",  desc: "Watch live tire wear against the historical average and your predicted curve in real time." },
                  { icon: "🎯", color: "var(--green)",  title: "PREDICT",  desc: "Choose the lap you want to pit on before the tires reach the critical cliff zone." },
                  { icon: "⚡", color: "var(--orange)", title: "REACT",    desc: "Select the right compound after the stop — speed vs. durability trade-off matters." },
                  { icon: "🏆", color: "var(--gold)",   title: "SCORE",    desc: "Earn points for tire management and prediction accuracy. Beat the AI engineer rating." },
                ].map(({ icon, color, title, desc }) => (
                  <div key={title} className="hover-lift" style={{
                    background: "linear-gradient(135deg, rgba(10,12,16,0.9), rgba(14,17,24,0.8))",
                    border: `1px solid ${color}30`, borderRadius: 4, padding: 16,
                    borderTop: `2px solid ${color}`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color, letterSpacing: 2, marginBottom: 8 }}>{title}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tire compound guide */}
            <div className="stagger-4" style={{ marginBottom: 40 }}>
              <GlassPanel style={{ padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--dim)", letterSpacing: 4, marginBottom: 16 }}>
                  TIRE COMPOUND GUIDE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {Object.entries(TIRE_COMPOUNDS).map(([name, data]) => (
                    <div key={name} style={{
                      background: `${data.color}08`, border: `1px solid ${data.color}40`,
                      borderRadius: 3, padding: "14px 12px", textAlign: "center",
                    }}>
                      <TireIcon compound={name} size={36} />
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: data.color, letterSpacing: 2, margin: "10px 0 6px" }}>{name}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {[
                          ["MAX LIFE", `${data.maxLife} laps`],
                          ["GRIP",     `${(data.grip * 100).toFixed(0)}%`],
                          ["WEAR",     name === "SOFT" ? "HIGH" : name === "MEDIUM" ? "MEDIUM" : "LOW"],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                            <span style={{ color: "var(--dim)" }}>{k}</span>
                            <span style={{ color: data.color }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 10, fontFamily: "var(--font-body)", fontSize: 11,
                        color: "var(--dim)", lineHeight: 1.5,
                      }}>
                        {name === "SOFT" ? "Fastest but wears quickly. Best for short stints or qualifying pace." :
                         name === "MEDIUM" ? "Balanced choice. Good for middle stints and flexible strategy." :
                         "Slowest but lasts longest. Ideal for long stints and fuel-saving."}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>

            {/* Circuit selector + setup */}
            <div className="stagger-5" style={{ marginBottom: 32 }}>
              <GlassPanel style={{ padding: 20 }} glow="var(--gold)">
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--gold)", letterSpacing: 4, marginBottom: 16 }}>
                  RACE SETUP
                </div>

                {/* Circuit selector */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: 2, marginBottom: 10 }}>SELECT CIRCUIT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {CIRCUITS.map((c, i) => (
                      <button key={i} onClick={() => setSelectedCircuit(i)} style={{
                        padding: "10px 14px", border: `1px solid ${selectedCircuit === i ? "var(--gold)" : "var(--border)"}`,
                        background: selectedCircuit === i ? "rgba(255,215,0,0.08)" : "transparent",
                        color: selectedCircuit === i ? "var(--gold)" : "var(--dim)",
                        fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", borderRadius: 3, textAlign: "left",
                        transition: "all 0.2s",
                      }}>
                        <div>{c.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                          {c.laps} laps · {c.fuel}kg fuel
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Circuit info bar */}
                <div style={{
                  display: "flex", gap: 0, marginBottom: 24,
                  border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden",
                }}>
                  {[
                    ["CIRCUIT", circ.name],
                    ["LAPS",    circ.laps],
                    ["FUEL",    `${circ.fuel}kg`],
                    ["STINTS",  "1–3"],
                    ["DIFF",    selectedCircuit === 3 ? "HARD" : selectedCircuit === 0 ? "MEDIUM" : "EASY"],
                  ].map(([k, v], i, arr) => (
                    <div key={k} style={{
                      flex: 1, padding: "10px 8px", textAlign: "center",
                      borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Starting compound */}
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", letterSpacing: 2, marginBottom: 10 }}>
                    STARTING COMPOUND
                    <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 9 }}>— affects early strategy window</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {Object.entries(TIRE_COMPOUNDS).map(([cmp, data]) => (
                      <button key={cmp} onClick={() => setCompound(cmp)} style={{
                        flex: 1, padding: "14px 8px",
                        border: `2px solid ${compound === cmp ? data.color : "var(--border)"}`,
                        background: compound === cmp ? `${data.color}15` : "transparent",
                        color: compound === cmp ? data.color : "var(--dim)",
                        fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: 1,
                        cursor: "pointer", borderRadius: 3, transition: "all 0.2s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}>
                        <TireIcon compound={cmp} size={28} />
                        <div>{cmp}</div>
                        <div style={{ fontSize: 8, color: "var(--dim)", fontFamily: "var(--font-mono)" }}>
                          {data.maxLife}L MAX
                        </div>
                        {compound === cmp && (
                          <div style={{ fontSize: 8, color: data.color, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
                            SELECTED ✓
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Scoring guide */}
            <div className="stagger-5" style={{ marginBottom: 32 }}>
              <GlassPanel style={{ padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--dim)", letterSpacing: 4, marginBottom: 14 }}>
                  SCORING SYSTEM
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  {[
                    { grade: "S", min: 2000, color: "var(--gold)",   label: "RACE WINNER",    desc: "Perfect strategy, optimal pits" },
                    { grade: "A", min: 1600, color: "var(--green)",  label: "PODIUM",         desc: "Strong calls, minimal mistakes" },
                    { grade: "B", min: 1200, color: "var(--teal)",   label: "POINTS FINISH",  desc: "Decent strategy, some errors" },
                    { grade: "C", min: 800,  color: "var(--orange)", label: "MIDFIELD",       desc: "Reactive, not proactive" },
                    { grade: "D", min: 0,    color: "var(--accent)", label: "BACK OF GRID",   desc: "Tire management issues" },
                  ].map(({ grade, min, color, label, desc }) => (
                    <div key={grade} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", border: `1px solid ${color}30`,
                      borderRadius: 3, background: `${color}05`,
                    }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color, lineHeight: 1, minWidth: 28 }}>{grade}</div>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color, letterSpacing: 1 }}>{label}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)" }}>{min}+ pts</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>

            {/* CTA */}
            <div className="stagger-6" style={{ display: "flex", gap: 12, flexDirection: "column" }}>
              <button onClick={startRace} style={{
                width: "100%", padding: "20px", fontFamily: "var(--font-display)",
                fontSize: 18, letterSpacing: 5, color: "#fff",
                background: "linear-gradient(135deg, var(--accent) 0%, #c8001f 100%)",
                border: "none", borderRadius: 3, cursor: "pointer",
                boxShadow: "0 0 40px rgba(232,0,45,0.35), 0 4px 20px rgba(0,0,0,0.5)",
                animation: "glow 2.5s infinite",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
              }}>
                <span>LIGHTS OUT</span>
                <span style={{ fontSize: 22 }}>🏎</span>
                <span style={{ fontSize: 13, opacity: 0.7, letterSpacing: 2 }}>AND AWAY WE GO</span>
              </button>
              <button onClick={() => { setShowTutorial(true); setTutorialStep(0); }} style={{
                width: "100%", padding: "12px", fontFamily: "var(--font-display)",
                fontSize: 11, letterSpacing: 3, color: "var(--dim)",
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 3, cursor: "pointer",
              }}>
                FIRST TIME? READ THE TUTORIAL FIRST →
              </button>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ─── PIT STOP SCREEN ────────────────────────────────────────────────────────
  if (phase === "pitstop") {
    const lapsRemaining = TOTAL_LAPS - currentLap;
    const getRecommendation = (cmp) => {
      if (cmp === "SOFT"   && lapsRemaining <= 20) return { tag: "RECOMMENDED", reason: "Perfect for remaining laps" };
      if (cmp === "MEDIUM" && lapsRemaining <= 35 && lapsRemaining > 20) return { tag: "RECOMMENDED", reason: "Ideal range for remaining distance" };
      if (cmp === "HARD"   && lapsRemaining > 35)  return { tag: "RECOMMENDED", reason: "Only option for long remaining stint" };
      if (cmp === "SOFT"   && lapsRemaining > 20)  return { tag: "RISKY", reason: "May not last to the end" };
      if (cmp === "HARD"   && lapsRemaining <= 20) return { tag: "SLOW", reason: "Unnecessary durability, loses time" };
      return { tag: null, reason: null };
    };

    return (
      <>
        <GlobalStyles />
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "radial-gradient(ellipse at center, #150800 0%, #050608 70%)",
          padding: 24,
        }}>
          {/* Flashing header */}
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(28px, 7vw, 56px)",
            color: "var(--orange)", textAlign: "center", marginBottom: 4,
            animation: "glow 0.6s infinite",
          }}>
            BOX BOX BOX
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--dim)", marginBottom: 6 }}>
            LAP {currentLap} PIT STOP — SELECT NEW COMPOUND
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--teal)", marginBottom: 32 }}>
            {lapsRemaining} LAPS REMAINING IN THE RACE
          </div>

          {/* Compound cards */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 580, marginBottom: 28 }}>
            {Object.entries(TIRE_COMPOUNDS).map(([cmp, tc]) => {
              const rec = getRecommendation(cmp);
              const isCurrent = cmp === compound && pitsMade === 0;
              return (
                <button key={cmp} onClick={() => !isCurrent && executePitStop(cmp)}
                  disabled={isCurrent}
                  style={{
                    padding: "20px 18px", border: `2px solid ${rec.tag === "RECOMMENDED" ? tc.color : isCurrent ? "var(--muted)" : tc.color + "60"}`,
                    background: rec.tag === "RECOMMENDED" ? `${tc.color}18` : isCurrent ? "rgba(255,255,255,0.02)" : `${tc.color}08`,
                    color: isCurrent ? "var(--muted)" : tc.color,
                    fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2,
                    cursor: isCurrent ? "not-allowed" : "pointer", borderRadius: 4,
                    transition: "all 0.2s", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 8, minWidth: 140,
                    boxShadow: rec.tag === "RECOMMENDED" ? `0 0 20px ${tc.color}30` : "none",
                    position: "relative",
                  }}>
                  {/* Recommendation badge */}
                  {rec.tag && !isCurrent && (
                    <div style={{
                      position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                      background: rec.tag === "RECOMMENDED" ? tc.color : rec.tag === "RISKY" ? "var(--orange)" : "var(--muted)",
                      color: "#000", fontFamily: "var(--font-display)", fontSize: 8,
                      letterSpacing: 1, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap",
                    }}>{rec.tag}</div>
                  )}
                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                      background: "var(--muted)", color: "#fff", fontFamily: "var(--font-display)",
                      fontSize: 8, letterSpacing: 1, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap",
                    }}>CURRENT</div>
                  )}
                  <TireIcon compound={cmp} size={44} />
                  <div style={{ fontSize: 13 }}>{cmp}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                    {[
                      ["LASTS",   `${tc.maxLife} laps`],
                      ["GRIP",    `${(tc.grip * 100).toFixed(0)}%`],
                      ["WEAR",    cmp === "SOFT" ? "HIGH" : cmp === "MEDIUM" ? "MED" : "LOW"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9 }}>
                        <span style={{ color: isCurrent ? "var(--muted)" : "var(--dim)" }}>{k}</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                  {rec.reason && !isCurrent && (
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--dim)", textAlign: "center", lineHeight: 1.4 }}>
                      {rec.reason}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Strategy tip */}
          <div style={{
            maxWidth: 480, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 3, padding: "12px 18px", textAlign: "center",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--teal)", letterSpacing: 2, marginBottom: 6 }}>
              💡 ENGINEER ADVICE
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
              {lapsRemaining <= 20
                ? "Short stint remaining — Softs will give you the fastest pace to the flag without cliff risk."
                : lapsRemaining <= 35
                ? "Medium distance left — Mediums offer the best balance. Softs are risky unless you're chasing."
                : "Long stint ahead — Hards are your only safe option. Softs or Mediums will force another stop."}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (phase === "result") {
    const grade = score >= 2000 ? "S" : score >= 1600 ? "A" : score >= 1200 ? "B" : score >= 800 ? "C" : "D";
    const gradeColor = { S: "var(--gold)", A: "var(--green)", B: "var(--teal)", C: "var(--orange)", D: "var(--accent)" }[grade];
    const gradeFeedback = {
      S: { title: "FLAWLESS STRATEGY", desc: "You called every pit window perfectly and managed the tires like a true race engineer. Mercedes would hire you." },
      A: { title: "STRONG PERFORMANCE", desc: "Excellent tire management with only minor timing errors. You kept your driver in contention throughout." },
      B: { title: "SOLID STRATEGY", desc: "Good instincts but a few laps off optimal on the pit calls. Better degradation reading needed." },
      C: { title: "REACTIVE ENGINEER", desc: "You reacted to problems instead of predicting them. Study the degradation curves more carefully next time." },
      D: { title: "BACK TO THE SIMULATOR", desc: "Tires were cliffed, pit timing was poor. Review the compound guide and practice reading the deg chart." },
    }[grade];

    return (
      <>
        <GlobalStyles />
        <style>{`@keyframes gradeReveal { 0%{opacity:0;transform:scale(0.5) rotate(-10deg)} 70%{transform:scale(1.1) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }`}</style>
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 24,
          background: `radial-gradient(ellipse at center, ${gradeColor}08 0%, #050608 60%)`,
        }}>
          <div style={{ maxWidth: 500, width: "100%" }}>

            {/* Grade reveal */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--dim)", letterSpacing: 4, marginBottom: 16 }}>
                RACE COMPLETE — {CIRCUIT.name.toUpperCase()}
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 110, lineHeight: 1, color: gradeColor,
                textShadow: `0 0 60px ${gradeColor}50`,
                animation: "gradeReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
              }}>
                {grade}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: gradeColor, letterSpacing: 3, marginBottom: 8 }}>
                {gradeFeedback.title}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--dim)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
                {gradeFeedback.desc}
              </div>
            </div>

            {/* Stats breakdown */}
            <GlassPanel style={{ padding: 0, marginBottom: 16, overflow: "hidden" }} glow={gradeColor}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: `${gradeColor}08` }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: gradeColor, letterSpacing: 3 }}>RACE DEBRIEF</div>
              </div>
              {[
                ["FINAL SCORE",       score,                                    gradeColor],
                ["TOTAL LAPS",        TOTAL_LAPS,                               "var(--text)"],
                ["PIT STOPS MADE",    pitsMade,                                 "var(--text)"],
                ["BEST LAP TIME",     bestLap ? `${bestLap.toFixed(3)}s` : "—", "var(--teal)"],
                ["PREDICTION ACC.",   predictionAccuracy ? `${predictionAccuracy}%` : "N/A", predictionAccuracy >= 80 ? "var(--green)" : predictionAccuracy >= 60 ? "var(--gold)" : "var(--accent)"],
                ["STARTING COMPOUND", compound,                                 TIRE_COMPOUNDS[compound].color],
              ].map(([k, v, color]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 16px", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color }}>{v}</div>
                </div>
              ))}
            </GlassPanel>

            {/* What to improve */}
            {grade !== "S" && (
              <GlassPanel style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--teal)", letterSpacing: 3, marginBottom: 12 }}>
                  HOW TO IMPROVE
                </div>
                {[
                  predictionAccuracy < 80  && "📍 Predict your pit window earlier — aim to commit 10+ laps before the cliff",
                  pitsMade === 0           && "🔧 You never pitted! A 1-stop strategy is optimal on most circuits",
                  score < 1200             && "📊 Watch the degradation chart closely — pit when actual wear crosses below historical average",
                  predictionAccuracy > 80  && score < 1600 && "⏱ Good prediction but focus on tire management between stops for more lap points",
                ].filter(Boolean).map((tip, i) => (
                  <div key={i} style={{
                    fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)",
                    padding: "8px 0", borderBottom: "1px solid var(--border)", lineHeight: 1.5,
                  }}>{tip}</div>
                ))}
              </GlassPanel>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => window.location.reload()} style={{
                flex: 2, padding: "16px", fontFamily: "var(--font-display)", fontSize: 13,
                letterSpacing: 3, color: "#fff",
                background: "linear-gradient(135deg, var(--accent), #c8001f)",
                border: "none", borderRadius: 3, cursor: "pointer",
                boxShadow: "0 0 20px rgba(232,0,45,0.3)",
              }}>
                🏎 NEW RACE
              </button>
              <button onClick={() => window.location.reload()} style={{
                flex: 1, padding: "16px", fontFamily: "var(--font-display)", fontSize: 10,
                letterSpacing: 2, color: "var(--dim)",
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 3, cursor: "pointer",
              }}>
                TUTORIAL
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── MAIN RACE HUD ──────────────────────────────────────────────────────────
  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          background: "var(--panel)", borderBottom: "1px solid var(--border)",
          padding: "0 16px", display: "flex", alignItems: "center", gap: 16,
          height: 48, flexShrink: 0, position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--accent)", fontWeight: 900 }}>
            STRATEGY MASTER
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <LiveDot />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>LIVE</div>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: `linear-gradient(90deg, var(--accent), var(--gold))`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text)", whiteSpace: "nowrap" }}>
              LAP <span style={{ color: "var(--gold)" }}>{currentLap}</span> / {TOTAL_LAPS}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>SPEED</div>
            {[2000, 1200, 600].map(s => (
              <button key={s} onClick={() => setLapSpeed(s)} style={{
                padding: "3px 8px", fontFamily: "var(--font-mono)", fontSize: 10,
                border: `1px solid ${lapSpeed === s ? "var(--teal)" : "var(--border)"}`,
                background: lapSpeed === s ? "rgba(0,212,255,0.1)" : "transparent",
                color: lapSpeed === s ? "var(--teal)" : "var(--dim)",
                cursor: "pointer", borderRadius: 2,
              }}>
                {s === 2000 ? "1x" : s === 1200 ? "2x" : "4x"}
              </button>
            ))}
            <button onClick={() => setIsRunning(r => !r)} style={{
              padding: "5px 14px", fontFamily: "var(--font-display)", fontSize: 10,
              letterSpacing: 2, border: `1px solid ${isRunning ? "var(--accent)" : "var(--green)"}`,
              background: isRunning ? "rgba(232,0,45,0.1)" : "rgba(0,255,135,0.1)",
              color: isRunning ? "var(--accent)" : "var(--green)",
              cursor: "pointer", borderRadius: 2,
            }}>
              {isRunning ? "PAUSE" : "RESUME"}
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: "280px 1fr 260px",
          gridTemplateRows: "auto",
          gap: 1, padding: 1,
          background: "var(--border)",
        }}>

          {/* LEFT COLUMN */}
          <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", gap: 1 }}>

            {/* Driver card */}
            <GlassPanel style={{ padding: 16 }} glow={c.color}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--dim)", letterSpacing: 3, marginBottom: 12 }}>
                YOUR CAR
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <TireIcon compound={compound} size={44} />
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text)" }}>{compound}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>STINT LAP {stintLap}</div>
                </div>
              </div>

              {/* Tire deg meter */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>TIRE DEG</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: tireDeg > 70 ? "var(--green)" : tireDeg > 50 ? "var(--gold)" : "var(--accent)" }}>
                    {tireDeg.toFixed(1)}%
                  </div>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${tireDeg}%`,
                    background: tireDeg > 70 ? "var(--green)" : tireDeg > 50 ? "var(--gold)" : "var(--accent)",
                    transition: "width 0.5s ease",
                    borderRadius: 4,
                  }} />
                </div>
              </div>

              {/* Fuel */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>FUEL LOAD</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--teal)" }}>
                    {fuelLoad.toFixed(1)}kg
                  </div>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${(fuelLoad / CIRCUIT.fuel) * 100}%`,
                    background: "var(--teal)", transition: "width 0.5s ease",
                  }} />
                </div>
              </div>

              {/* Live lap stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {[
                  ["LAST LAP", lastLap ? `${lastLap.toFixed(3)}` : "—"],
                  ["BEST LAP", bestLap ? `${bestLap.toFixed(3)}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--panel)", padding: 8, borderRadius: 3, border: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            {/* Score */}
            <div style={{ padding: 1 }}>
              <ScoreWidget score={score} delta={scoreDelta} accuracy={predictionAccuracy} />
            </div>

            {/* Stint strategy bar */}
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--dim)", letterSpacing: 3, marginBottom: 10 }}>
                STINT PLAN
              </div>
              <StrategyBar
                stints={[...stints, { compound, laps: stintLap }]}
                totalLaps={TOTAL_LAPS}
                userPitLap={userPitLap}
              />
              {aiPitLap && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", marginTop: 8 }}>
                  AI TARGET: LAP {aiPitLap}
                </div>
              )}
              {userPitLap && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", marginTop: 4 }}>
                  YOUR CALL: LAP {userPitLap}
                </div>
              )}
            </GlassPanel>

          </div>

          {/* CENTER COLUMN */}
          <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", gap: 1 }}>

            {/* Tire deg chart */}
            <GlassPanel style={{ padding: 16, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text)", letterSpacing: 3 }}>
                  TIRE DEGRADATION MODEL
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 9, fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: c.color }}>■ ACTUAL</span>
                  <span style={{ color: "var(--gold)" }}>■ PREDICTED</span>
                  <span style={{ color: "var(--muted)" }}>■ HISTORICAL AVG</span>
                </div>
              </div>
              <TireDegChart
                actual={actualDegHistory}
                predicted={predictedDegHistory}
                historical={historicalDeg.slice(0, currentLap + 10)}
                compound={compound}
              />
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", marginTop: 4,
              }}>
                <span>LAP 0</span>
                <span>LAP {TOTAL_LAPS}</span>
              </div>
            </GlassPanel>

            {/* Lap time chart */}
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text)", letterSpacing: 3, marginBottom: 8 }}>
                LAP TIME TELEMETRY
              </div>
              <LapTimeChart laptimes={laptimes} currentLap={currentLap} />
            </GlassPanel>

            {/* Pit predictor */}
            {!userPitLap && currentLap > 5 && (
              <PitPredictionWidget
                currentLap={currentLap}
                totalLaps={TOTAL_LAPS}
                compound={compound}
                tireDeg={tireDeg}
                onPredict={handleUserPredict}
              />
            )}

            {userPitLap && (
              <GlassPanel style={{ padding: 14 }} glow="var(--green)">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <LiveDot color="var(--green)" />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>
                    PIT WINDOW COMMITTED: LAP {userPitLap}
                  </div>
                  {aiPitLap && (
                    <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)" }}>
                      AI: LAP {aiPitLap} | DELTA: {userPitLap - aiPitLap > 0 ? `+${userPitLap - aiPitLap}` : userPitLap - aiPitLap}
                    </div>
                  )}
                </div>
              </GlassPanel>
            )}

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", gap: 1 }}>

            {/* Leaderboard */}
            <GlassPanel style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <LiveDot />
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text)", letterSpacing: 3 }}>
                  RACE ORDER
                </div>
              </div>
              {leaderboard.map((d, i) => (
                <LeaderRow
                  key={d.name}
                  pos={i + 1}
                  name={d.name}
                  gap={d.gap > 0 ? d.gap.toFixed(1) + "s" : "0.0s"}
                  compound={d.isUser ? compound : d.compound}
                  laps={d.laps}
                />
              ))}
            </GlassPanel>

            {/* Tire compound comparison */}
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--dim)", letterSpacing: 3, marginBottom: 12 }}>
                COMPOUND DATA
              </div>
              {Object.entries(TIRE_COMPOUNDS).map(([name, data]) => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  opacity: name === compound ? 1 : 0.5,
                }}>
                  <TireIcon compound={name} size={26} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: data.color }}>{name}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>
                        {data.maxLife}L MAX
                      </div>
                    </div>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
                      <div style={{
                        height: "100%",
                        width: `${(1 - data.degradRate / 0.05) * 100}%`,
                        background: data.color,
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </GlassPanel>

            {/* Radio feed */}
            <GlassPanel style={{ padding: 16, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--dim)", letterSpacing: 3 }}>
                  ENGINEER COMMS
                </div>
                <LiveDot color="var(--teal)" />
              </div>
              <RadioFeed messages={radioFeed} />
            </GlassPanel>

          </div>
        </div>
      </div>
    </>
  );
}
