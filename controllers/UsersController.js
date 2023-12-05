import sha1 from 'sha1';
import dbClient from '../utils/db';
import tokenAuth from '../auth/TokenAuth';
import { handleUnauthorized, handleBadRequest } from '../utils/ErrorHandlers';

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return handleBadRequest(res, 'Missing email');
    }
    if (!password) {
      return handleBadRequest(res, 'Missing password');
    }
    const found = await dbClient.users.findOne({ email });

    if (found) {
      return handleBadRequest(res, 'Already exists');
    }

    const hashedPassword = sha1(password);

    const result = await dbClient.users.insertOne({
      email,
      password: hashedPassword,
    });

    res.status(201);
    res.json({ id: result.insertedId, email });

    return null;
  },

  async getMe(req, res) {
    const user = await tokenAuth.getUser(req);

    if (!user) {
      return handleUnauthorized(res);
    }

    res.json({ id: user._id, email: user.email });

    return null;
  },
};

export default UsersController;
