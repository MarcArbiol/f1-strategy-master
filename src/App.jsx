import { useState, useEffect, useRef, useCallback } from "react";

// ─── Global Styles ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&family=Share+Tech+Mono&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:#050608; --panel:#0a0c10; --border:#1a1f2e;
      --accent:#e8002d; --gold:#ffd700; --teal:#00d4ff;
      --green:#00ff87; --orange:#ff6b00; --muted:#3a4055;
      --text:#c8d0e0; --dim:#5a6070;
      --font-display:'Orbitron',monospace;
      --font-body:'Rajdhani',sans-serif;
      --font-mono:'Share Tech Mono',monospace;
    }
    body { background:var(--bg); color:var(--text); font-family:var(--font-body); overflow-x:hidden; }
    ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:var(--bg)} ::-webkit-scrollbar-thumb{background:var(--accent);border-radius:2px}
    body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);pointer-events:none;z-index:9999}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes slideIn{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes glow{0%,100%{box-shadow:0 0 5px var(--accent)}50%{box-shadow:0 0 20px var(--accent),0 0 40px rgba(232,0,45,0.3)}}
    @keyframes fadeUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes countUp{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
    @keyframes staggerIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes gradeReveal{0%{opacity:0;transform:scale(0.5) rotate(-10deg)}70%{transform:scale(1.1) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
    .s1{animation:staggerIn 0.5s ease 0.1s both}
    .s2{animation:staggerIn 0.5s ease 0.2s both}
    .s3{animation:staggerIn 0.5s ease 0.3s both}
    .s4{animation:staggerIn 0.5s ease 0.4s both}
    .s5{animation:staggerIn 0.5s ease 0.5s both}
    .s6{animation:staggerIn 0.5s ease 0.6s both}
    .hlift{transition:transform 0.2s,box-shadow 0.2s}
    .hlift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.4)}
  `}</style>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const TIRE_COMPOUNDS = {
  SOFT:   { color:"#e8002d", label:"S", degradRate:0.045, maxLife:22, grip:1.00 },
  MEDIUM: { color:"#ffd700", label:"M", degradRate:0.028, maxLife:35, grip:0.96 },
  HARD:   { color:"#c8d0e0", label:"H", degradRate:0.018, maxLife:50, grip:0.92 },
};
const CIRCUITS = [
  { name:"Bahrain Grand Prix", laps:57, fuel:110, diff:"MEDIUM" },
  { name:"Saudi Arabian GP",   laps:50, fuel:105, diff:"EASY"   },
  { name:"Australian GP",      laps:58, fuel:108, diff:"EASY"   },
  { name:"Monaco GP",          laps:78, fuel:78,  diff:"HARD"   },
];
function generateHistoricalData(compound, laps) {
  const c = TIRE_COMPOUNDS[compound];
  return Array.from({ length: laps }, (_, i) => Math.max(0, 100 - i * c.degradRate * 100 + (Math.random()-0.5)*3));
}
function generateLapTelemetry(compound, tireDeg, fuelLoad) {
  const tirePenalty = (100 - tireDeg) * 0.04;
  const fuelBonus = (fuelLoad / 110) * 0.8;
  return +(93.5 + tirePenalty + fuelBonus + (Math.random()-0.5)*0.4).toFixed(3);
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
const LiveDot = ({ color="var(--green)" }) => (
  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, animation:"pulse 1.2s infinite", marginRight:6 }} />
);
const TireIcon = ({ compound, size=32 }) => {
  const c = TIRE_COMPOUNDS[compound];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:c.color, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontSize:size*0.38, fontWeight:900, color:"#fff", boxShadow:`0 0 12px ${c.color}60`, flexShrink:0, border:`2px solid ${c.color}` }}>
      {c.label}
    </div>
  );
};
const GlassPanel = ({ children, style={}, glow }) => (
  <div style={{ background:"linear-gradient(135deg,rgba(10,12,16,0.95) 0%,rgba(14,17,24,0.9) 100%)", border:`1px solid ${glow||"var(--border)"}`, borderRadius:4, boxShadow:glow?`0 0 20px ${glow}30,inset 0 1px 0 ${glow}20`:"none", ...style }}>
    {children}
  </div>
);

// ─── PRE-RACE SCREEN ──────────────────────────────────────────────────────────
function PreRaceScreen({ onStart }) {
  const [compound, setCompound]               = useState("SOFT");
  const [selectedCircuit, setSelectedCircuit] = useState(0);
  const [showTutorial, setShowTutorial]       = useState(false);
  const [tutorialStep, setTutorialStep]       = useState(0);

  const circ = CIRCUITS[selectedCircuit];

  const TUTORIAL = [
    { icon:"👁", color:"var(--teal)",   title:"MONITOR THE TIRES",
      desc:"Watch the Tire Degradation chart in real time. The coloured line is your ACTUAL wear. The gold dashed line is the MODEL PREDICTION. The grey line is the historical average.",
      tip:"When your line drops BELOW the historical average, your tires are degrading faster than normal — start thinking about pitting." },
    { icon:"🎯", color:"var(--green)",  title:"PREDICT YOUR PIT WINDOW",
      desc:"Before your tires hit the cliff (below 65% health), use the Pit Window Predictor panel to commit to a lap. A gold star marks the model's suggestion.",
      tip:"Don't wait too long! Once tires cliff, lap times drop sharply. Pit 2–3 laps before the cliff for best results." },
    { icon:"🔧", color:"var(--orange)", title:"EXECUTE THE PIT STOP",
      desc:"When your committed lap arrives, the BOX BOX BOX screen appears. Choose your next tire compound. Each has different speed, grip, and longevity trade-offs.",
      tip:"If you're leading, fit Hards to cover more laps. If you're chasing, fit Softs for maximum attack pace." },
    { icon:"🏆", color:"var(--gold)",   title:"SCORE POINTS",
      desc:"You earn points every lap for tire management and a big bonus for how closely your pit prediction matched the AI engineer's optimal window.",
      tip:"A perfect prediction (within 1 lap of optimal) earns up to 200 bonus points. Aim for an S-rank score of 2000+." },
  ];

  return (
    <>
      <GlobalStyles />
      {showTutorial && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ maxWidth:520, width:"100%", background:"linear-gradient(135deg,#0e1118,#0a0c10)", border:"1px solid var(--border)", borderRadius:6, overflow:"hidden", animation:"staggerIn 0.3s ease both" }}>
            <div style={{ background:`linear-gradient(90deg,${TUTORIAL[tutorialStep].color}20,transparent)`, borderBottom:"1px solid var(--border)", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:TUTORIAL[tutorialStep].color, letterSpacing:3 }}>HOW TO PLAY — STEP {tutorialStep+1} OF {TUTORIAL.length}</div>
              <button onClick={()=>setShowTutorial(false)} style={{ background:"none", border:"1px solid var(--border)", color:"var(--dim)", fontFamily:"var(--font-mono)", fontSize:11, cursor:"pointer", padding:"4px 10px", borderRadius:2 }}>✕ CLOSE</button>
            </div>
            <div style={{ height:3, background:"var(--border)" }}>
              <div style={{ height:"100%", background:TUTORIAL[tutorialStep].color, width:`${((tutorialStep+1)/TUTORIAL.length)*100}%`, transition:"width 0.4s ease" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:8, padding:"16px 0 0" }}>
              {TUTORIAL.map((_,i)=>(
                <button key={i} onClick={()=>setTutorialStep(i)} style={{ width:i===tutorialStep?24:8, height:8, borderRadius:4, background:i===tutorialStep?TUTORIAL[tutorialStep].color:"var(--border)", border:"none", cursor:"pointer", transition:"all 0.3s" }} />
              ))}
            </div>
            <div style={{ padding:"20px 24px 24px" }}>
              <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>{TUTORIAL[tutorialStep].icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:TUTORIAL[tutorialStep].color, letterSpacing:2, textAlign:"center", marginBottom:16 }}>{TUTORIAL[tutorialStep].title}</div>
              <div style={{ fontFamily:"var(--font-body)", fontSize:15, color:"var(--text)", lineHeight:1.7, marginBottom:16, textAlign:"center" }}>{TUTORIAL[tutorialStep].desc}</div>
              <div style={{ background:`${TUTORIAL[tutorialStep].color}10`, border:`1px solid ${TUTORIAL[tutorialStep].color}40`, borderRadius:3, padding:"12px 16px" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:TUTORIAL[tutorialStep].color, letterSpacing:2, marginBottom:6 }}>💡 PRO TIP</div>
                <div style={{ fontFamily:"var(--font-body)", fontSize:13, color:"var(--text)", lineHeight:1.6 }}>{TUTORIAL[tutorialStep].tip}</div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button onClick={()=>setTutorialStep(s=>Math.max(0,s-1))} disabled={tutorialStep===0} style={{ flex:1, padding:"10px", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:2, border:"1px solid var(--border)", background:"transparent", color:tutorialStep===0?"var(--muted)":"var(--text)", cursor:tutorialStep===0?"not-allowed":"pointer", borderRadius:2 }}>← PREV</button>
                {tutorialStep < TUTORIAL.length-1
                  ? <button onClick={()=>setTutorialStep(s=>s+1)} style={{ flex:2, padding:"10px", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:2, border:`1px solid ${TUTORIAL[tutorialStep].color}`, background:`${TUTORIAL[tutorialStep].color}15`, color:TUTORIAL[tutorialStep].color, cursor:"pointer", borderRadius:2 }}>NEXT →</button>
                  : <button onClick={()=>setShowTutorial(false)} style={{ flex:2, padding:"10px", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:2, border:"1px solid var(--green)", background:"rgba(0,255,135,0.1)", color:"var(--green)", cursor:"pointer", borderRadius:2 }}>GOT IT — LET'S RACE ✓</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 30% 20%,#0f1420 0%,#050608 60%)", overflowY:"auto" }}>
        <div style={{ position:"fixed", inset:0, opacity:0.025, backgroundImage:"linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)", backgroundSize:"50px 50px", pointerEvents:"none" }} />
        <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,transparent 0%,var(--accent) 40%,var(--gold) 60%,transparent 100%)" }} />

        <div style={{ maxWidth:900, margin:"0 auto", padding:"48px 24px 60px", position:"relative", zIndex:1 }}>
          <div className="s1" style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:16 }}>
              <div style={{ width:60, height:1, background:"linear-gradient(90deg,transparent,var(--accent))" }} />
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", letterSpacing:5 }}>F1 TELEMETRY SIM v2.4</div>
              <div style={{ width:60, height:1, background:"linear-gradient(90deg,var(--accent),transparent)" }} />
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(36px,8vw,72px)", fontWeight:900, lineHeight:1, marginBottom:12, background:"linear-gradient(135deg,#ffffff 0%,#c8d0e0 50%,#e8002d 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              STRATEGY<br />MASTER
            </h1>
            <div style={{ fontFamily:"var(--font-body)", fontSize:15, color:"var(--dim)", letterSpacing:4, marginBottom:16 }}>RACE ENGINEER SIMULATOR</div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:16, color:"var(--text)", maxWidth:500, margin:"0 auto", lineHeight:1.7 }}>
              Step into the pitwall. Manage tire degradation, predict the perfect pit window, and outsmart the AI engineer to lead your driver to victory.
            </div>
          </div>

          <div className="s2" style={{ display:"flex", justifyContent:"center", marginBottom:36 }}>
            <button onClick={()=>{setShowTutorial(true);setTutorialStep(0);}} className="hlift" style={{ padding:"12px 32px", fontFamily:"var(--font-display)", fontSize:11, letterSpacing:3, border:"1px solid var(--teal)", background:"rgba(0,212,255,0.08)", color:"var(--teal)", cursor:"pointer", borderRadius:3, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>📖</span> HOW TO PLAY
            </button>
          </div>

          <div className="s3" style={{ marginBottom:36 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--dim)", letterSpacing:4, textAlign:"center", marginBottom:14 }}>GAME OVERVIEW</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
              {[
                { icon:"📊", color:"var(--teal)",   title:"MONITOR",  desc:"Watch live tire wear against the historical average and your predicted curve." },
                { icon:"🎯", color:"var(--green)",  title:"PREDICT",  desc:"Choose the lap you want to pit on before tires reach the critical cliff zone." },
                { icon:"⚡", color:"var(--orange)", title:"REACT",    desc:"Pick the right compound — speed vs. durability trade-off matters every stop." },
                { icon:"🏆", color:"var(--gold)",   title:"SCORE",    desc:"Earn points for tire management and prediction accuracy. Beat the AI engineer." },
              ].map(({ icon, color, title, desc })=>(
                <div key={title} className="hlift" style={{ background:"linear-gradient(135deg,rgba(10,12,16,0.9),rgba(14,17,24,0.8))", border:`1px solid ${color}30`, borderRadius:4, padding:16, borderTop:`2px solid ${color}` }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:10, color, letterSpacing:2, marginBottom:8 }}>{title}</div>
                  <div style={{ fontFamily:"var(--font-body)", fontSize:13, color:"var(--dim)", lineHeight:1.6 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="s4" style={{ marginBottom:36 }}>
            <GlassPanel style={{ padding:20 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--dim)", letterSpacing:4, marginBottom:16 }}>TIRE COMPOUND GUIDE</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {Object.entries(TIRE_COMPOUNDS).map(([name, data])=>(
                  <div key={name} style={{ background:`${data.color}08`, border:`1px solid ${data.color}40`, borderRadius:3, padding:"14px 12px", textAlign:"center" }}>
                    <TireIcon compound={name} size={36} />
                    <div style={{ fontFamily:"var(--font-display)", fontSize:11, color:data.color, letterSpacing:2, margin:"10px 0 8px" }}>{name}</div>
                    {[["MAX LIFE",`${data.maxLife} laps`],["GRIP",`${(data.grip*100).toFixed(0)}%`],["WEAR",name==="SOFT"?"HIGH":name==="MEDIUM"?"MEDIUM":"LOW"]].map(([k,v])=>(
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize:10, marginBottom:3 }}>
                        <span style={{ color:"var(--dim)" }}>{k}</span><span style={{ color:data.color }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:10, fontFamily:"var(--font-body)", fontSize:11, color:"var(--dim)", lineHeight:1.5 }}>
                      {name==="SOFT"?"Fastest but wears quickly. Best for short stints.":name==="MEDIUM"?"Balanced. Good for middle stints and flexibility.":"Slowest but longest. Ideal for long final stints."}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          <div className="s5" style={{ marginBottom:28 }}>
            <GlassPanel style={{ padding:20 }} glow="var(--gold)">
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--gold)", letterSpacing:4, marginBottom:18 }}>RACE SETUP</div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", letterSpacing:2, marginBottom:10 }}>SELECT CIRCUIT</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                  {CIRCUITS.map((c,i)=>(
                    <button key={i} onClick={()=>setSelectedCircuit(i)} style={{ padding:"10px 14px", border:`1px solid ${selectedCircuit===i?"var(--gold)":"var(--border)"}`, background:selectedCircuit===i?"rgba(255,215,0,0.08)":"transparent", color:selectedCircuit===i?"var(--gold)":"var(--dim)", fontFamily:"var(--font-body)", fontSize:13, fontWeight:600, cursor:"pointer", borderRadius:3, textAlign:"left", transition:"all 0.2s" }}>
                      <div>{c.name}</div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", marginTop:2 }}>{c.laps} laps · {c.fuel}kg fuel · {c.diff}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", letterSpacing:2, marginBottom:10 }}>
                  STARTING COMPOUND <span style={{ color:"var(--muted)", fontSize:9, marginLeft:6 }}>— affects first pit window</span>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {Object.entries(TIRE_COMPOUNDS).map(([cmp,data])=>(
                    <button key={cmp} onClick={()=>setCompound(cmp)} style={{ flex:1, padding:"14px 8px", border:`2px solid ${compound===cmp?data.color:"var(--border)"}`, background:compound===cmp?`${data.color}15`:"transparent", color:compound===cmp?data.color:"var(--dim)", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:1, cursor:"pointer", borderRadius:3, transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                      <TireIcon compound={cmp} size={28} />
                      <div>{cmp}</div>
                      <div style={{ fontSize:8, color:"var(--dim)", fontFamily:"var(--font-mono)" }}>{data.maxLife}L MAX</div>
                      {compound===cmp && <div style={{ fontSize:8, color:data.color, fontFamily:"var(--font-mono)", letterSpacing:1 }}>SELECTED ✓</div>}
                    </button>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>

          <div className="s5" style={{ marginBottom:32 }}>
            <GlassPanel style={{ padding:20 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--dim)", letterSpacing:4, marginBottom:14 }}>SCORING SYSTEM</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                {[
                  { grade:"S", min:2000, color:"var(--gold)",   label:"RACE WINNER",  desc:"Perfect strategy" },
                  { grade:"A", min:1600, color:"var(--green)",  label:"PODIUM",        desc:"Strong calls" },
                  { grade:"B", min:1200, color:"var(--teal)",   label:"POINTS FINISH", desc:"Few errors" },
                  { grade:"C", min:800,  color:"var(--orange)", label:"MIDFIELD",      desc:"Reactive calls" },
                  { grade:"D", min:0,    color:"var(--accent)", label:"BACK OF GRID",  desc:"Tire issues" },
                ].map(({ grade, min, color, label, desc })=>(
                  <div key={grade} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1px solid ${color}30`, borderRadius:3, background:`${color}05` }}>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:24, color, lineHeight:1, minWidth:28 }}>{grade}</div>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:9, color, letterSpacing:1 }}>{label}</div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)" }}>{min}+ pts</div>
                      <div style={{ fontFamily:"var(--font-body)", fontSize:11, color:"var(--muted)", marginTop:2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          <div className="s6" style={{ display:"flex", gap:12, flexDirection:"column" }}>
            <button onClick={()=>onStart({ compound, circuitIndex: selectedCircuit })} style={{ width:"100%", padding:"20px", fontFamily:"var(--font-display)", fontSize:18, letterSpacing:5, color:"#fff", background:"linear-gradient(135deg,var(--accent) 0%,#c8001f 100%)", border:"none", borderRadius:3, cursor:"pointer", boxShadow:"0 0 40px rgba(232,0,45,0.35),0 4px 20px rgba(0,0,0,0.5)", animation:"glow 2.5s infinite", display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
              <span>LIGHTS OUT</span><span style={{ fontSize:22 }}>🏎</span><span style={{ fontSize:13, opacity:0.7, letterSpacing:2 }}>AND AWAY WE GO</span>
            </button>
            <button onClick={()=>{setShowTutorial(true);setTutorialStep(0);}} style={{ width:"100%", padding:"12px", fontFamily:"var(--font-display)", fontSize:11, letterSpacing:3, color:"var(--dim)", background:"transparent", border:"1px solid var(--border)", borderRadius:3, cursor:"pointer" }}>
              FIRST TIME? READ THE TUTORIAL FIRST →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PIT STOP SCREEN ──────────────────────────────────────────────────────────
function PitStopScreen({ currentLap, totalLaps, currentCompound, pitsMade, onExecute }) {
  const lapsRemaining = totalLaps - currentLap;
  const getTag = (cmp) => {
    if (cmp==="SOFT"   && lapsRemaining<=20) return { tag:"RECOMMENDED", reason:"Perfect for remaining laps" };
    if (cmp==="MEDIUM" && lapsRemaining<=35 && lapsRemaining>20) return { tag:"RECOMMENDED", reason:"Ideal for remaining distance" };
    if (cmp==="HARD"   && lapsRemaining>35)  return { tag:"RECOMMENDED", reason:"Only safe option for long stint" };
    if (cmp==="SOFT"   && lapsRemaining>20)  return { tag:"RISKY",       reason:"May not last to the end" };
    if (cmp==="HARD"   && lapsRemaining<=20) return { tag:"SLOW",        reason:"Unnecessary durability" };
    return { tag:null, reason:null };
  };
  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"radial-gradient(ellipse at center,#150800 0%,#050608 70%)", padding:24 }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(28px,7vw,56px)", color:"var(--orange)", textAlign:"center", marginBottom:4, animation:"glow 0.6s infinite" }}>BOX BOX BOX</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:13, color:"var(--dim)", marginBottom:6 }}>LAP {currentLap} PIT STOP — SELECT NEW COMPOUND</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--teal)", marginBottom:32 }}>{lapsRemaining} LAPS REMAINING</div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", maxWidth:580, marginBottom:28 }}>
          {Object.entries(TIRE_COMPOUNDS).map(([cmp, tc])=>{
            const { tag, reason } = getTag(cmp);
            const isCurrent = cmp===currentCompound && pitsMade===0;
            return (
              <button key={cmp} onClick={()=>!isCurrent && onExecute(cmp)} disabled={isCurrent}
                style={{ padding:"20px 18px", border:`2px solid ${tag==="RECOMMENDED"?tc.color:isCurrent?"var(--muted)":tc.color+"60"}`, background:tag==="RECOMMENDED"?`${tc.color}18`:isCurrent?"rgba(255,255,255,0.02)":`${tc.color}08`, color:isCurrent?"var(--muted)":tc.color, fontFamily:"var(--font-display)", fontSize:12, letterSpacing:2, cursor:isCurrent?"not-allowed":"pointer", borderRadius:4, transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:8, minWidth:140, position:"relative", boxShadow:tag==="RECOMMENDED"?`0 0 20px ${tc.color}30`:"none" }}>
                {tag&&!isCurrent&&<div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:tag==="RECOMMENDED"?tc.color:tag==="RISKY"?"var(--orange)":"var(--muted)", color:"#000", fontFamily:"var(--font-display)", fontSize:8, letterSpacing:1, padding:"3px 8px", borderRadius:10, whiteSpace:"nowrap" }}>{tag}</div>}
                {isCurrent&&<div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"var(--muted)", color:"#fff", fontFamily:"var(--font-display)", fontSize:8, letterSpacing:1, padding:"3px 8px", borderRadius:10, whiteSpace:"nowrap" }}>CURRENT</div>}
                <TireIcon compound={cmp} size={44} />
                <div style={{ fontSize:13 }}>{cmp}</div>
                {[["LASTS",`${tc.maxLife} laps`],["GRIP",`${(tc.grip*100).toFixed(0)}%`],["WEAR",cmp==="SOFT"?"HIGH":cmp==="MEDIUM"?"MED":"LOW"]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", width:"100%", fontFamily:"var(--font-mono)", fontSize:9 }}>
                    <span style={{ color:isCurrent?"var(--muted)":"var(--dim)" }}>{k}</span><span>{v}</span>
                  </div>
                ))}
                {reason&&!isCurrent&&<div style={{ fontFamily:"var(--font-body)", fontSize:11, color:"var(--dim)", textAlign:"center", lineHeight:1.4 }}>{reason}</div>}
              </button>
            );
          })}
        </div>
        <div style={{ maxWidth:480, background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.2)", borderRadius:3, padding:"12px 18px", textAlign:"center" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--teal)", letterSpacing:2, marginBottom:6 }}>💡 ENGINEER ADVICE</div>
          <div style={{ fontFamily:"var(--font-body)", fontSize:13, color:"var(--dim)", lineHeight:1.6 }}>
            {lapsRemaining<=20?"Short stint remaining — Softs will give maximum pace to the flag.":lapsRemaining<=35?"Medium distance left — Mediums offer the best balance. Softs are risky unless you're chasing.":"Long stint ahead — Hards are your only safe option."}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ score, pitsMade, totalLaps, bestLap, predictionAccuracy, compound, circuitName, onRestart }) {
  const grade = score>=2000?"S":score>=1600?"A":score>=1200?"B":score>=800?"C":"D";
  const gradeColor = { S:"var(--gold)", A:"var(--green)", B:"var(--teal)", C:"var(--orange)", D:"var(--accent)" }[grade];
  const feedback = {
    S:{ title:"FLAWLESS STRATEGY",    desc:"You called every pit window perfectly and managed the tires like a true race engineer." },
    A:{ title:"STRONG PERFORMANCE",   desc:"Excellent tire management with only minor timing errors. You kept your driver in contention." },
    B:{ title:"SOLID STRATEGY",       desc:"Good instincts but a few laps off optimal on the pit calls. Better degradation reading needed." },
    C:{ title:"REACTIVE ENGINEER",    desc:"You reacted to problems instead of predicting them. Study the degradation curves more carefully." },
    D:{ title:"BACK TO THE SIMULATOR",desc:"Tires were cliffed and pit timing was poor. Review the compound guide and practice reading the deg chart." },
  }[grade];
  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:`radial-gradient(ellipse at center,${gradeColor}08 0%,#050608 60%)` }}>
        <div style={{ maxWidth:500, width:"100%" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--dim)", letterSpacing:4, marginBottom:16 }}>RACE COMPLETE — {circuitName.toUpperCase()}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:110, lineHeight:1, color:gradeColor, textShadow:`0 0 60px ${gradeColor}50`, animation:"gradeReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>{grade}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:gradeColor, letterSpacing:3, marginBottom:8 }}>{feedback.title}</div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:14, color:"var(--dim)", lineHeight:1.7, maxWidth:380, margin:"0 auto" }}>{feedback.desc}</div>
          </div>
          <GlassPanel style={{ padding:0, marginBottom:16, overflow:"hidden" }} glow={gradeColor}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", background:`${gradeColor}08` }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:gradeColor, letterSpacing:3 }}>RACE DEBRIEF</div>
            </div>
            {[
              ["FINAL SCORE", score, gradeColor],
              ["TOTAL LAPS", totalLaps, "var(--text)"],
              ["PIT STOPS MADE", pitsMade, "var(--text)"],
              ["BEST LAP TIME", bestLap?`${bestLap.toFixed(3)}s`:"—", "var(--teal)"],
              ["PREDICTION ACC.", predictionAccuracy?`${predictionAccuracy}%`:"N/A", predictionAccuracy>=80?"var(--green)":predictionAccuracy>=60?"var(--gold)":"var(--accent)"],
              ["STARTING COMPOUND", compound, TIRE_COMPOUNDS[compound].color],
            ].map(([k,v,color])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)" }}>{k}</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:13, color }}>{v}</div>
              </div>
            ))}
          </GlassPanel>
          {grade!=="S" && (
            <GlassPanel style={{ padding:16, marginBottom:20 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--teal)", letterSpacing:3, marginBottom:12 }}>HOW TO IMPROVE</div>
              {[
                predictionAccuracy<80 && "📍 Predict your pit window earlier — aim to commit 10+ laps before the cliff",
                pitsMade===0          && "🔧 You never pitted! A 1-stop strategy is optimal on most circuits",
                score<1200            && "📊 Watch the degradation chart — pit when actual wear crosses below historical average",
              ].filter(Boolean).map((tip,i)=>(
                <div key={i} style={{ fontFamily:"var(--font-body)", fontSize:13, color:"var(--text)", padding:"8px 0", borderBottom:"1px solid var(--border)", lineHeight:1.5 }}>{tip}</div>
              ))}
            </GlassPanel>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onRestart} style={{ flex:2, padding:"16px", fontFamily:"var(--font-display)", fontSize:13, letterSpacing:3, color:"#fff", background:"linear-gradient(135deg,var(--accent),#c8001f)", border:"none", borderRadius:3, cursor:"pointer", boxShadow:"0 0 20px rgba(232,0,45,0.3)" }}>🏎 NEW RACE</button>
            <button onClick={onRestart} style={{ flex:1, padding:"16px", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:2, color:"var(--dim)", background:"transparent", border:"1px solid var(--border)", borderRadius:3, cursor:"pointer" }}>TUTORIAL</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── HUD Sub-components ───────────────────────────────────────────────────────
const LapTimeChart = ({ laptimes }) => {
  if (laptimes.length<2) return <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--dim)", fontFamily:"var(--font-mono)", fontSize:13 }}>AWAITING LAP DATA...</div>;
  const W=500,H=110, mn=Math.min(...laptimes)-0.5, mx=Math.max(...laptimes)+0.5;
  const xs=laptimes.map((_,i)=>(i/(laptimes.length-1))*W);
  const ys=laptimes.map(t=>H-((t-mn)/(mx-mn))*H);
  const path=xs.map((x,i)=>`${i===0?"M":"L"}${x},${ys[i]}`).join(" ");
  const fill=path+` L${xs[xs.length-1]},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:120 }} preserveAspectRatio="none">
      <defs><linearGradient id="ltG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--teal)" stopOpacity="0.3"/><stop offset="100%" stopColor="var(--teal)" stopOpacity="0"/></linearGradient></defs>
      <path d={fill} fill="url(#ltG)"/><path d={path} fill="none" stroke="var(--teal)" strokeWidth="2"/>
      {laptimes.map((t,i)=><circle key={i} cx={xs[i]} cy={ys[i]} r={i===laptimes.length-1?4:2} fill={i===laptimes.length-1?"var(--gold)":"var(--teal)"}/>)}
    </svg>
  );
};
const TireDegChart = ({ actual, predicted, historical, compound }) => {
  const c=TIRE_COMPOUNDS[compound], W=500, H=140;
  const toY=v=>H-(v/100)*H, toX=(i,len)=>(i/Math.max(len-1,1))*W;
  const mk=arr=>arr.length>1?arr.map((v,i)=>`${i===0?"M":"L"}${toX(i,arr.length)},${toY(v)}`).join(" "):null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:150 }} preserveAspectRatio="none">
      <defs><linearGradient id="cliffG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b00" stopOpacity="0.15"/><stop offset="100%" stopColor="#ff6b00" stopOpacity="0"/></linearGradient></defs>
      {[25,50,75,100].map(v=><line key={v} x1={0} y1={toY(v)} x2={W} y2={toY(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4"/>)}
      <rect x={0} y={toY(70)} width={W} height={H-toY(70)} fill="url(#cliffG)"/>
      <line x1={0} y1={toY(70)} x2={W} y2={toY(70)} stroke="var(--orange)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5"/>
      <text x={6} y={toY(70)-4} fontSize={9} fill="var(--orange)" fontFamily="var(--font-mono)" opacity="0.7">CLIFF ZONE</text>
      {mk(historical)&&<path d={mk(historical)} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5,3"/>}
      {mk(predicted) &&<path d={mk(predicted)}  fill="none" stroke="var(--gold)"  strokeWidth="2"   strokeDasharray="8,4"/>}
      {mk(actual)    &&<path d={mk(actual)}      fill="none" stroke={c.color}      strokeWidth="2.5"/>}
      {actual.length>0&&<circle cx={toX(actual.length-1,actual.length)} cy={toY(actual[actual.length-1])} r={5} fill={c.color} stroke="#fff" strokeWidth="1.5"/>}
    </svg>
  );
};
const StrategyBar = ({ stints, totalLaps, userPitLap }) => (
  <div style={{ position:"relative", height:36 }}>
    <div style={{ display:"flex", height:"100%", borderRadius:3, overflow:"hidden", border:"1px solid var(--border)" }}>
      {stints.map((s,i)=>{
        const c=TIRE_COMPOUNDS[s.compound];
        return <div key={i} style={{ width:`${(s.laps/totalLaps)*100}%`, background:`${c.color}30`, borderRight:i<stints.length-1?`2px solid ${c.color}`:"none", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-mono)", fontSize:11, color:c.color }}><TireIcon compound={s.compound} size={18}/><span style={{ marginLeft:4 }}>{s.laps}L</span></div>;
      })}
    </div>
    {userPitLap&&<div style={{ position:"absolute", top:0, left:`${(userPitLap/totalLaps)*100}%`, height:"100%", width:2, background:"var(--green)", opacity:0.8, transform:"translateX(-50%)" }}><div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap", fontSize:9, fontFamily:"var(--font-mono)", color:"var(--green)", marginBottom:2 }}>YOUR BOX</div></div>}
  </div>
);
const ScoreWidget = ({ score, delta, accuracy }) => (
  <GlassPanel style={{ padding:16, textAlign:"center" }} glow="var(--gold)">
    <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--gold)", letterSpacing:3, marginBottom:8 }}>ENGINEER SCORE</div>
    <div style={{ fontFamily:"var(--font-display)", fontSize:42, color:"var(--gold)", lineHeight:1 }}>{score}</div>
    <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)", marginTop:4 }}>{delta>0?`+${delta}`:delta} PTS THIS STINT</div>
    {accuracy!==null&&<div style={{ marginTop:8, fontFamily:"var(--font-mono)", fontSize:12, color:accuracy>=80?"var(--green)":accuracy>=60?"var(--gold)":"var(--accent)" }}>ACCURACY: {accuracy}%</div>}
  </GlassPanel>
);
const LeaderRow = ({ pos, name, gap, compound, laps }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", borderBottom:"1px solid var(--border)" }}>
    <div style={{ fontFamily:"var(--font-display)", fontSize:11, color:pos===1?"var(--gold)":"var(--dim)", width:20, textAlign:"right" }}>{pos}</div>
    <TireIcon compound={compound} size={20}/>
    <div style={{ flex:1, fontFamily:"var(--font-body)", fontSize:14, fontWeight:600 }}>{name}</div>
    <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)" }}>L{laps}</div>
    <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:pos===1?"var(--green)":"var(--text)", minWidth:60, textAlign:"right" }}>{pos===1?"LEADER":`+${gap}`}</div>
  </div>
);
const RadioFeed = ({ messages }) => (
  <div style={{ height:100, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
    {messages.slice(-6).reverse().map((m,i)=>(
      <div key={i} style={{ fontFamily:"var(--font-mono)", fontSize:11, color:i===0?"var(--green)":"var(--dim)", padding:"3px 0", borderBottom:"1px solid var(--border)" }}>
        <span style={{ color:"var(--teal)" }}>[{m.lap}]</span> {m.text}
      </div>
    ))}
  </div>
);
function PitPredictionWidget({ currentLap, totalLaps, tireDeg, onPredict }) {
  const [selectedLap, setSelectedLap] = useState(null);
  const minPit=currentLap+1, maxPit=Math.min(totalLaps-10,currentLap+20);
  const optimalPit=currentLap+Math.ceil((tireDeg-65)/1.5);
  return (
    <GlassPanel style={{ padding:16 }} glow="var(--green)">
      <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--green)", letterSpacing:3, marginBottom:12 }}>PIT WINDOW PREDICTOR</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        {Array.from({length:Math.max(0,maxPit-minPit+1)},(_,i)=>minPit+i).map(lap=>{
          const isOpt=lap===optimalPit, isSel=lap===selectedLap;
          return <button key={lap} onClick={()=>setSelectedLap(lap)} style={{ width:36, height:36, border:`1px solid ${isSel?"var(--green)":isOpt?"var(--gold)":"var(--border)"}`, background:isSel?"rgba(0,255,135,0.15)":isOpt?"rgba(255,215,0,0.1)":"transparent", color:isSel?"var(--green)":isOpt?"var(--gold)":"var(--dim)", fontFamily:"var(--font-mono)", fontSize:12, cursor:"pointer", borderRadius:2, position:"relative" }}>{lap}{isOpt&&!isSel&&<div style={{ position:"absolute", top:-6, right:-6, width:10, height:10, background:"var(--gold)", borderRadius:"50%", fontSize:6, display:"flex", alignItems:"center", justifyContent:"center" }}>★</div>}</button>;
        })}
      </div>
      <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"var(--font-mono)", marginBottom:10 }}>★ PREDICTED OPTIMAL: LAP {optimalPit}</div>
      <button onClick={()=>selectedLap&&onPredict(selectedLap)} disabled={!selectedLap} style={{ width:"100%", padding:"10px", border:`1px solid ${selectedLap?"var(--green)":"var(--border)"}`, background:selectedLap?"rgba(0,255,135,0.1)":"transparent", color:selectedLap?"var(--green)":"var(--dim)", fontFamily:"var(--font-display)", fontSize:11, letterSpacing:2, cursor:selectedLap?"pointer":"not-allowed", borderRadius:2 }}>
        {selectedLap?`COMMIT: BOX LAP ${selectedLap}`:"SELECT PIT LAP"}
      </button>
    </GlassPanel>
  );
}

// ─── RACE HUD ─────────────────────────────────────────────────────────────────
function RaceHUD({ initialCompound, circuit, onFinish }) {
  const TOTAL_LAPS = circuit.laps;
  const [currentLap, setCurrentLap]           = useState(0);
  const [isRunning, setIsRunning]              = useState(true);
  const [lapSpeed, setLapSpeed]                = useState(1200);
  const [compound, setCompound]                = useState(initialCompound);
  const [tireDeg, setTireDeg]                  = useState(100);
  const [stintLap, setStintLap]                = useState(0);
  const [fuelLoad, setFuelLoad]                = useState(circuit.fuel);
  const [laptimes, setLaptimes]                = useState([]);
  const [stints, setStints]                    = useState([]);
  const [actualDegHistory, setActualDegHistory]= useState([100]);
  const [predictedDegHistory, setPredDeg]      = useState([]);
  const [historicalDeg]                        = useState(()=>generateHistoricalData("SOFT", TOTAL_LAPS));
  const [userPitLap, setUserPitLap]            = useState(null);
  const [aiPitLap, setAiPitLap]               = useState(null);
  const [pitsMade, setPitsMade]                = useState(0);
  const [showPit, setShowPit]                  = useState(false);
  const [leaderboard, setLeaderboard]          = useState([
    { name:"VER", compound:"SOFT",   laps:0, gap:0   },
    { name:"LEC", compound:"MEDIUM", laps:0, gap:1.2 },
    { name:"NOR", compound:"SOFT",   laps:0, gap:2.8 },
    { name:"HAM", compound:"HARD",   laps:0, gap:4.1 },
    { name:"YOU", compound:"SOFT",   laps:0, gap:0, isUser:true },
  ]);
  const [radioFeed, setRadioFeed]              = useState([{ lap:0, text:"LIGHTS OUT AND AWAY WE GO!" }]);
  const [score, setScore]                      = useState(1000);
  const [scoreDelta, setScoreDelta]            = useState(0);
  const [predAcc, setPredAcc]                  = useState(null);

  const timerRef = useRef(null);
  const stateRef = useRef({});
  stateRef.current = { compound, tireDeg, fuelLoad, userPitLap, aiPitLap, stintLap, currentLap, score, pitsMade, laptimes };

  const addRadio = useCallback((text, lap) => setRadioFeed(prev=>[...prev,{lap,text}]), []);

  const simLap = useCallback(() => {
    const { compound:cmp, tireDeg:deg, fuelLoad:fuel, userPitLap:upl, aiPitLap:apl, stintLap:sl, currentLap:cl, score:sc, pitsMade:pm, laptimes:lt } = stateRef.current;
    const lap = cl + 1;
    if (lap > TOTAL_LAPS) {
      setIsRunning(false);
      onFinish({ score:sc, pitsMade:pm, totalLaps:TOTAL_LAPS, bestLap:lt.length?Math.min(...lt):null, predictionAccuracy:null });
      return;
    }
    setCurrentLap(lap);
    setStintLap(s=>s+1);
    setFuelLoad(f=>Math.max(0,f-circuit.fuel/TOTAL_LAPS));
    const cliffMult = deg<65?2.2:1;
    const newDeg = Math.max(0, deg - TIRE_COMPOUNDS[cmp].degradRate*100*cliffMult*(0.9+Math.random()*0.2));
    setTireDeg(newDeg);
    setActualDegHistory(h=>[...h,newDeg]);
    setPredDeg(Array.from({length:20},(_,i)=>Math.max(0,newDeg-i*TIRE_COMPOUNDS[cmp].degradRate*100)));
    const mgmt=newDeg>75?5:newDeg>60?2:newDeg>40?0:-5;
    setScore(s=>s+mgmt);
    setScoreDelta(mgmt);
    setLaptimes(lts=>[...lts, generateLapTelemetry(cmp, deg, fuel)]);
    setLeaderboard(lb=>lb.map(d=>({...d,laps:d.laps+1})));
    if (!apl && lap===18+Math.floor(Math.random()*4)) { const t=lap+2; setAiPitLap(t); addRadio(`AI ENGINEER: OPTIMAL BOX WINDOW LAP ${t}`,lap); }
    if (upl&&lap===upl-3) addRadio(`ENGINEER: 3 LAPS TO YOUR PREDICTED BOX.`,lap);
    if (newDeg<60&&newDeg>55) addRadio(`WARNING: TIRE DEGRADATION CRITICAL.`,lap);
    if (upl&&lap===upl) { setIsRunning(false); setShowPit(true); addRadio(`BOX BOX BOX. PIT STOP NOW.`,lap); }
  }, [TOTAL_LAPS, circuit.fuel, addRadio, onFinish]);

  useEffect(()=>{
    if (isRunning&&!showPit) { timerRef.current=setInterval(simLap,lapSpeed); }
    return ()=>clearInterval(timerRef.current);
  },[isRunning,lapSpeed,showPit,simLap]);

  const executePitStop = (newCmp) => {
    const { userPitLap:upl, aiPitLap:apl, stintLap:sl, score:sc, compound:cmp, laptimes:lt } = stateRef.current;
    const accuracy = upl&&apl ? Math.max(0,100-Math.abs(upl-apl)*8) : null;
    if (accuracy!==null) { setPredAcc(accuracy); const bonus=Math.floor(accuracy*2); setScore(s=>s+bonus); addRadio(`PIT STOP COMPLETE. +${bonus} STRATEGY POINTS.`, currentLap); }
    setStints(s=>[...s,{compound:cmp,laps:sl+1}]);
    setCompound(newCmp); setTireDeg(100); setStintLap(0); setActualDegHistory([100]); setPredDeg([]);
    setPitsMade(p=>p+1); setUserPitLap(null); setAiPitLap(null); setShowPit(false); setIsRunning(true);
  };

  if (showPit) return <PitStopScreen currentLap={currentLap} totalLaps={TOTAL_LAPS} currentCompound={compound} pitsMade={pitsMade} onExecute={executePitStop}/>;

  const progress=(currentLap/TOTAL_LAPS)*100;
  const lastLap=laptimes[laptimes.length-1];
  const bestLap=laptimes.length?Math.min(...laptimes):null;
  const c=TIRE_COMPOUNDS[compound];

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
        <div style={{ background:"var(--panel)", borderBottom:"1px solid var(--border)", padding:"0 16px", display:"flex", alignItems:"center", gap:16, height:48, flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"var(--accent)", fontWeight:900 }}>STRATEGY MASTER</div>
          <div style={{ width:1, height:20, background:"var(--border)" }}/>
          <LiveDot/><div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--green)" }}>LIVE</div>
          <div style={{ width:1, height:20, background:"var(--border)" }}/>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,var(--accent),var(--gold))", transition:"width 0.5s ease" }}/>
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:12, color:"var(--text)", whiteSpace:"nowrap" }}>LAP <span style={{ color:"var(--gold)" }}>{currentLap}</span> / {TOTAL_LAPS}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {[2000,1200,600].map(s=>(
              <button key={s} onClick={()=>setLapSpeed(s)} style={{ padding:"3px 8px", fontFamily:"var(--font-mono)", fontSize:10, border:`1px solid ${lapSpeed===s?"var(--teal)":"var(--border)"}`, background:lapSpeed===s?"rgba(0,212,255,0.1)":"transparent", color:lapSpeed===s?"var(--teal)":"var(--dim)", cursor:"pointer", borderRadius:2 }}>{s===2000?"1x":s===1200?"2x":"4x"}</button>
            ))}
            <button onClick={()=>setIsRunning(r=>!r)} style={{ padding:"5px 14px", fontFamily:"var(--font-display)", fontSize:10, letterSpacing:2, border:`1px solid ${isRunning?"var(--accent)":"var(--green)"}`, background:isRunning?"rgba(232,0,45,0.1)":"rgba(0,255,135,0.1)", color:isRunning?"var(--accent)":"var(--green)", cursor:"pointer", borderRadius:2 }}>
              {isRunning?"PAUSE":"RESUME"}
            </button>
          </div>
        </div>

        <div style={{ flex:1, display:"grid", gridTemplateColumns:"280px 1fr 260px", gap:1, padding:1, background:"var(--border)" }}>
          <div style={{ background:"var(--bg)", display:"flex", flexDirection:"column", gap:1 }}>
            <GlassPanel style={{ padding:16 }} glow={c.color}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--dim)", letterSpacing:3, marginBottom:12 }}>YOUR CAR</div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <TireIcon compound={compound} size={44}/>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--text)" }}>{compound}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>STINT LAP {stintLap}</div>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>TIRE DEG</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:12, color:tireDeg>70?"var(--green)":tireDeg>50?"var(--gold)":"var(--accent)" }}>{tireDeg.toFixed(1)}%</div>
                </div>
                <div style={{ height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${tireDeg}%`, background:tireDeg>70?"var(--green)":tireDeg>50?"var(--gold)":"var(--accent)", transition:"width 0.5s ease", borderRadius:4 }}/>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>FUEL LOAD</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:12, color:"var(--teal)" }}>{fuelLoad.toFixed(1)}kg</div>
                </div>
                <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(fuelLoad/circuit.fuel)*100}%`, background:"var(--teal)", transition:"width 0.5s ease" }}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[["LAST LAP",lastLap?`${lastLap.toFixed(3)}`:"—"],["BEST LAP",bestLap?`${bestLap.toFixed(3)}`:"—"]].map(([k,v])=>(
                  <div key={k} style={{ background:"var(--panel)", padding:8, borderRadius:3, border:"1px solid var(--border)" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", marginBottom:2 }}>{k}</div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"var(--text)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>
            <div style={{ padding:1 }}><ScoreWidget score={score} delta={scoreDelta} accuracy={predAcc}/></div>
            <GlassPanel style={{ padding:16 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:9, color:"var(--dim)", letterSpacing:3, marginBottom:10 }}>STINT PLAN</div>
              <StrategyBar stints={[...stints,{compound,laps:stintLap}]} totalLaps={TOTAL_LAPS} userPitLap={userPitLap}/>
              {aiPitLap&&<div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--gold)", marginTop:8 }}>AI TARGET: LAP {aiPitLap}</div>}
              {userPitLap&&<div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--green)", marginTop:4 }}>YOUR CALL: LAP {userPitLap}</div>}
            </GlassPanel>
          </div>

          <div style={{ background:"var(--bg)", display:"flex", flexDirection:"column", gap:1 }}>
            <GlassPanel style={{ padding:16, flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--text)", letterSpacing:3 }}>TIRE DEGRADATION MODEL</div>
                <div style={{ display:"flex", gap:12, fontSize:9, fontFamily:"var(--font-mono)" }}>
                  <span style={{ color:c.color }}>■ ACTUAL</span>
                  <span style={{ color:"var(--gold)" }}>■ PREDICTED</span>
                  <span style={{ color:"var(--muted)" }}>■ HISTORICAL AVG</span>
                </div>
              </div>
              <TireDegChart actual={actualDegHistory} predicted={predictedDegHistory} historical={historicalDeg.slice(0,currentLap+10)} compound={compound}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", marginTop:4 }}>
                <span>LAP 0</span><span>LAP {TOTAL_LAPS}</span>
              </div>
            </GlassPanel>
            <GlassPanel style={{ padding:16 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--text)", letterSpacing:3, marginBottom:8 }}>LAP TIME TELEMETRY</div>
              <LapTimeChart laptimes={laptimes}/>
            </GlassPanel>
            {!userPitLap&&currentLap>5&&(
              <PitPredictionWidget currentLap={currentLap} totalLaps={TOTAL_LAPS} tireDeg={tireDeg} onPredict={(lap)=>{setUserPitLap(lap);addRadio(`YOUR CALL: BOX LAP ${lap} COMMITTED.`,currentLap);}}/>
            )}
            {userPitLap&&(
              <GlassPanel style={{ padding:14 }} glow="var(--green)">
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <LiveDot color="var(--green)"/>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--green)" }}>PIT WINDOW COMMITTED: LAP {userPitLap}</div>
                  {aiPitLap&&<div style={{ marginLeft:"auto", fontFamily:"var(--font-mono)", fontSize:11, color:"var(--gold)" }}>AI: LAP {aiPitLap} | DELTA: {userPitLap-aiPitLap>0?`+${userPitLap-aiPitLap}`:userPitLap-aiPitLap}</div>}
                </div>
              </GlassPanel>
            )}
          </div>

          <div style={{ background:"var(--bg)", display:"flex", flexDirection:"column", gap:1 }}>
            <GlassPanel style={{ padding:0 }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                <LiveDot/><div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--text)", letterSpacing:3 }}>RACE ORDER</div>
              </div>
              {leaderboard.map((d,i)=><LeaderRow key={d.name} pos={i+1} name={d.name} gap={d.gap>0?d.gap.toFixed(1)+"s":"0.0s"} compound={d.isUser?compound:d.compound} laps={d.laps}/>)}
            </GlassPanel>
            <GlassPanel style={{ padding:16 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--dim)", letterSpacing:3, marginBottom:12 }}>COMPOUND DATA</div>
              {Object.entries(TIRE_COMPOUNDS).map(([name,data])=>(
                <div key={name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, opacity:name===compound?1:0.5 }}>
                  <TireIcon compound={name} size={26}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:data.color }}>{name}</div>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>{data.maxLife}L MAX</div>
                    </div>
                    <div style={{ height:3, background:"var(--border)", borderRadius:2 }}>
                      <div style={{ height:"100%", width:`${(1-data.degradRate/0.05)*100}%`, background:data.color, borderRadius:2 }}/>
                    </div>
                  </div>
                </div>
              ))}
            </GlassPanel>
            <GlassPanel style={{ padding:16, flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:10, color:"var(--dim)", letterSpacing:3 }}>ENGINEER COMMS</div>
                <LiveDot color="var(--teal)"/>
              </div>
              <RadioFeed messages={radioFeed}/>
            </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ROOT — only manages which screen is active ───────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("pre");
  const [raceConfig, setRaceConfig] = useState(null);
  const [finalStats, setFinalStats] = useState(null);

  if (screen === "pre") {
    return (
      <PreRaceScreen
        onStart={({ compound, circuitIndex }) => {
          setRaceConfig({ compound, circuitIndex });
          setScreen("racing");
        }}
      />
    );
  }

  if (screen === "racing" && raceConfig) {
    return (
      <RaceHUD
        initialCompound={raceConfig.compound}
        circuit={CIRCUITS[raceConfig.circuitIndex]}
        onFinish={(stats) => { setFinalStats(stats); setScreen("result"); }}
      />
    );
  }

  return (
    <ResultScreen
      score={finalStats?.score ?? 1000}
      pitsMade={finalStats?.pitsMade ?? 0}
      totalLaps={finalStats?.totalLaps ?? 57}
      bestLap={finalStats?.bestLap ?? null}
      predictionAccuracy={finalStats?.predictionAccuracy ?? null}
      compound={raceConfig?.compound ?? "SOFT"}
      circuitName={raceConfig ? CIRCUITS[raceConfig.circuitIndex].name : "Bahrain Grand Prix"}
      onRestart={() => { setScreen("pre"); setRaceConfig(null); setFinalStats(null); }}
    />
  );
}
