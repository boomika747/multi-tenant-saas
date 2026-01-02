import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

export const createProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { name, description, status = "active" } = req.body;
    const { tenantId, userId } = req.user;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const tenantResult = await pool.query(
      "SELECT max_projects FROM tenants WHERE id = $1",
      [tenantId]
    );

    const maxProjects = tenantResult.rows[0].max_projects;

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    if (Number(countResult.rows[0].count) >= maxProjects) {
      return res.status(403).json({
        success: false,
        message: "Project limit reached",
      });
    }

    const projectId = uuidv4();

    const result = await pool.query(
      `
      INSERT INTO projects (id, tenant_id, name, description, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, name, description, status, created_at
      `,
      [projectId, tenantId, name, description, status, userId]
    );

    return res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        createdBy: userId,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};
export const listProjects = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { tenantId } = req.user;
    const { status, search, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const values = [tenantId];
    let idx = 2;

    let baseQuery = `
      FROM projects p
      JOIN users u ON p.created_by = u.id
      WHERE p.tenant_id = $1
    `;

    if (status) {
      baseQuery += ` AND p.status = $${idx++}`;
      values.push(status);
    }

    if (search) {
      baseQuery += ` AND p.name ILIKE $${idx++}`;
      values.push(`%${search}%`);
    }

    const projectsResult = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.created_at,
        u.id AS creator_id,
        u.full_name AS creator_name,
        (
          SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id
        ) AS task_count,
        (
          SELECT COUNT(*) FROM tasks t 
          WHERE t.project_id = p.id AND t.status = 'completed'
        ) AS completed_task_count
      ${baseQuery}
      ORDER BY p.created_at DESC
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
        projects: projectsResult.rows,
        total: Number(countResult.rows[0].count),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / limit),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("LIST PROJECTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list projects",
    });
  }
};
export const updateProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { projectId } = req.params;
    const { name, description, status } = req.body;
    const { tenantId, userId, role } = req.user;

    const projectResult = await pool.query(
      "SELECT tenant_id, created_by FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    if (project.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (role !== "tenant_admin" && project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to update this project",
      });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (status) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    await pool.query(
      `
      UPDATE projects
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
      `,
      [...values, projectId]
    );

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};
export const deleteProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { projectId } = req.params;
    const { tenantId, userId, role } = req.user;

    const projectResult = await pool.query(
      "SELECT tenant_id, created_by FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    if (project.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (role !== "tenant_admin" && project.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this project",
      });
    }

    // Delete tasks under this project
    await pool.query(
      "DELETE FROM tasks WHERE project_id = $1",
      [projectId]
    );

    // Delete project
    await pool.query(
      "DELETE FROM projects WHERE id = $1",
      [projectId]
    );

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};



