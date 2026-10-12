import { initializePaddle } from "@paddle/paddle-js";

let paddlePromise;
let initializedCustomerId = null;

export function paddleConfigurationError() {
  const environment = import.meta.env.VITE_PADDLE_ENV?.trim();
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  if (environment !== "sandbox" && environment !== "production") {
    return "Paddle environment is not configured. Set VITE_PADDLE_ENV=sandbox or production and restart the frontend.";
  }
  if (!token) {
    return "Paddle is not configured. Set VITE_PADDLE_CLIENT_TOKEN to the client-side token for the selected environment.";
  }
  const validToken = environment === "sandbox" ? token.startsWith("test_") : token.startsWith("live_");
  if (!validToken) {
    const prefix = environment === "sandbox" ? "test_" : "live_";
    return `Paddle ${environment} requires a client-side token beginning with ${prefix}. Do not use the server API key here.`;
  }
  return null;
}

export async function initializePaddleClient(customerId) {
  const error = paddleConfigurationError();
  if (error) throw new Error(error);
  const validCustomerId = typeof customerId === "string" && customerId.startsWith("ctm_")
    ? customerId
    : null;

  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN.trim(),
      environment: import.meta.env.VITE_PADDLE_ENV.trim(),
      ...(validCustomerId ? { pwCustomer: { id: validCustomerId } } : {}),
    }).then((instance) => {
      if (!instance) throw new Error("Paddle.js did not initialize. Check the client token and browser network access.");
      initializedCustomerId = validCustomerId;
      return instance;
    }).catch((error) => {
      paddlePromise = null;
      initializedCustomerId = null;
      throw error;
    });
  } else if (validCustomerId !== initializedCustomerId) {
    const instance = await paddlePromise;
    instance.Update({ pwCustomer: validCustomerId ? { id: validCustomerId } : {} });
    initializedCustomerId = validCustomerId;
  }
  return paddlePromise;
}
