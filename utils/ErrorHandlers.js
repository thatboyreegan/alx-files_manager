function handleUnauthorized(res) {
  res.status(401);
  res.json({ error: 'Unauthorized' });
}

function handleBadRequest(res, error) {
  res.status(400);
  res.json({ error });
}

function handleNotFound(res) {
  res.status(404);
  res.json({ error: 'Not found' });
}

export { handleBadRequest, handleNotFound, handleUnauthorized };
