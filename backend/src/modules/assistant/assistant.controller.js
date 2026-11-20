import * as svc from "./assistant.service.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

export const chat = handle((req) =>
  svc.chat({
    userId: uid(req),
    tenantId: tid(req),
    role: req.user.role,
    access: req.access,
    message: req.body?.message,
    history: req.body?.history,
  })
);

export const streamChat = async (req, res) => {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  let disconnected = false;
  res.on("close", () => { disconnected = true; });

  try {
    await svc.chat({
      userId: uid(req),
      tenantId: tid(req),
      role: req.user.role,
      access: req.access,
      message: req.body?.message,
      history: req.body?.history,
      onEvent: async (event) => {
        if (!disconnected && !res.destroyed && !res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      },
    });
  } catch (err) {
    if (!disconnected && !res.destroyed && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: "error",
        message: err.status ? err.message : "ExecAI could not complete this run.",
      })}\n\n`);
    }
  } finally {
    if (!res.destroyed && !res.writableEnded) res.end();
  }
};

export const listRuns = handle((req) =>
  svc.listRuns({ userId: uid(req), limit: req.query?.limit })
);

export const getRun = handle((req) =>
  svc.getRun({ userId: uid(req), runId: req.params.runId })
);
