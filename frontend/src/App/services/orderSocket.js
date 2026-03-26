/**
 * orderSocket — Real-time order stream via WebSocket.
 * WebSocket URL is configured via VITE_WS_URL environment variable.
 */

const WS_URL = import.meta.env.VITE_WS_URL ?? '';

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

function getReconnectDelay() {
  // Exponential back-off: 2s, 4s, 8s … capped at 30s
  return Math.min(2000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
}

export function connectOrderStream(onMessage, onStatusChange) {
  if (!WS_URL) {
    console.warn('[orderSocket] VITE_WS_URL is not set — order stream disabled.');
    onStatusChange('disconnected');
    return;
  }

  function connect() {
    socket = new WebSocket(`${WS_URL}/orders/stream`);

    socket.onopen = () => {
      reconnectAttempts = 0;
      onStatusChange('connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('[orderSocket] Failed to parse message:', err);
      }
    };

    socket.onclose = () => {
      onStatusChange('disconnected');
      const delay = getReconnectDelay();
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      onStatusChange('error');
    };
  }

  connect();
}

export function disconnectOrderStream() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null; // prevent auto-reconnect on manual close
    socket.close();
    socket = null;
  }
}
