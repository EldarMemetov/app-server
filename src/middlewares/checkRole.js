import createHttpError from 'http-errors';

export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.accessRole;
    if (!allowedRoles.includes(userRole)) {
      return next(
        createHttpError(403, 'Access denied: insufficient permissions'),
      );
    }
    next();
  };
};
