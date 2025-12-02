function extractApiKey(req) {
  const headerKey = req.get('x-api-key');
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }

  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.body?.apiKey) {
    return String(req.body.apiKey).trim();
  }

  if (req.query?.apiKey) {
    return String(req.query.apiKey).trim();
  }

  return null;
}

module.exports = {
  extractApiKey
};


