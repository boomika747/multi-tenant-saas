import pool from "../config/db.js";

export const getTenantDetails = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { role, tenantId: userTenantId } = req.user;

    // Authorization check
    if (role !== "super_admin" && tenantId !== userTenantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to tenant",
      });
    }

    // Get tenant info
    const tenantResult = await pool.query(
      `
      SELECT id, name, subdomain, status, subscription_plan,
             max_users, max_projects, created_at
      FROM tenants
      WHERE id = $1
      `,
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    // Stats
    const usersCount = await pool.query(
      "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
      [tenantId]
    );

    const projectsCount = await pool.query(
      "SELECT COUNT(*) FROM projects WHERE tenant_id = $1",
      [tenantId]
    );

    const tasksCount = await pool.query(
      "SELECT COUNT(*) FROM tasks WHERE tenant_id = $1",
      [tenantId]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...tenantResult.rows[0],
        stats: {
          totalUsers: Number(usersCount.rows[0].count),
          totalProjects: Number(projectsCount.rows[0].count),
          totalTasks: Number(tasksCount.rows[0].count),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tenant details",
    });
  }
};
