import Queue from 'bull/lib/queue';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import { writeFile } from 'fs';
import dbClient from './utils_1/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  if (!job.data.fileId) return done(new Error('Missing fileId'));
  if (!job.data.userId) return done(new Error('Missing userId'));

  const file = await dbClient.files.findOne({
    _id: new ObjectId(job.data.fileId),
    userId: job.data.userId,
  });

  if (!file) return done(new Error('File not found'));

  try {
    const widths = [500, 250, 100];
    const thumbnails = await Promise.all(
      widths.map((width) => imageThumbnail(file.localPath, { width })),
    );

    thumbnails.forEach(async (thumbnail, index) => {
      await writeFile(
        `${file.localPath}_${widths[index]}`,
        thumbnail,
        (err) => {
          if (err) console.log(err);
        },
      );
    });
  } catch (error) {
    console.log(error);
  }

  return done();
});
