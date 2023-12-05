import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { mkdir, readFile, writeFile } from 'fs';
import mime from 'mime-types';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import tokenAuth from '../auth/TokenAuth';
import RequestBody from '../utils/CheckBody';
import {
  handleBadRequest,
  handleNotFound,
  handleUnauthorized,
} from '../utils/ErrorHandlers';

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
const PAGE_COUNT = 20;

const fileQueue = new Queue('fileQueue');

async function createFile(body, userId) {
  const {
    name, type, parentId, isPublic, data,
  } = body;

  const values = {
    userId,
    name,
    type,
    isPublic: isPublic || false,
    parentId: parentId || 0,
  };

  if (type === 'folder') {
    const result = await dbClient.files.insertOne({ ...values });

    return {
      id: result.insertedId,
      ...values,
    };
  }

  const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
  const filename = v4();

  await mkdir(FOLDER_PATH, { recursive: true }, (err, path) => {
    if (err) console.log(err);
    if (path) console.log(`Created directory: ${FOLDER_PATH}`);
  });

  await writeFile(
    `${FOLDER_PATH}/${filename}`,
    Buffer.from(data, 'base64'),
    (err) => {
      if (err) console.log(err);
    },
  );

  const newValues = {
    ...values,
    localPath: `${FOLDER_PATH}/${filename}`,
  };

  const result = await dbClient.files.insertOne({ ...newValues });

  return {
    id: result.insertedId,
    ...newValues,
  };
}

async function updateIsPublic(req, res, isPublic) {
  const user = await tokenAuth.getUser(req);
  if (!user) return handleUnauthorized(res);

  const { id } = req.params;

  const result = await dbClient.files.updateOne(
    { _id: new ObjectId(id), userId: user._id.toString() },
    {
      $set: {
        isPublic,
      },
    },
  );

  if (result.matchedCount === 0) return handleNotFound(res);

  const file = (
    await dbClient.files
      .find({ _id: new ObjectId(id), userId: user._id.toString() })
      .project(FILE_PROJECTION)
      .toArray()
  )[0];

  res.json(file);
  return null;
}

const FilesController = {
  async postUpload(req, res) {
    const user = await tokenAuth.getUser(req);
    if (!user) return handleUnauthorized(res);

    const requestBody = new RequestBody(req);
    const output = await requestBody.checkAll();

    if (output.error) {
      return handleBadRequest(res, output.error);
    }

    const file = await createFile(requestBody, user._id.toString());

    res.status(201);
    res.json(file);

    if (file.type === 'image') {
      fileQueue.add({ userId: user._id.toString(), fileId: file.id });
    }

    return null;
  },

  async getShow(req, res) {
    const user = await tokenAuth.getUser(req);
    if (!user) return handleUnauthorized(res);

    const file = await dbClient.files
      .find({
        _id: new ObjectId(req.params.id),
      })
      .project(FILE_PROJECTION)
      .toArray();

    if (file.length === 0 || file[0].userId !== user._id.toString()) {
      return handleNotFound(res);
    }

    res.json(file[0]);

    return null;
  },

  async getIndex(req, res) {
    const user = await tokenAuth.getUser(req);
    if (!user) return handleUnauthorized(res);

    let { parentId = 0, page = 0 } = req.query;

    parentId = parentId === '0' ? 0 : parentId;

    try {
      page = typeof page === 'string' ? Number(page) : page;
    } catch (error) {
      return handleBadRequest(res, 'Invalid page');
    }

    if (parentId !== 0) {
      try {
        if (
          !(await dbClient.files.findOne({
            _id: new ObjectId(parentId),
          }))
        ) {
          res.json([]);
          return null;
        }
      } catch (error) {
        console.log(error.toString());
        res.json([]);
        return null;
      }
    }

    const files = await dbClient.files
      .find({ parentId })
      .project(FILE_PROJECTION)
      .limit(PAGE_COUNT)
      .skip(PAGE_COUNT * page)
      .toArray();

    res.json(files);
    return null;
  },

  async putPublish(req, res) {
    await updateIsPublic(req, res, true);
  },

  async putUnpublish(req, res) {
    await updateIsPublic(req, res, false);
  },

  async getFile(req, res) {
    const { id } = req.params;

    const file = await dbClient.files.findOne({ _id: new ObjectId(id) });

    if (!file) return handleNotFound(res);

    if (!file.isPublic) {
      const user = await tokenAuth.getUser(req);
      if (!user || user._id.toString() !== file.userId) return handleNotFound(res);
    }

    if (file.type === 'folder') {
      return handleBadRequest(res, "A folder doesn't have content");
    }

    let { localPath } = file;

    if (file.type === 'image') {
      const { size } = req.query;

      if (size) localPath = `${localPath}_${size}`;
    }

    await readFile(localPath, (err, data) => {
      if (err) return handleNotFound(res);

      res.type(mime.contentType(file.name));
      res.send(data);

      return null;
    });

    return null;
  },
};

export default FilesController;
