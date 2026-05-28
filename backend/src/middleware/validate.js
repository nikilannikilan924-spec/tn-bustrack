function validate(requiredFields, source = 'body') {
  return (req, res, next) => {
    const target = req[source] || {};
    const missing = requiredFields.filter((field) => target[field] === undefined || target[field] === null || target[field] === '');

    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(', ')}` });
    }

    return next();
  };
}

module.exports = { validate };
