import sha1 from 'sha1';
import { expect } from 'chai';
import request from 'request';
import dbClient from '../utils/db';

/* eslint no-unused-expressions: "off" */

const PORT = process.env.PORT ? process.env.PORT : 5000;
const BASE_URL = `http://localhost:${PORT}`;

const SLEEP_TIME = 50; // ms

const BASE64_ENCODED_CREDENTIALS = 'dGVzdEB0c2V0Lnh5ejpwYXNzd29yZDE=';
const testUser = {
  email: 'test@tset.xyz',
  password: sha1('password1'),
};

const FILE_PROJECTION = {
  _id: 0,
  id: '$_id',
  name: 1,
  type: 1,
  userId: 1,
  isPublic: 1,
  parentId: 1,
  localPath: 1,
};

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

function connect(auth, callback) {
  request.get(
    `${BASE_URL}/connect`,
    {
      headers: {
        authorization: `Basic ${auth}`,
      },
    },
    callback,
  );
}

function upload(file, token, callback) {
  request.post(
    `${BASE_URL}/files`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-token': token,
      },
      body: JSON.stringify(file),
    },
    callback,
  );
}

describe('FilesController', () => {
  const testFile = {
    name: 'test_file.txt',
    data: 'SGVsbG8gdGVzdCE=',
    type: 'file',
  };

  const testFolder = {
    name: 'test_folder',
    type: 'folder',
  };

  before(async () => {
    await dbClient.client;
    await dbClient.users.insertOne({ ...testUser });

    connect(BASE64_ENCODED_CREDENTIALS, (error, response, body) => {
      testUser.token = JSON.parse(body).token;
    });
    await sleep(SLEEP_TIME);
  });

  after(async () => {
    await dbClient.users.deleteMany({ email: testUser.email });
  });

  describe('postUpload (POST /files)', () => {
    before(async () => {
      await dbClient.client;
      await dbClient.files.deleteMany({ name: testFile.name });
      await dbClient.files.deleteMany({ name: testFolder.name });
    });

    afterEach(async () => {
      await dbClient.files.deleteOne({ name: testFile.name });
      await dbClient.files.deleteOne({ name: testFolder.name });
    });

    it('valid text file', async () => {
      upload(testFile, testUser.token, async (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(201);

        const createdFile = (
          await dbClient.files
            .find({ name: testFile.name })
            .project(FILE_PROJECTION)
            .toArray()
        )[0];

        createdFile.id = String(createdFile.id);

        expect(JSON.parse(body)).to.deep.equal(createdFile);
      });

      await sleep(SLEEP_TIME);
    });

    it('valid folder', async () => {
      upload(testFolder, testUser.token, async (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(201);

        const createdFolder = (
          await dbClient.files
            .find({ name: testFolder.name })
            .project(FILE_PROJECTION)
            .toArray()
        )[0];

        createdFolder.id = String(createdFolder.id);

        expect(JSON.parse(body)).to.deep.equal(createdFolder);
      });
      await sleep(SLEEP_TIME);
    });

    it('invalid token', async () => {
      upload(testFolder, 'invalid token', async (error, response, body) => {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(401);
        expect(body).to.equal(JSON.stringify({ error: 'Unauthorized' }));
      });
      await sleep(SLEEP_TIME);
    });

    it('file missing name', async () => {
      upload(
        { type: 'file', data: testFile.data },
        testUser.token,
        async (error, response, body) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(400);
          expect(body).to.equal(JSON.stringify({ error: 'Missing name' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('file missing type', async () => {
      upload(
        { name: testFile.name, data: testFile.data },
        testUser.token,
        async (error, response, body) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(400);
          expect(body).to.equal(JSON.stringify({ error: 'Missing type' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('file missing data', async () => {
      upload(
        { name: testFile.name, type: 'file' },
        testUser.token,
        async (error, response, body) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(400);
          expect(body).to.equal(JSON.stringify({ error: 'Missing data' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('folder with data', async () => {
      upload(
        { ...testFolder, data: testFile.data },
        testUser.token,
        async (error, response, body) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(201);
          expect(JSON.parse(body).data).to.be.undefined;
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('file with non-existing parentId', async () => {
      upload(
        { ...testFile, parentId: '656f511d73ddef4865140f46' },
        testUser.token,
        async (error, response, body) => {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(400);
          expect(body).to.equal(JSON.stringify({ error: 'Parent not found' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('file with parentId not belonging to a folder', async () => {
      upload(testFile, testUser.token, (error, response, body) => {
        const { id } = JSON.parse(body);

        upload(
          { ...testFile, parentId: id },
          testUser.token,
          async (error, response, body) => {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(400);
            expect(body).to.equal(
              JSON.stringify({ error: 'Parent is not a folder' }),
            );
          },
        );
      });
      await sleep(SLEEP_TIME);
    });

    it('file with valid parentId', async () => {
      upload(testFolder, testUser.token, (error, response, body) => {
        const { id } = JSON.parse(body);

        upload(
          { ...testFile, parentId: id },
          testUser.token,
          async (error, response, body) => {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(201);
            expect(JSON.parse(body).parentId).to.equal(id);
          },
        );
      });
      await sleep(SLEEP_TIME);
    });
  });

  describe('getShow (GET /files/:id)', () => {
    function showFile(id, token, callback) {
      request.get(
        `${BASE_URL}/files/${id}`,
        {
          headers: {
            'x-token': token,
          },
        },
        callback,
      );
    }

    after(async () => {
      await dbClient.files.deleteMany({ name: testFile.name });
    });

    it('valid file id', async () => {
      upload(testFile, testUser.token, (error, response, body) => {
        const expectedBody = JSON.parse(body);
        showFile(expectedBody.id, testUser.token, (error, response, body) => {
          expect(JSON.parse(body)).to.deep.equal(expectedBody);
        });
      });
      await sleep(SLEEP_TIME);
    });

    it('invalid file id', async () => {
      showFile(
        '656f5a61a2da955e60f290a8',
        testUser.token,
        (error, response, body) => {
          expect(response.statusCode).to.equal(404);
          expect(body).to.equal(JSON.stringify({ error: 'Not found' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('invalid token', async () => {
      showFile(testFile, 'invalid token', (error, response, body) => {
        expect(response.statusCode).to.equal(401);
        expect(body).to.equal(JSON.stringify({ error: 'Unauthorized' }));
      });
      await sleep(SLEEP_TIME);
    });
  });

  describe('getIndex (GET /files)', () => {
    function getFiles(token, callback, parentId = 0, page = 0) {
      request.get(`${BASE_URL}/files?parentId=${parentId}&page=${page}`, {
        headers: {
          'x-token': token,
        },
        callback,
      });
    }

    let validParentId;

    before(async () => {
      await dbClient.client;

      const testFolderIndex = {
        name: 'test_folder_index',
        type: 'folder',
        parentId: 0,
      };
      const folders = [];
      for (; folders.length < 30; folders.push({ ...testFolderIndex }));
      await dbClient.files.insertMany(folders);

      const parentId = (
        await dbClient.files.findOne({ name: 'test_folder_index' })
      )._id.toString();

      const testFileIndex = {
        name: 'test_file_index',
        type: 'file',
        data: 'T25l',
        parentId,
      };

      const files = [];
      for (; files.length < 30; files.push({ ...testFileIndex }));
      await dbClient.files.insertMany(files);

      validParentId = parentId;
    });

    after(async () => {
      await dbClient.files.deleteMany({ name: 'test_folder_index' });
      await dbClient.files.deleteMany({ name: 'test_file_index' });
    });

    it('valid token. page = 0, parentId = 0', async () => {
      getFiles(testUser.token, (error, response, body) => {
        const parsedBody = JSON.parse(body);
        expect(parsedBody.length).to.equal(20);
      });
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 1, parentId = 0', async () => {
      getFiles(
        testUser.token,
        (error, response, body) => {
          const parsedBody = JSON.parse(body);
          expect(parsedBody.length).to.equal(20);
        },
        0,
        1,
      );
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 0, valid parentId', async () => {
      getFiles(
        testUser.token,
        (error, response, body) => {
          const parsedBody = JSON.parse(body);
          expect(parsedBody.length).to.equal(20);
        },
        validParentId,
        0,
      );
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 1, valid parentId', async () => {
      getFiles(
        testUser.token,
        (error, response, body) => {
          const parsedBody = JSON.parse(body);
          expect(parsedBody.length).to.equal(10);
        },
        validParentId,
        1,
      );
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 10, valid parentId', async () => {
      getFiles(
        testUser.token,
        (error, response, body) => {
          expect(body).to.equal('[]');
        },
        validParentId,
        10,
      );
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 0, invalid parentId', async () => {
      getFiles(
        testUser.token,
        (error, response, body) => {
          expect(body).to.equal('[]');
        },
        '656f6c77a05063ae3011d313',
        0,
      );
      await sleep(SLEEP_TIME);
    });

    it('valid token. page = 0, parentId not belonging to folder', async () => {
      const invalidParentId = (
        await dbClient.files.findOne({ type: 'file' })
      )._id.toString();

      getFiles(
        testUser.token,
        (error, response, body) => {
          expect(body).to.equal('[]');
        },
        invalidParentId,
        0,
      );
      await sleep(SLEEP_TIME);
    });

    it('invalid token. page = 0, parentId not belonging to folder', async () => {
      const invalidParentId = (
        await dbClient.files.findOne({ type: 'file' })
      )._id.toString();

      getFiles(
        'invalid token',
        (error, response, body) => {
          expect(body).to.equal(JSON.stringify({ error: 'Unauthorized' }));
        },
        invalidParentId,
        0,
      );
      await sleep(SLEEP_TIME);
    });
  });

  describe('putPublish (PUT /files/:id/publish)', () => {
    let validId;

    before(async () => {
      await dbClient.client;

      const testFilePublish = {
        name: 'test_file_publish',
        type: 'file',
        data: 'T25l',
        isPublic: false,
        userId: (
          await dbClient.users.findOne({ email: testUser.email })
        )._id.toString(),
      };

      const result = await dbClient.files.insertOne({ ...testFilePublish });
      validId = result.insertedId;
    });

    after(async () => {
      await dbClient.files.deleteOne({ name: 'test_file_publish' });
    });

    function publish(id, token, callback) {
      request.put(
        `${BASE_URL}/files/${id}/publish`,
        {
          headers: {
            'x-token': token,
          },
        },
        callback,
      );
    }

    it('valid token. valid id', async () => {
      publish(validId, testUser.token, (error, response, body) => {
        expect(JSON.parse(body).isPublic).to.be.true;
      });
      await sleep(SLEEP_TIME);
    });

    it('valid token. invalid id', async () => {
      publish(
        '656f71a453698fc178c4f73a',
        testUser.token,
        (error, response, body) => {
          expect(response.statusCode).to.equal(404);
          expect(body).to.equal(JSON.stringify({ error: 'Not found' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('invalid token. valid id', async () => {
      publish(validId, 'invalid token', (error, response, body) => {
        expect(response.statusCode).to.equal(401);
        expect(body).to.equal(JSON.stringify({ error: 'Unauthorized' }));
      });
      await sleep(SLEEP_TIME);
    });
  });

  describe('putUnpublish (PUT /files/:id/unpublish)', () => {
    let validId;

    before(async () => {
      await dbClient.client;

      const testFilePublish = {
        name: 'test_file_unpublish',
        type: 'file',
        data: 'T25l',
        isPublic: true,
        userId: (
          await dbClient.users.findOne({ email: testUser.email })
        )._id.toString(),
      };

      const result = await dbClient.files.insertOne({ ...testFilePublish });
      validId = result.insertedId;
    });

    after(async () => {
      await dbClient.files.deleteOne({ name: 'test_file_unpublish' });
    });

    function unpublish(id, token, callback) {
      request.put(
        `${BASE_URL}/files/${id}/unpublish`,
        {
          headers: {
            'x-token': token,
          },
        },
        callback,
      );
    }

    it('valid token. valid id', async () => {
      unpublish(validId, testUser.token, (error, response, body) => {
        expect(JSON.parse(body).isPublic).to.be.false;
      });
      await sleep(SLEEP_TIME);
    });

    it('valid token. invalid id', async () => {
      unpublish(
        '656f71a453698fc178c4f73a',
        testUser.token,
        (error, response, body) => {
          expect(response.statusCode).to.equal(404);
          expect(body).to.equal(JSON.stringify({ error: 'Not found' }));
        },
      );
      await sleep(SLEEP_TIME);
    });

    it('invalid token. valid id', async () => {
      unpublish(validId, 'invalid token', (error, response, body) => {
        expect(response.statusCode).to.equal(401);
        expect(body).to.equal(JSON.stringify({ error: 'Unauthorized' }));
      });
      await sleep(SLEEP_TIME);
    });
  });
});
