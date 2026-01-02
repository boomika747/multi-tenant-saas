import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

export const createTask = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { projectId } = req.params;
    const {
      title,
      description,
      assignedTo,
      priority = "medium",
      dueDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Get project + tenant
    const projectResult = await pool.query(
      "SELECT tenant_id FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const tenantId = projectResult.rows[0].tenant_id;

    // Verify assignment user belongs to same tenant
    if (assignedTo) {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND tenant_id = $2",
        [assignedTo, tenantId]
      );

      if (userResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Assigned user does not belong to this tenant",
        });
      }
    }

    const taskId = uuidv4();

    const result = await pool.query(
      `
      INSERT INTO tasks (
        id, project_id, tenant_id, title,
        description, priority, assigned_to, due_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, title, status, priority, created_at
      `,
      [
        taskId,
        projectId,
        tenantId,
        title,
        description,
        priority,
        assignedTo || null,
        dueDate || null,
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};
export const listProjectTasks = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { projectId } = req.params;
    const { tenantId } = req.user;
    const {
      status,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (page - 1) * limit;

    // Verify project belongs to tenant
    const projectResult = await pool.query(
      "SELECT tenant_id FROM projects WHERE id = $1",
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (projectResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    let baseQuery = `
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
    `;

    const values = [projectId];
    let idx = 2;

    if (status) {
      baseQuery += ` AND t.status = $${idx++}`;
      values.push(status);
    }

    if (priority) {
      baseQuery += ` AND t.priority = $${idx++}`;
      values.push(priority);
    }

    if (assignedTo) {
      baseQuery += ` AND t.assigned_to = $${idx++}`;
      values.push(assignedTo);
    }

    if (search) {
      baseQuery += ` AND t.title ILIKE $${idx++}`;
      values.push(`%${search}%`);
    }

    const tasksResult = await pool.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        u.id AS assigned_user_id,
        u.full_name AS assigned_user_name,
        u.email AS assigned_user_email
      ${baseQuery}
      ORDER BY
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        t.due_date ASC NULLS LAST
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
        tasks: tasksResult.rows,
        total: Number(countResult.rows[0].count),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(countResult.rows[0].count / limit),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error("LIST TASKS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list tasks",
    });
  }
};
export const updateTaskStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { taskId } = req.params;
    const { status } = req.body;
    const { tenantId } = req.user;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Verify task belongs to tenant
    const taskResult = await pool.query(
      "SELECT tenant_id FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (taskResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const result = await pool.query(
      `
      UPDATE tasks
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, status, updated_at
      `,
      [status, taskId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE TASK STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update task status",
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { taskId } = req.params;
    const { tenantId } = req.user;
    const {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
    } = req.body;

    // Verify task belongs to tenant
    const taskResult = await pool.query(
      "SELECT tenant_id FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (taskResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // If assignedTo provided, verify same tenant
    if (assignedTo) {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND tenant_id = $2",
        [assignedTo, tenantId]
      );

      if (userResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Assigned user does not belong to this tenant",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assigned_to = $5,
        due_date = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, title, description, status, priority, due_date, updated_at
      `,
      [
        title || null,
        description || null,
        status || null,
        priority || null,
        assignedTo ?? null,
        dueDate ?? null,
        taskId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE TASK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};
export const deleteTask = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { taskId } = req.params;
    const { tenantId } = req.user;

    // Verify task belongs to tenant
    const taskResult = await pool.query(
      "SELECT tenant_id FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (taskResult.rows[0].tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TASK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};
