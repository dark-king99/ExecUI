import app from "./app.js";
import prisma from "./config/database.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5555;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
async function ensureDatabase() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database not ready. Retrying...");
    setTimeout(ensureDatabase, 3000);
  }
}

ensureDatabase();