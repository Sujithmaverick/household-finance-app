// Middleware to ensure the current user has a household
module.exports = function ensureHousehold(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.householdId) return res.status(403).json({ error: 'No household associated with this account.' });
  next();
};
