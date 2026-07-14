import { useState } from 'react'
import Playground from './components/Playground'
import './App.css'

const ALGOS = [
  {
    id: 'token',
    name: 'Token Bucket',
    badge: 'Most common',
    companies: 'Stripe · AWS · Twilio',
    color: '#7C5CFF',
    pros: ['Allows burst traffic', 'Smooth refill rate', 'Memory efficient O(1)'],
    cons: ['Burst up to full capacity at once', 'Tricky to tune refill rate'],
    useCases: 'API gateways, payment APIs, general-purpose rate limiting',
    complexity: 'O(1) time · O(1) space',
  },
  {
    id: 'fixed',
    name: 'Fixed Window',
    badge: 'Simplest',
    companies: 'Early-stage APIs',
    color: '#22D3EE',
    pros: ['Extremely simple to implement', 'Predictable reset times', 'O(1) memory'],
    cons: ['Boundary burst problem (2x at edges)', 'Not smooth — abrupt resets'],
    useCases: 'Simple APIs, internal tools, when precision doesn\'t matter',
    complexity: 'O(1) time · O(1) space',
  },
  {
    id: 'swlog',
    name: 'Sliding Window Log',
    badge: 'Most accurate',
    companies: 'Precision-critical systems',
    color: '#F5B841',
    pros: ['No boundary burst problem', 'Exact rate enforcement', 'Precise retry-after'],
    cons: ['High memory usage O(requests)', 'Slower under high load'],
    useCases: 'High-security APIs, financial transactions, when precision is critical',
    complexity: 'O(n) time · O(n) space',
  },
  {
    id: 'swcount',
    name: 'Sliding Window Counter',
    badge: 'Best balance',
    companies: 'Redis · Cloudflare · Kong',
    color: '#34D399',
    pros: ['Near-accurate (weighted approximation)', 'O(1) memory', 'Fast and scalable'],
    cons: ['Approximation — not 100% exact', 'Slightly complex logic'],
    useCases: 'Production APIs at scale, CDNs, distributed rate limiting with Redis',
    complexity: 'O(1) time · O(1) space',
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('playground')

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">RL</div>
            <div>
              <div className="brand-title">Rate Limiter Playground</div>
              <div className="brand-sub">Learn · Test · Compare</div>
            </div>
          </div>
          <nav className="nav-tabs">
            <button className={activeTab === 'playground' ? 'active' : ''} onClick={() => setActiveTab('playground')}>Playground</button>
            <button className={activeTab === 'compare' ? 'active' : ''} onClick={() => setActiveTab('compare')}>Compare</button>
            <button className={activeTab === 'code' ? 'active' : ''} onClick={() => setActiveTab('code')}>Node.js Code</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {activeTab === 'playground' && <Playground algos={ALGOS} />}
        {activeTab === 'compare' && <Compare algos={ALGOS} />}
        {activeTab === 'code' && <NodeCode />}
      </main>

      <footer className="footer">
        <span>Built by <a href="https://aakashporwal1602.github.io/aakash-porwal-portfolio" target="_blank" rel="noreferrer">Aakash Porwal</a></span>
        <span className="footer-mono">rate limiting · distributed systems · backend engineering</span>
      </footer>
    </div>
  )
}

function Compare({ algos }) {
  return (
    <div className="compare-page">
      <div className="page-header">
        <h1>Algorithm Comparison</h1>
        <p>Choose the right rate limiting algorithm for your use case</p>
      </div>
      <div className="compare-grid">
        {algos.map(a => (
          <div className="compare-card" key={a.id} style={{ '--accent': a.color }}>
            <div className="cc-top">
              <div className="cc-badge" style={{ color: a.color, borderColor: a.color }}>{a.badge}</div>
              <h2 className="cc-name">{a.name}</h2>
              <div className="cc-companies">{a.companies}</div>
              <div className="cc-complexity">{a.complexity}</div>
            </div>
            <div className="cc-section">
              <div className="cc-label green">Pros</div>
              {a.pros.map(p => <div className="cc-item" key={p}>+ {p}</div>)}
            </div>
            <div className="cc-section">
              <div className="cc-label red">Cons</div>
              {a.cons.map(c => <div className="cc-item red" key={c}>− {c}</div>)}
            </div>
            <div className="cc-usecase">
              <span className="cc-label">Use when</span>
              <p>{a.useCases}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NodeCode() {
  const [copied, setCopied] = useState(null)

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const snippets = [
    {
      id: 'token',
      title: 'Token Bucket',
      color: '#7C5CFF',
      code: `// Token Bucket Rate Limiter
// Install: npm install express

class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity
    this.tokens = capacity
    this.refillRate = refillRate // tokens per second
    this.lastRefill = Date.now()
  }

  refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    )
    this.lastRefill = now
  }

  allowRequest() {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false // 429 Too Many Requests
  }
}

// Express middleware
const bucket = new TokenBucket(10, 2) // 10 tokens, refill 2/sec

app.use((req, res, next) => {
  if (bucket.allowRequest()) return next()
  res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' })
})`,
    },
    {
      id: 'fixed',
      title: 'Fixed Window Counter',
      color: '#22D3EE',
      code: `// Fixed Window Counter Rate Limiter
class FixedWindowCounter {
  constructor(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.count = 0
    this.windowStart = Date.now()
  }

  allowRequest() {
    const now = Date.now()
    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0
      this.windowStart = now
    }
    if (this.count < this.limit) {
      this.count++
      return true
    }
    return false // 429 Too Many Requests
  }
}

// Per-user rate limiting with Map
const counters = new Map()

function getRateLimiter(userId, limit = 5, windowSec = 60) {
  if (!counters.has(userId)) {
    counters.set(userId, new FixedWindowCounter(limit, windowSec))
  }
  return counters.get(userId)
}

// Express middleware
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'] || req.ip
  const limiter = getRateLimiter(userId)
  if (limiter.allowRequest()) return next()
  res.status(429).json({ error: 'Rate limit exceeded' })
})`,
    },
    {
      id: 'swlog',
      title: 'Sliding Window Log',
      color: '#F5B841',
      code: `// Sliding Window Log Rate Limiter
class SlidingWindowLog {
  constructor(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.log = [] // stores request timestamps
  }

  allowRequest() {
    const now = Date.now()
    const cutoff = now - this.windowMs

    // Remove timestamps outside the window — O(n)
    this.log = this.log.filter(t => t > cutoff)

    if (this.log.length < this.limit) {
      this.log.push(now)
      return true
    }

    // Tell client when they can retry
    const retryAfter = Math.ceil(
      (this.log[0] + this.windowMs - now) / 1000
    )
    this.retryAfter = retryAfter
    return false // 429 Too Many Requests
  }
}

// Express middleware with Retry-After header
const limiter = new SlidingWindowLog(5, 10)

app.use((req, res, next) => {
  if (limiter.allowRequest()) return next()
  res.set('Retry-After', limiter.retryAfter)
  res.status(429).json({
    error: 'Too many requests',
    retryAfter: limiter.retryAfter
  })
})`,
    },
    {
      id: 'swcount',
      title: 'Sliding Window Counter',
      color: '#34D399',
      code: `// Sliding Window Counter Rate Limiter
// Used by Cloudflare, Kong — best memory efficiency

class SlidingWindowCounter {
  constructor(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.prevCount = 0
    this.currCount = 0
    this.windowStart = Date.now()
  }

  allowRequest() {
    const now = Date.now()
    const elapsed = now - this.windowStart

    if (elapsed >= this.windowMs) {
      // Shift windows forward
      this.prevCount = this.currCount
      this.currCount = 0
      this.windowStart = now
    }

    // Weighted estimate: how much of the previous window overlaps?
    const overlap = 1 - (now - this.windowStart) / this.windowMs
    const estimated = this.prevCount * overlap + this.currCount

    if (estimated < this.limit) {
      this.currCount++
      return true
    }
    return false // 429 Too Many Requests
  }
}

// Redis implementation — Fixed Window Counter (production)
// NOTE: INCR + EXPIRE is a Fixed Window, not a true Sliding Window Counter.
//
// async function allowRequest(redis, key, limit, windowSec) {
//   const count = await redis.incr(key)
//   if (count === 1) await redis.expire(key, windowSec) // set TTL only on first hit
//   return count <= limit
// }`,
    },
  ]

  return (
    <div className="code-page">
      <div className="page-header">
        <h1>Node.js Implementation</h1>
        <p>Production-ready code for each algorithm. Copy and use directly.</p>
      </div>
      {snippets.map(s => (
        <div className="code-block" key={s.id}>
          <div className="code-block-header">
            <div className="code-block-title" style={{ color: s.color }}>{s.title}</div>
            <button className="copy-btn" onClick={() => copy(s.id, s.code)}>
              {copied === s.id ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="code-pre"><code>{s.code}</code></pre>
        </div>
      ))}
      <div className="code-note">
        <strong>For distributed systems:</strong> Use Redis as the backing store so rate limits are shared across multiple server instances. A <strong>Fixed Window</strong> counter maps directly to Redis INCR + EXPIRE. A true Sliding Window Counter needs two window keys with weighted overlap (or a Lua script / sorted-set for Sliding Window Log) to stay atomic.
      </div>
    </div>
  )
}
