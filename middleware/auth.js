const jwt = require('jsonwebtoken');

const secret = 'secretkey'; // In production, use environment variable

module.exports = {
  auth: (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send('No token provided');
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return res.status(401).send('Invalid token');
      req.user = decoded;
      next();
    });
  },
  authorize: (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).send('Access denied');
    }
    next();
  }
};