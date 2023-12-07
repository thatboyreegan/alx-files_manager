import { use, expect, should, request } from 'chai';
import { chaiHttp } from 'chai-http';
import { dbClient } from '../utils/db';
import { app } from '../server';
import { ObjectId } from 'mongodb';

use(chaiHttp);
should();

describe('tests for all the user endpoints', () => {
    describe('POST /users', () => {

        it('tests if email and id of created user is returned', async () => {
            const user = {
                email: "bob@dylan.com", 
                password: "toto1234!"
            }
            const res = await request(app).post('/users').send(user);
            const body = JSON.parse(res.text);
            const userId = body.id;
            const userMongo = await dbClient.users.findOne({
                _id: ObjectId(userId),
            })

            expect(body).to.have.property('id');
            expect(body.email).to.equal(user.email);
            expect(res.statusCode).to.equal(201);
            expect(userMongo).to.exist;
        });

        it('test for missing password', async () => {
            const user = {
                email: "bob@dylan.com", 
            };
            const res = await request(app).post('/users').send(user);
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: "Missing password" });
            expect(res.statusCode).to.equal(400);
        });

        it('test for missing email', async () => {
            const user = {
                password: "toto1234!", 
            };
            const res = await request(app).post('/users').send(user);
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: "Missing email" });
            expect(res.statusCode).to.equal(400);
        });

        it('tests if email and id of created user is returned', async () => {
            const user = {
                email: "bob@dylan.com", 
                password: "toto1234!"
            }
            const res = await request(app).post('/users').send(user);
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: 'Already exist'})
            expect(res.statusCode).to.equal(400);
        });

    });

    describe('GET /users/me', () => {
        const credentials = 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=';
        const token = '';

        before(async () => {
            const res = await request(app).get('/connect')
                .set('Authorization', credentials).send();
            const body = JSON.parse(res.text);
            token = body.token;
        });

        it('test for when no token is passed', async () => {
            const res = await request(app).get('/users/me').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: 'Unauthorized' });
            expect(res.statusCode).to.equal(401);
        });

        it('test for when a token is passed', async () => {
            const res = await request(app).get('/users/me').set('X-Token', token).send();
            const body = JSON.parse(res.text);
            const userId = body.id;
            const user = {
                email: "bob@dylan.com", 
                password: "toto1234!"
            };

            expect(body).to.equal({ id: userId, email: user.email });
            expect(res.statusCode).to.equal(401);
        });
    });
})