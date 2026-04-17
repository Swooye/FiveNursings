/**
 * Global Request Logger Middleware
 */
const requestLogger = (req, res, next) => {
    const bodySnippet = req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT'
        ? JSON.stringify(req.body).slice(0, 50)
        : '-';
    console.log(`[REQ] ${req.method} ${req.url} | Body:`, bodySnippet);
    next();
};

module.exports = requestLogger;
