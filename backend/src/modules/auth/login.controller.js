import { loginUser } from "./login.service.js";

export async function login(req, res) {
  try {
    const { email, password, employeeId, mfaCode } = req.body;
    const meta = {
      ipAddress: req.ip ?? req.headers["x-forwarded-for"] ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    };
    const result = await loginUser({ email, password, employeeId, mfaCode }, meta);
    res.json(result);
  } catch (err) {
    const status = err.message.includes("suspended") ? 403 : 401;
    res.status(status).json({ message: err.message });
  }
}
