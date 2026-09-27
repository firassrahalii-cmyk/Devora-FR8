// Devora VIP - API Rate Limiter
// Production-ready rate limiting middleware for Node.js

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.message = options.message || 'Too many requests, please try again later.';
    this.headers = options.headers !== false;
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.resetTime > this.windowMs) {
        this.store.delete(key);
      }
    }
  }

  getClientKey(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  middleware() {
    return (req, res, next) => {
      const key = this.getClientKey(req);
      const now = Date.now();
      let entry = this.store.get(key);

      if (!entry || now - entry.resetTime >= this.windowMs) {
        entry = { count: 0, resetTime: now };
        this.store.set(key, entry);
      }

      entry.count++;

      if (this.headers) {
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - entry.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil((entry.resetTime + this.windowMs) / 1000));
      }

      if (entry.count > this.maxRequests) {
        if (this.headers) {
          res.setHeader('Retry-After', Math.ceil((entry.resetTime + this.windowMs - now) / 1000));
        }
        return res.status(429).json({ error: this.message });
      }

      next();
    };
  }

  reset(key) {
    this.store.delete(key);
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Express/Fastify compatible usage:
// const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
// app.use(limiter.middleware());

// Standalone demo:
if (require.main === module) {
  const http = require('http');
  const limiter = new RateLimiter({ windowMs: 10000, maxRequests: 5 });

  const server = http.createServer((req, res) => {
    const key = limiter.getClientKey(req);
    const entry = limiter.store.get(key) || { count: 0 };
    entry.count++;
    limiter.store.set(key, entry);

    if (entry.count > 5) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again in 10 seconds.' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': String(5 - entry.count)
    });
    res.end(JSON.stringify({ message: 'OK', requests: entry.count }));
  });

  server.listen(3000, () => console.log('Rate limiter demo on http://localhost:3000'));
}

module.exports = RateLimiter;
