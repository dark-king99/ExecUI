import * as svc from "./assistant.service.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const chat = handle((req) =>
  svc.chat(uid(req), tid(req), req.body.message, req.body.history ?? [])
);
