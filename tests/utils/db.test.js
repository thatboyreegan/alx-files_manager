import { expect, use, should } from "chai";
import { chaiHttp } from 'chai-http';
import {dbClient} from "../utils/db";

use(chaiHttp);
should();

describe('dbClient Utility', () => {

   before(async () => {
      await dbClient.users.deleteMany({});
      await dbClient.files.deleteMany({});
   });

   after(async () => {
      await dbClient.users.deleteMany({});
      await dbClient.users.deleteMany({});
   });

   it('dbClient is alive', () => {
    expect(dbClient.isAlive()).to.equal(true);
   });

   it('dbClient.nbUsers() returns the expected value', async () => {
    expect(dbClient.nbUsers()).to.equal(0);

    await dbClient.users.insertOne({ name: 'user1'});
    await dbClient.users.insertOne({ name: 'user2'});
    await dbClient.users.insertOne({ name: 'user3'});

    expect(dbClient.nbUsers()).to.equal(3);
   });

   it('dbClient.ndFiles() returns the expected value', async () => {
    expect(dbClient.nbFiles()).to.equal(0);

    await dbClient.files.insertOne({name: 'file1'});
    await dbClient.files.insertOne({name: 'file2'});
    await dbClient.files.insertOne({name: 'file3'});

    expect(dbClient.nbFiles()).to.equal(3);
   });
});