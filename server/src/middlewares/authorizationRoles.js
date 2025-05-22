const CustomError = require("../util/CustomError");

const authorizationRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new CustomError(
          "You are unauthorized for this action. Please contact system administration.",
          401
        )
      );
    }
    next();
  };
};

module.exports = authorizationRoles;
