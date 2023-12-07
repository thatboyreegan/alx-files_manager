import { expect, request, use, should } from 'chai';
import { chaiHttp } from 'chai-http';
import { dbClient } from '../utils/db';
import { app } from '../server';

use(chaiHttp);
should();

describe('tests for all the endpoints that show app status', () => {
    describe('GET /status', () => {
        it('returns the status of the redis and mongodb connection', async () => {
            const res = await request(app).get('/status').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ "redis": true, "db": true });
            expect(res.statusCode).to.equal(200);
        });
    });

    describe('GET /stats', () => {

        before(async () => {
            await dbClient.users.deleteMany({});
            await dbClient.files.deleteMany({});
        });

        it('returns the initial number of files and users as 0 for each', async () => {
            const res = request(app).get('/stats').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ "users": 0, "files": 0 });
            expect(res.statusCode).to.equal(200);
        });

        it('returns expected number of files and users after insertion', async () => {
            await dbClient.users.insertOne({ name: 'user1' });
            await dbClient.users.insertOne({ name: 'user2' });
            await dbClient.files.insertOne({ name: 'file1' });
            await dbClient.files.insertOne({ name: 'file2' });

            const res = request(app).get('/stats').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ "users": 2, "files": 2});
            expect(res.statusCode).to.equal(200);
        });
    });
});