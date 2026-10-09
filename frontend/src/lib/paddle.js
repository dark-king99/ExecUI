import { initializePaddle } from "@paddle/paddle-js";

let paddlePromise;

export function paddleConfigurationError() {
  const environment = import.meta.env.VITE_PADDLE_ENV?.trim();
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  if (environment !== "sandbox") {
    return "Paddle sandbox is not configured. Set VITE_PADDLE_ENV=sandbox and restart the frontend.";
  }
  if (!token) {
    return "Paddle is not configured. Set VITE_PADDLE_CLIENT_TOKEN to your sandbox client-side token.";
  }
  if (!token.startsWith("test_")) {
    return "Paddle sandbox requires a client-side token beginning with test_. Do not use the server API key here.";
  }
  return null;
}

export function initializePaddleClient() {
  const error = paddleConfigurationError();
  if (error) return Promise.reject(new Error(error));
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN.trim(),
      environment: "sandbox",
    }).then((paddle) => {
      if (!paddle) throw new Error("Paddle.js did not initialize. Check the sandbox client token and browser network access.");
      return paddle;
    }).catch((error) => {
      paddlePromise = null;
      throw error;
    });
  }
  return paddlePromise;
}
