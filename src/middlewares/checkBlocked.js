import createHttpError from 'http-errors';

const checkBlocked = (req, res, next) => {
  if (!req.user) {
    return next();
  }
  if (req.user.isBlocked) {
    return next(createHttpError(403, 'Your account is blocked'));
  }
  next();
};

export default checkBlocked;
