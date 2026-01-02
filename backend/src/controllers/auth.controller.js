import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";
import { generateToken } from "../utils/jwt.js";

/**
 * REGISTER TENANT + ADMIN
 */
export const registerTenant = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      tenantName,
      subdomain,
      adminEmail,
      adminPassword,
      adminFullName,
    } = req.body;

    if (!tenantName || !subdomain || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await client.query("BEGIN");

    // Check subdomain
    const existingTenant = await client.query(
      "SELECT id FROM tenants WHERE subdomain = $1",
      [subdomain]
    );

    if (existingTenant.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Subdomain already exists",
      });
    }

    const tenantId = uuidv4();
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create tenant (FREE PLAN DEFAULT)
    await client.query(
      `
      INSERT INTO tenants 
      (id, name, subdomain, status, subscription_plan, max_users, max_projects)
      VALUES ($1, $2, $3, 'active', 'free', 5, 3)
      `,
      [tenantId, tenantName, subdomain]
    );

    // Create admin user
    await client.query(
      `
      INSERT INTO users
      (id, tenant_id, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5, 'tenant_admin')
      `,
      [adminId, tenantId, adminEmail, hashedPassword, adminFullName]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Tenant registered successfully",
      data: {
        tenantId,
        subdomain,
        adminUser: {
          id: adminId,
          email: adminEmail,
          fullName: adminFullName,
          role: "tenant_admin",
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Tenant registration failed",
    });
  } finally {
    client.release();
  }
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
  try {
    const { email, password, tenantSubdomain } = req.body;
console.log("LOGIN REQUEST:", req.body);

    const tenantResult = await pool.query(
      "SELECT id FROM tenants WHERE subdomain = $1 AND status = 'active'",
      [tenantSubdomain]
    );

    if (tenantResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    const tenantId = tenantResult.rows[0].id;

    const userResult = await pool.query(
      `
      SELECT id, email, password_hash, full_name, role, is_active
      FROM users
      WHERE email = $1 AND tenant_id = $2
      `,
      [email, tenantId]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken({
      userId: user.id,
      tenantId,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId,
        },
        token,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/**
 * GET CURRENT USER
 */
export const getMe = async (req, res) => {
  try {
    const { userId, tenantId, role } = req.user;

    const result = await pool.query(
      `
      SELECT id, email, full_name, role, is_active
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        tenantId,
        role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};
