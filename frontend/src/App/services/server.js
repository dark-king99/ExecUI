const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket server running on ws://localhost:8080");

function randomOrder() {
  const statuses = ["Completed", "Processing", "Refunded"];
  return {
    id: "ORD-" + Math.floor(Math.random() * 99999),
    customer: ["Sarah", "Michael", "Daniel", "Olivia"][Math.floor(Math.random() * 4)],
    product: ["Pro Plan", "Enterprise Suite", "Marketing Toolkit"][Math.floor(Math.random() * 3)],
    amount: Math.floor(Math.random() * 1200) + 50,
    status: statuses[Math.floor(Math.random() * 3)],
    timestamp: Date.now(),
  };
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  const interval = setInterval(() => {
    ws.send(JSON.stringify(randomOrder()));
  }, 2500);

  ws.on("close", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});