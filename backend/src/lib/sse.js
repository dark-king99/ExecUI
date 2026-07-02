/**
 * Server-Sent Events hub for real-time notifications (zero deps).
 * One process, in-memory registry: userId -> Set<res>. notify()/notifyMany()
 * publish here after writing to the DB, so a connected client's bell updates
 * instantly instead of waiting for the next poll.
 */
const clients = new Map(); // userId -> Set<res>

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

export function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

/** Push an event to every open connection a user has (multi-tab safe). */
export function publish(userId, event, data = {}) {
  const set = clients.get(userId);
  if (!set?.size) return;
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(frame); } catch { removeClient(userId, res); }
  }
}

export function publishMany(userIds, event, data = {}) {
  for (const id of new Set(userIds)) publish(id, event, data);
}

/** Express handler that upgrades the response into an SSE stream. */
export function sseHandler(req, res) {
  const userId = req.user.userId;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // don't let reverse proxies buffer the stream
  });
  res.write(`event: connected\ndata: {}\n\n`);
  addClient(userId, res);

  // Heartbeat keeps intermediaries from closing the idle connection.
  const beat = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { /* handled by close */ }
  }, 25_000);

  req.on("close", () => {
    clearInterval(beat);
    removeClient(userId, res);
  });
}
