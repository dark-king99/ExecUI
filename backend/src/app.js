import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error.middleware.js";

import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/api", routes);
app.use(errorHandler);

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
export default app;