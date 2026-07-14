// ─────────────────────────────────────────────
// Rate Limiter Algorithms — Pure JS implementations
// Each class is self-contained and can be used in Node.js or browser
// ─────────────────────────────────────────────

export class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity
    this.tokens = capacity
    this.refillRate = refillRate // tokens per second
    this.lastRefill = Date.now()
  }

  refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }

  allowRequest() {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return { allowed: true, remaining: Math.floor(this.tokens), info: `${Math.floor(this.tokens)} tokens left` }
    }
    return { allowed: false, remaining: 0, info: `Refills at ${this.refillRate} token/sec` }
  }

  getState() {
    this.refill()
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
    }
  }

  reset(capacity, refillRate) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.tokens = capacity
    this.lastRefill = Date.now()
  }
}

export class FixedWindowCounter {
  constructor(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.count = 0
    this.windowStart = Date.now()
  }

  allowRequest() {
    const now = Date.now()
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0
      this.windowStart = now
    }
    if (this.count < this.limit) {
      this.count++
      const remaining = this.limit - this.count
      const resetIn = ((this.windowMs - (now - this.windowStart)) / 1000).toFixed(1)
      return { allowed: true, remaining, info: `Window resets in ${resetIn}s` }
    }
    const resetIn = ((this.windowMs - (now - this.windowStart)) / 1000).toFixed(1)
    return { allowed: false, remaining: 0, info: `Window resets in ${resetIn}s` }
  }

  getState() {
    const now = Date.now()
    if (now - this.windowStart >= this.windowMs) {
      return { count: 0, limit: this.limit, windowStart: Date.now(), windowMs: this.windowMs }
    }
    return { count: this.count, limit: this.limit, windowStart: this.windowStart, windowMs: this.windowMs }
  }

  reset(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.count = 0
    this.windowStart = Date.now()
  }
}

export class SlidingWindowLog {
  constructor(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.log = []
  }

  allowRequest() {
    const now = Date.now()
    const cutoff = now - this.windowMs
    this.log = this.log.filter(t => t > cutoff)
    if (this.log.length < this.limit) {
      this.log.push(now)
      const remaining = this.limit - this.log.length
      return { allowed: true, remaining, info: `${this.log.length}/${this.limit} in window` }
    }
    const oldest = this.log[0]
    const retryIn = ((oldest + this.windowMs - now) / 1000).toFixed(1)
    return { allowed: false, remaining: 0, info: `Retry in ${retryIn}s` }
  }

  getState() {
    const now = Date.now()
    const cutoff = now - this.windowMs
    return {
      log: this.log.filter(t => t > cutoff),
      limit: this.limit,
      windowMs: this.windowMs,
      now,
    }
  }

  reset(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.log = []
  }
}

export class SlidingWindowCounter {
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

    if (elapsed >= 2 * this.windowMs) {
      // Idle for 2+ full windows — previous window is fully stale, drop both counts
      this.prevCount = 0
      this.currCount = 0
      this.windowStart = now
    } else if (elapsed >= this.windowMs) {
      // Crossed exactly one boundary — shift current into previous
      this.prevCount = this.currCount
      this.currCount = 0
      this.windowStart = now
    }

    const overlap = Math.max(0, 1 - (now - this.windowStart) / this.windowMs)
    const estimated = this.prevCount * overlap + this.currCount

    if (estimated < this.limit) {
      this.currCount++
      const remaining = Math.floor(this.limit - estimated - 1)
      return { allowed: true, remaining, info: `~${Math.ceil(estimated + 1)}/${this.limit} estimated` }
    }
    return { allowed: false, remaining: 0, info: `Estimated: ${Math.ceil(estimated)}/${this.limit}` }
  }

  getState() {
    const now = Date.now()
    const elapsed = now - this.windowStart
    const overlap = Math.max(0, 1 - elapsed / this.windowMs)
    return {
      prevCount: this.prevCount,
      currCount: this.currCount,
      windowStart: this.windowStart,
      windowMs: this.windowMs,
      estimated: Math.ceil(this.prevCount * overlap + this.currCount),
      limit: this.limit,
      overlap: Math.round(overlap * 100),
    }
  }

  reset(limit, windowSec) {
    this.limit = limit
    this.windowMs = windowSec * 1000
    this.prevCount = 0
    this.currCount = 0
    this.windowStart = Date.now()
  }
}
