import express from "express";
import {
  registerTenant,
  login,
  getMe,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register-tenant", registerTenant);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

export default router;
