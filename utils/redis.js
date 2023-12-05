import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient().on('error', (error) => {
      console.log(error);
    });
    this.client.get = promisify(this.client.get);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const value = await this.client.get(key).then((value) => value);

    return value;
  }

  async set(key, value, duration) {
    this.client.set(key, value);
    this.client.expire(key, duration);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
