// Tiny in-memory rate limiter. Good enough for a single server instance.
// For several instances, replace it with Redis (e.g. rate-limit-redis).
export const createRateLimiter = ({ windowMs, max }) => {
    const hits = new Map()

    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of hits) {
            if (now > entry.resetAt) hits.delete(key)
        }
    }, windowMs).unref()

    return {
        // Returns true when the call is allowed, false when the limit is reached
        hit(key) {
            const now = Date.now()
            const entry = hits.get(key)

            if (!entry || now > entry.resetAt) {
                hits.set(key, { count: 1, resetAt: now + windowMs })
                return true
            }

            if (entry.count >= max) return false

            entry.count += 1
            return true
        }
    }
}

// Express middleware factory
export const limitRequests = (limiter, keyFn = (req) => req.ip) => (req, res, next) => {
    if (limiter.hit(String(keyFn(req)))) return next()

    return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a while and try again.'
    })
}