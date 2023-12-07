import { expect, should, use, request } from 'chai';
import { chaiHttp } from 'chai-http';
import { sinon } from 'sinon';
import { redisClient } from '../utils/redis';
import { app } from '../server';

use(chaiHttp);
should();

describe('tests for the authorization endpoints', () => {
    const credentials = 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=';
    const token = '';
    const userId = '';
    
    before(async () => {
        await redisClient.client.flushall('ASYNC');
    });

    after(async () => {
        await redisClient.client.flushall('ASYNC');
    });

    describe('GET /connect', async () => {
        it('tests for when no credentials are found', async () => {
            const res = await request(app).get('/connect').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: 'Unauthorized' });
            expect(res.statusCode).to.equal(401);
        });

        it('tests for when the credential are found', async () => {
            const spyRedisSet = sinon.spy(redisClient, 'set');
            const res = await request(app).get('/connect').set('Authorization', credentials).send();
            const body = JSON.parse(res.text)
            userId = body.id
            token = body.token;

            expect(spyRedisSet.calledOnceWithExactly(`auth_${token}`, userId, 24 * 60 * 60)).to.be.true;
            spyRedisSet.restore();
        });

        it('test if token exists in redis', async () => {
            const r_token = await redisClient.get(`auth_${token}`);
            expect(r_token).to.exist;
        });
    });

    describe('GET /disconnect', () => {
        it('test for no token provided', async () => {
            const res = await request(app).get('/disconnect').send();
            const body = JSON.parse(res.text);

            expect(body).to.equal({ error: 'Unauthorized' })
            expect(res.statusCode).to.equal(401);
        });

        it('test for when the token is provided', async () => {
            const res = await request(app).get('/disconnect').set('X-token', token).send();
            expect(res.text).to.equal('');
            expect(res.statusCode).to.equal(204);
        });

        it('tests if token doesnt exist in redis', async () => {
            const r_token = await redisClient.get(`auth_${token}`);
            expect(r_token).to.not.exist;
        });
    });
})