# Rate Limiter Playground

An interactive playground to learn, test, and compare all major rate limiting algorithms in real-time.

**Live Demo:** https://aakashporwal1602.github.io/rate-limiter-playground

---

## Algorithms Covered

| Algorithm | Memory | Accuracy | Used By |
|---|---|---|---|
| Token Bucket | O(1) | High (allows burst) | Stripe, AWS, Twilio |
| Fixed Window Counter | O(1) | Medium (boundary burst) | Simple APIs |
| Sliding Window Log | O(n) | Highest (exact) | Precision-critical systems |
| Sliding Window Counter | O(1) | High (approximation) | Redis, Nginx, Cloudflare |

---

## Features

- **Interactive Playground** — adjust parameters and send requests in real-time
- **Live Visualization** — see token buckets, window counters, and log timestamps update live
- **Request Log** — full log of every request with allow/block status and reason
- **Algorithm Comparison** — side-by-side pros/cons and use-case guide
- **Node.js Code** — production-ready implementation for each algorithm

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/aakashporwal1602/rate-limiter-playground.git
cd rate-limiter-playground

# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## Project Structure

```
src/
├── algorithms.js          # Pure JS implementations (framework-agnostic, works in Node.js)
├── components/
│   └── Playground.jsx     # Interactive testing UI
├── App.jsx                # Main app with Compare + Code tabs
└── index.css              # Global styles
```

The `algorithms.js` file is **framework-agnostic** — you can import and use these classes directly in any Node.js project.

---

## Using in Node.js

```js
import { TokenBucket, FixedWindowCounter, SlidingWindowLog, SlidingWindowCounter } from './src/algorithms.js'

// Token Bucket — 10 tokens, refill 2 per second
const bucket = new TokenBucket(10, 2)

// Express middleware
app.use((req, res, next) => {
  const result = bucket.allowRequest()
  if (result.allowed) return next()
  res.status(429).json({ error: 'Rate limit exceeded', info: result.info })
})
```

---

## Deploy to GitHub Pages

1. Update `homepage` in `package.json` to your GitHub Pages URL
2. Update `base` in `vite.config.js` to match your repo name
3. Run `npm run deploy`

---

Built by [Aakash Porwal](https://aakashporwal1602.github.io/aakash-porwal-portfolio) — Senior Software Engineer specializing in distributed systems and real-time data platforms.
