import { v4 } from 'uuid';
import redisClient from '../utils/redis';
import BasicAuth from '../auth/BasicAuth';
import tokenAuth from '../auth/TokenAuth';
import { handleUnauthorized } from '../utils/ErrorHandlers';

const AuthController = {
  async getConnect(req, res) {
    const { authorization } = req.headers;

    if (!authorization.startsWith('Basic ')) {
      return handleUnauthorized(res);
    }

    const auth = new BasicAuth(authorization.slice(6));
    const user = await auth.currentUser();

    if (!user) {
      return handleUnauthorized(res);
    }

    const token = v4();

    await redisClient.set(`auth_${token}`, user._id.toString(), 86400);

    res.json({ token });

    return null;
  },

  async getDisconnect(req, res) {
    const user = await tokenAuth.getUser(req);

    if (!user) {
      return handleUnauthorized(res);
    }

    await redisClient.del(`auth_${req.headers['x-token']}`);

    res.status(204);
    res.json();

    return null;
  },
};

export default AuthController;
