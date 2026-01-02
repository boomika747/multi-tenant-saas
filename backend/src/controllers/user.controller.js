

import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

export const addUserToTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { role, tenantId: userTenantId } = req.user;
    const { email, password, fullName, role: newRole = "user" } = req.body;

    // Authorization
    if (role !== "tenant_admin" || tenantId !== userTenantId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add users",
      });
    }

    // Check subscription limit
    const tenantResult = await pool.query(
      "SELECT max_users FROM tenants WHERE id = $1",
      [tenantId]
    );
    const maxUsers = tenantResult.rows[0].max_users;

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
      [tenantId]
    );
    if (Number(countResult.rows[0].count) >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: "User limit reached for this subscription",
      });
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [userId, tenantId, email, hashedPassword, fullName, newRole]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: userId,
        email,
        fullName,
        role: newRole,
        tenantId,
        isActive: true,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};
// LIST USERS (already implemented by you)
export const listTenantUsers = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { tenantId: userTenantId } = req.user;

    if (tenantId !== userTenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to users",
      });
    }

    const {
      search = "",
      role,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM users
      WHERE tenant_id = $1
    `;

    const values = [tenantId];
    let idx = 2;

    if (search) {
      baseQuery += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    if (role) {
      baseQuery += ` AND role = $${idx}`;
      values.push(role);
      idx++;
    }

    const usersResult = await pool.query(
      `
      SELECT id, email, full_name, role, is_active, created_at
      ${baseQuery}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      values
    );

    return res.status(200).json({
      success: true,
      data: {
        users: usersResult.rows,
        total: Number(countResult.rows[0].count),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / limit),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// UPDATE USER (STUB FOR NOW)

export const updateUser = async (req, res) => {
  try {
    // 🔒 SAFETY CHECK
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { userId } = req.params;
    const { userId: currentUserId, role, tenantId } = req.user;
    const { fullName, role: newRole, isActive } = req.body;

    // Fetch target user
    const userResult = await pool.query(
      "SELECT id, tenant_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const targetUser = userResult.rows[0];

    // Tenant isolation
    if (targetUser.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Permission checks
    if (currentUserId !== userId && role !== "tenant_admin") {
      return res.status(403).json({
        success: false,
        message: "Not allowed to update this user",
      });
    }

    if ((newRole || isActive !== undefined) && role !== "tenant_admin") {
      return res.status(403).json({
        success: false,
        message: "Only tenant admin can update role or status",
      });
    }

    // Build update dynamically
    const fields = [];
    const values = [];
    let idx = 1;

    if (fullName) {
      fields.push(`full_name = $${idx++}`);
      values.push(fullName);
    }
    if (newRole) {
      fields.push(`role = $${idx++}`);
      values.push(newRole);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
      `,
      [...values, userId]
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};


export const deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { userId } = req.params;
    const { userId: currentUserId, role, tenantId } = req.user;

    // Only tenant admin
    if (role !== "tenant_admin") {
      return res.status(403).json({
        success: false,
        message: "Only tenant admin can delete users",
      });
    }

    // Cannot delete self
    if (userId === currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete yourself",
      });
    }

    // Fetch user
    const userResult = await pool.query(
      "SELECT id, tenant_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tenant isolation
    if (userResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Unassign tasks
    await pool.query(
      "UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1",
      [userId]
    );

    // Delete user
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};



