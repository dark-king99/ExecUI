let socket = null;

export function connectOrderStream(onMessage, onStatusChange) {
  socket = new WebSocket("ws://localhost:8080");

  socket.onopen = () => {
    onStatusChange("connected");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  socket.onclose = () => {
    onStatusChange("disconnected");

    // auto-reconnect after 3s
    setTimeout(() => {
      connectOrderStream(onMessage, onStatusChange);
    }, 3000);
  };

  socket.onerror = () => {
    onStatusChange("error");
  };
}

export function disconnectOrderStream() {
  if (socket) socket.close();
}