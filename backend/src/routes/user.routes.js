import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  addUserToTenant,
  listTenantUsers,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// Add user (tenant_admin only)
router.post("/tenants/:tenantId/users", authMiddleware, addUserToTenant);

// List users
router.get("/tenants/:tenantId/users", authMiddleware, listTenantUsers);

// Update user
router.put("/users/:userId", authMiddleware, updateUser);

// Delete user
router.delete("/users/:userId", authMiddleware, deleteUser);

export default router;
