
const ALLOWED_ROLES = [
  "admin",
  "manager",
  "employee",
  "user",
];

/**
 * Role authorization middleware.
 *
 * Must run after protect middleware.
 *
 * Example:
 * router.get(
 *   "/admin-only",
 *   protect,
 *   allowRoles("admin"),
 *   handler
 * );
 */
function allowRoles(...roles) {
  if (roles.length === 0) {
    throw new Error(
      "allowRoles requires at least one permitted role."
    );
  }

  const invalidRoles = roles.filter(
    (role) => !ALLOWED_ROLES.includes(role)
  );

  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid role configuration: ${invalidRoles.join(", ")}`
    );
  }

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Please log in first.",
      });
    }

    const userRole = req.user.role || "user";

    if (!ALLOWED_ROLES.includes(userRole)) {
      return res.status(403).json({
        message: "Your account has an invalid role.",
      });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}

module.exports = { allowRoles };
