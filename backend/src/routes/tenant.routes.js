import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getTenantDetails,
} from "../controllers/tenant.controller.js";

const router = express.Router();

// Get tenant details
router.get("/:tenantId", authMiddleware, getTenantDetails);

export default router;
