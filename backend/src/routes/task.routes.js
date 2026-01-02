import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createTask,
  listProjectTasks,
  updateTaskStatus,
   updateTask,
     deleteTask,
} from "../controllers/task.controller.js";

const router = express.Router();

router.post("/projects/:projectId/tasks", authMiddleware, createTask);
router.get("/projects/:projectId/tasks", authMiddleware, listProjectTasks);
router.patch("/tasks/:taskId/status", authMiddleware, updateTaskStatus);
router.put("/tasks/:taskId", authMiddleware, updateTask);
router.delete("/tasks/:taskId", authMiddleware, deleteTask);

export default router;
