import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const AppController = {
  getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.json({ redis: true, db: true });
    }
  },

  async getStats(req, res) {
    const numberUsers = await dbClient.nbUsers();
    const numberFiles = await dbClient.nbFiles();

    res.json({ users: numberUsers, files: numberFiles });
  },
};

export default AppController;
