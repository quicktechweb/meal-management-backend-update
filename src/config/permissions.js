const PERMISSIONS = [
  // ─── User Management ───────────────────────────────────────
  { name: "View Users", slug: "users.view", module: "Users" },
  { name: "Create User", slug: "users.create", module: "Users" },
  { name: "Edit User", slug: "users.edit", module: "Users" },
  { name: "Delete User", slug: "users.delete", module: "Users" },

  // ─── Role Management ───────────────────────────────────────
  { name: "View Roles", slug: "roles.view", module: "Roles" },
  { name: "Create Role", slug: "roles.create", module: "Roles" },
  { name: "Edit Role", slug: "roles.edit", module: "Roles" },
  { name: "Delete Role", slug: "roles.delete", module: "Roles" },

  // ─── Permission Management ──────────────────────────────────
  { name: "View Permissions", slug: "permissions.view", module: "Permissions" },
  {
    name: "Create Permission",
    slug: "permissions.create",
    module: "Permissions",
  },
  { name: "Edit Permission", slug: "permissions.edit", module: "Permissions" },
  {
    name: "Delete Permission",
    slug: "permissions.delete",
    module: "Permissions",
  },

  // ─── Dashboard ─────────────────────────────────────────────
  { name: "View Dashboard", slug: "dashboard.view", module: "Dashboard" },

  // ─── Orders ────────────────────────────────────────────────
  { name: "View Meal Orders", slug: "orders.view", module: "Orders" },
  { name: "Edit Order", slug: "orders.edit", module: "Orders" },
  { name: "Delete Order", slug: "orders.delete", module: "Orders" },

  // ─── Reports ───────────────────────────────────────────────
  // { name: "View Reports", slug: "reports.view", module: "Reports" },
  // { name: "Export Reports", slug: "reports.export", module: "Reports" },

  // ─── Settings ──────────────────────────────────────────────
  { name: "View Profile", slug: "profile.view", module: "Profile" },
  { name: "Edit Profile", slug: "profile.edit", module: "Profile" },

  // service
  {
    name: "View Services",
    slug: "services.view",
    module: "Services",
  },

  {
    name: "Edit Services",
    slug: "services.edit",
    module: "Services",
  },
  {
    name: "View Routine",
    slug: "routine.view",
    module: "Routine",
  },

  {
    name: "Edit Routine",
    slug: "routine.edit",
    module: "Routine",
  },
];
const DEFAULT_ROLE_PERMISSIONS = {
  institute: ["all"],
  user: ["routine.view", "settings.view", "orders.view"],
};

module.exports = { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS };
