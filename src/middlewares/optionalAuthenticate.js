// middlewares/optionalAuthenticate.js
import * as authServices from '../contacts/auth.js';

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authorization = req.get('Authorization');
    if (!authorization) return next();

    const [bearer, token] = authorization.split(' ');
    if (bearer !== 'Bearer' || !token) return next();

    const session = await authServices.findSessionByAccessToken(token);
    if (!session) return next();
    if (new Date() > session.accessTokenValidUntil) return next();

    const user = await authServices.findUser({ _id: session.userId });
    if (!user) return next();
    if (user.isBlocked) return next();

    req.user = user;
  } catch (err) {
    console.error('optionalAuthenticate error:', err);
  }
  next();
};

export default optionalAuthenticate;
