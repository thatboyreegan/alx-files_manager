import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class TokenAuth {
  // constructor(req, tokenName) {
  //   this.req = req;
  //   this.tokenName = tokenName || 'x-token';
  // }

  init(req, tokenName) {
    this.req = req;
    this.tokenName = tokenName;
  }

  destroy() {
    this.req = null;
    this.tokenName = null;
    this.token = null;
    this.userId = null;
    this.user = null;
  }

  _getToken() {
    if (!this.req || !this.tokenName) return null;

    this.token = this.req.headers[this.tokenName];
    return this.token;
  }

  async _getUserId() {
    if (!this.token) return null;

    this.userId = await redisClient.get(`auth_${this.token}`);

    if (!this.userId) return null;

    return this.userId;
  }

  async getUser(req, tokenName = 'x-token') {
    this.init(req, tokenName);

    if (!this._getToken()) {
      this.destroy();
      return null;
    }

    if (!(await this._getUserId())) {
      this.destroy();
      return null;
    }

    const user = await dbClient.users.findOne({
      _id: new ObjectId(this.userId),
    });

    this.destroy();

    if (!user) return null;

    return user;
  }
}

const tokenAuth = new TokenAuth();

export default tokenAuth;
