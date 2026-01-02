-- SUPER ADMIN
INSERT INTO users (
    id, tenant_id, email, password_hash, full_name, role
) VALUES (
    gen_random_uuid(),
    NULL,
    'superadmin@system.com',
    '$2b$10$hashedpasswordhere',
    'System Admin',
    'super_admin'
);

-- TENANT
INSERT INTO tenants (
    id, name, subdomain, status, subscription_plan, max_users, max_projects
) VALUES (
    gen_random_uuid(),
    'Demo Company',
    'demo',
    'active',
    'pro',
    25,
    15
);
