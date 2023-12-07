import { expect , use, should} from "chai";
import { chaiHttp } from 'chai-http';
import { redisClient } from "../utils/redis";

use(chaiHttp);
should();

describe('Tests for redisClient utility', () => {

    before(async () => {
        await redisClient.client.flushall('ASYNC');
    })

    after(async () => {
        await redisClient.client.flushall('ASYNC');
    })

    it('redisClient is alive', () => {
        expect(redisClient.isAlive()).to.equal(true);
    });

    it('retrieve a value that has not been set yet', async () => {
        expect(redisClient.get('First_testKey')).to.be.null;
    })

    it('set a key and retrieve the value', async () => {
        await redisClient.set('testKey1', 345, 10);
        expect(redisClient.get('testKey1')).to.equal(345);
    });

    it('set a key and retrieve after expiry', async () => {
        await redisClient.set('testKey2', 67, 1);
        await sleep(5);
        expect(redisClient.get('testKey2')).to.equal(null);
    });

    it('set a key and retrieve the value after deletion', async () => {
        await redisClient.set('testKey', 456, 10);
        await redisClient.del('testKey');
        expect(await redisClient.get('testKey')).to.be.null;
    })
})