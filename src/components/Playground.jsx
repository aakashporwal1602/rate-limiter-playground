import { useState, useEffect, useRef, useCallback } from 'react'
import { TokenBucket, FixedWindowCounter, SlidingWindowLog, SlidingWindowCounter } from '../algorithms'

const ALGO_CONFIGS = [
  {
    id: 'token',
    name: 'Token Bucket',
    color: '#7C5CFF',
    description: 'Tokens refill at a fixed rate. Each request consumes one token. Allows short bursts up to bucket capacity.',
    params: [
      { id: 'capacity', label: 'Bucket capacity', min: 1, max: 20, default: 10, unit: 'tokens' },
      { id: 'refillRate', label: 'Refill rate', min: 1, max: 10, default: 2, unit: 'tokens/sec' },
    ],
    create: (p) => new TokenBucket(p.capacity, p.refillRate),
    reset: (inst, p) => inst.reset(p.capacity, p.refillRate),
    visualize: (inst) => {
      const s = inst.getState()
      return { type: 'tokens', filled: s.tokens, total: s.capacity }
    },
  },
  {
    id: 'fixed',
    name: 'Fixed Window',
    color: '#22D3EE',
    description: 'Count requests in fixed time windows. Reset counter at window boundary. Simple but has edge-burst problem.',
    params: [
      { id: 'limit', label: 'Max requests', min: 1, max: 20, default: 5, unit: 'per window' },
      { id: 'windowMs', label: 'Window size', min: 1, max: 10, default: 5, unit: 'seconds' },
    ],
    create: (p) => new FixedWindowCounter(p.limit, p.windowMs),
    reset: (inst, p) => inst.reset(p.limit, p.windowMs),
    visualize: (inst) => {
      const s = inst.getState()
      const now = Date.now()
      const resetIn = Math.max(0, (s.windowMs - (now - s.windowStart)) / 1000).toFixed(1)
      return { type: 'fixed', count: s.count, limit: s.limit, resetIn }
    },
  },
  {
    id: 'swlog',
    name: 'Sliding Window Log',
    color: '#F5B841',
    description: 'Store exact timestamp of every request. Remove stale entries on each check. Most accurate, highest memory.',
    params: [
      { id: 'limit', label: 'Max requests', min: 1, max: 15, default: 5, unit: 'per window' },
      { id: 'windowMs', label: 'Window size', min: 1, max: 10, default: 5, unit: 'seconds' },
    ],
    create: (p) => new SlidingWindowLog(p.limit, p.windowMs),
    reset: (inst, p) => inst.reset(p.limit, p.windowMs),
    visualize: (inst) => {
      const s = inst.getState()
      const active = s.log.filter(t => t > s.now - s.windowMs)
      return { type: 'log', active: active.length, limit: s.limit, timestamps: active, now: s.now, windowMs: s.windowMs }
    },
  },
  {
    id: 'swcount',
    name: 'Sliding Window Counter',
    color: '#34D399',
    description: 'Weighted approximation using two fixed windows. O(1) memory. Used by Redis, Nginx, Cloudflare.',
    params: [
      { id: 'limit', label: 'Max requests', min: 1, max: 20, default: 10, unit: 'per window' },
      { id: 'windowMs', label: 'Window size', min: 1, max: 10, default: 5, unit: 'seconds' },
    ],
    create: (p) => new SlidingWindowCounter(p.limit, p.windowMs),
    reset: (inst, p) => inst.reset(p.limit, p.windowMs),
    visualize: (inst) => {
      const s = inst.getState()
      return { type: 'counter', estimated: s.estimated, limit: s.limit, prevCount: s.prevCount, currCount: s.currCount, overlap: s.overlap }
    },
  },
]

export default function Playground({ algos }) {
  const [activeAlgo, setActiveAlgo] = useState(0)
  const [params, setParams] = useState(
    ALGO_CONFIGS.map(a => Object.fromEntries(a.params.map(p => [p.id, p.default])))
  )
  const [logs, setLogs] = useState(ALGO_CONFIGS.map(() => []))
  const [stats, setStats] = useState(ALGO_CONFIGS.map(() => ({ allowed: 0, blocked: 0 })))
  const [visState, setVisState] = useState(null)
  const instancesRef = useRef(ALGO_CONFIGS.map((a, i) =>
    a.create(Object.fromEntries(a.params.map(p => [p.id, p.default])))
  ))

  const updateVis = useCallback(() => {
    const cfg = ALGO_CONFIGS[activeAlgo]
    const inst = instancesRef.current[activeAlgo]
    setVisState(cfg.visualize(inst))
  }, [activeAlgo])

  useEffect(() => {
    updateVis()
    const id = setInterval(updateVis, 300)
    return () => clearInterval(id)
  }, [updateVis])

  const addLog = (idx, ok, info) => {
    const line = {
      ok,
      msg: ok ? `✓ ALLOWED — ${info}` : `✗ BLOCKED (429) — ${info}`,
      t: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    }
    setLogs(prev => {
      const next = [...prev]
      next[idx] = [line, ...next[idx].slice(0, 49)]
      return next
    })
  }

  const sendRequest = (burst = false) => {
    const idx = activeAlgo
    const inst = instancesRef.current[idx]
    const count = burst ? 5 : 1
    let allowed = 0, blocked = 0
    for (let i = 0; i < count; i++) {
      const result = inst.allowRequest()
      if (result.allowed) { allowed++; addLog(idx, true, result.info) }
      else { blocked++; addLog(idx, false, result.info) }
    }
    setStats(prev => {
      const next = [...prev]
      next[idx] = { allowed: next[idx].allowed + allowed, blocked: next[idx].blocked + blocked }
      return next
    })
    updateVis()
  }

  const resetAlgo = () => {
    const idx = activeAlgo
    const cfg = ALGO_CONFIGS[idx]
    const p = params[idx]
    cfg.reset(instancesRef.current[idx], p)
    setLogs(prev => { const next = [...prev]; next[idx] = []; return next })
    setStats(prev => { const next = [...prev]; next[idx] = { allowed: 0, blocked: 0 }; return next })
    updateVis()
  }

  const updateParam = (paramId, value) => {
    const idx = activeAlgo
    const newParams = { ...params[idx], [paramId]: Number(value) }
    setParams(prev => { const next = [...prev]; next[idx] = newParams; return next })
    const cfg = ALGO_CONFIGS[idx]
    cfg.reset(instancesRef.current[idx], newParams)
    setLogs(prev => { const next = [...prev]; next[idx] = []; return next })
    setStats(prev => { const next = [...prev]; next[idx] = { allowed: 0, blocked: 0 }; return next })
  }

  const cfg = ALGO_CONFIGS[activeAlgo]
  const algoInfo = algos[activeAlgo]
  const currentParams = params[activeAlgo]
  const currentLogs = logs[activeAlgo]
  const currentStats = stats[activeAlgo]

  return (
    <div className="playground">
      <div className="page-header">
        <h1>Rate Limiter Playground</h1>
        <p>Test all 4 algorithms in real-time. Adjust parameters and send requests to see how each behaves.</p>
      </div>

      <div className="algo-tabs">
        {ALGO_CONFIGS.map((a, i) => (
          <button
            key={a.id}
            className={`algo-tab ${activeAlgo === i ? 'active' : ''}`}
            style={{ '--c': a.color }}
            onClick={() => setActiveAlgo(i)}
          >
            <span className="algo-dot" style={{ background: a.color }} />
            {a.name}
          </button>
        ))}
      </div>

      <div className="pg-layout">
        <div className="pg-left">
          <div className="pg-card">
            <div className="desc-box" style={{ borderColor: cfg.color + '44' }}>
              <div className="desc-algo-name" style={{ color: cfg.color }}>{cfg.name}</div>
              <p className="desc-text">{cfg.description}</p>
              <div className="desc-tags">
                <span>{algoInfo.complexity}</span>
                <span>{algoInfo.companies}</span>
              </div>
            </div>

            <div className="params-section">
              {cfg.params.map(param => (
                <div className="param-row" key={param.id}>
                  <div className="param-label-row">
                    <label>{param.label}</label>
                    <span className="param-val" style={{ color: cfg.color }}>
                      {currentParams[param.id]} {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step="1"
                    value={currentParams[param.id]}
                    onChange={e => updateParam(param.id, e.target.value)}
                    className="param-slider"
                    style={{ '--c': cfg.color }}
                  />
                  <div className="param-range-labels">
                    <span>{param.min}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              ))}
            </div>

            <Visualizer state={visState} color={cfg.color} />

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-n">{currentStats.allowed + currentStats.blocked}</div>
                <div className="stat-l">Total</div>
              </div>
              <div className="stat-card green">
                <div className="stat-n">{currentStats.allowed}</div>
                <div className="stat-l">Allowed</div>
              </div>
              <div className="stat-card red">
                <div className="stat-n">{currentStats.blocked}</div>
                <div className="stat-l">Blocked</div>
              </div>
              {currentStats.allowed + currentStats.blocked > 0 && (
                <div className="stat-card">
                  <div className="stat-n">
                    {Math.round((currentStats.allowed / (currentStats.allowed + currentStats.blocked)) * 100)}%
                  </div>
                  <div className="stat-l">Pass rate</div>
                </div>
              )}
            </div>

            <div className="action-btns">
              <button className="btn-primary" style={{ '--c': cfg.color }} onClick={() => sendRequest(false)}>
                Send 1 request
              </button>
              <button className="btn-secondary" onClick={() => sendRequest(true)}>
                Burst × 5
              </button>
              <button className="btn-ghost" onClick={resetAlgo}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="pg-right">
          <div className="pg-card">
            <div className="log-header">Request log</div>
            <div className="log-area">
              {currentLogs.length === 0 && (
                <div className="log-empty">No requests yet — hit "Send request" to start</div>
              )}
              {currentLogs.map((l, i) => (
                <div key={i} className={`log-line ${l.ok ? 'ok' : 'fail'}`}>
                  <span className="log-time">{l.t}</span>
                  <span className="log-msg">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pg-card tips-card">
            <div className="tips-header">Try these experiments</div>
            <div className="tips-list">
              <div className="tip">
                <span className="tip-icon">1</span>
                <span>Set capacity to 5, send burst of 5 — all pass. Send burst again immediately — all blocked.</span>
              </div>
              <div className="tip">
                <span className="tip-icon">2</span>
                <span>On Fixed Window, send max requests just before window resets — then burst again right after.</span>
              </div>
              <div className="tip">
                <span className="tip-icon">3</span>
                <span>Compare Sliding Window Log vs Counter — same params, observe how they differ on burst.</span>
              </div>
              <div className="tip">
                <span className="tip-icon">4</span>
                <span>Increase refill rate on Token Bucket — watch blocked requests recover faster.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Visualizer({ state, color }) {
  if (!state) return null

  if (state.type === 'tokens') {
    return (
      <div className="vis-box">
        <div className="vis-label">
          Bucket — <span style={{ color }}>{state.filled}</span>/{state.total} tokens
        </div>
        <div className="vis-slots">
          {Array.from({ length: state.total }).map((_, i) => (
            <div key={i} className={`slot ${i < state.filled ? 'filled' : 'empty'}`} style={{ '--c': color }} />
          ))}
        </div>
      </div>
    )
  }

  if (state.type === 'fixed') {
    return (
      <div className="vis-box">
        <div className="vis-label">
          Window — <span style={{ color }}>{state.count}</span>/{state.limit} used · resets in {state.resetIn}s
        </div>
        <div className="vis-slots">
          {Array.from({ length: state.limit }).map((_, i) => (
            <div key={i} className={`slot ${i < state.count ? 'filled' : 'empty'}`} style={{ '--c': color }} />
          ))}
        </div>
      </div>
    )
  }

  if (state.type === 'log') {
    return (
      <div className="vis-box">
        <div className="vis-label">
          Log — <span style={{ color }}>{state.active}</span>/{state.limit} in window
        </div>
        <div className="vis-slots">
          {Array.from({ length: state.limit }).map((_, i) => {
            const ts = state.timestamps[i]
            const age = ts ? Math.round((state.now - ts) / 1000) : null
            return (
              <div key={i} className={`slot ${ts ? 'filled' : 'empty'}`} style={{ '--c': color }}>
                {age !== null && <span className="slot-age">{age}s</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (state.type === 'counter') {
    const pct = Math.min(100, Math.round((state.estimated / state.limit) * 100))
    return (
      <div className="vis-box">
        <div className="vis-label">
          Estimated <span style={{ color }}>{state.estimated}</span>/{state.limit} requests
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${pct}%`,
              background: pct > 80 ? '#F87171' : color,
            }}
          />
        </div>
        <div className="counter-detail">
          <span>Prev window: {state.prevCount} ({state.overlap}% overlap)</span>
          <span>Current: {state.currCount}</span>
        </div>
      </div>
    )
  }

  return null
}
