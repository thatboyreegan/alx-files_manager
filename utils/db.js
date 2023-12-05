import MongoClient from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
    this.port = process.env.DB_PORT ? process.env.DB_PORT : 27017;
    this.db_name = process.env.DB_DATABASE
      ? process.env.DB_DATABASE
      : 'file_manager';

    const url = `mongodb://${this.host}:${this.port}`;

    this.client = MongoClient(url, { useUnifiedTopology: true });

    (async () => {
      this.db = (await this.client).db(this.db_name);
      this.users = this.db.collection('users');
      this.files = this.db.collection('files');
    })();
  }

  isAlive() {
    try {
      this.db.command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    const usersCount = await this.users.countDocuments({});

    return usersCount;
  }

  async nbFiles() {
    const filesCount = await this.files.countDocuments({});

    return filesCount;
  }
}

const dbClient = new DBClient();

export default dbClient;
