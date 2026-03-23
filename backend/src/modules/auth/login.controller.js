import { loginUser } from "./login.service.js";

export async function login(req, res, _next) {
  try {

    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    res.json(result);

  } catch (err) {
    res.status(401).json({ message: "Invalid credentials" });
  }
}