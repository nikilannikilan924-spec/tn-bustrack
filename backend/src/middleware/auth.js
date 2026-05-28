const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'tn-bus-tracker-secret');
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { auth };
