import express from "express";
import cors from "cors";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";

import authRoutes from "./routes/auth.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

/* ---------- HEALTH CHECK ---------- */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: "connected",
  });
});

/* ---------- ROUTES ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api", userRoutes);
app.use("/api", projectRoutes);
app.use("/api", taskRoutes);



export default app;


