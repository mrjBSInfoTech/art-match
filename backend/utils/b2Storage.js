import dotenv from "dotenv";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

const required = [
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET",
  "B2_REGION",
  "B2_ENDPOINT",
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(
      `Missing environment variable: ${name}`,
    );
  }
}

export const b2Client =
  new S3Client({
    endpoint:
      process.env.B2_ENDPOINT,

    region:
      process.env.B2_REGION,

    credentials: {
      accessKeyId:
        process.env.B2_KEY_ID,

      secretAccessKey:
        process.env
          .B2_APPLICATION_KEY,
    },
  });

export const uploadToB2 =
  async ({
    key,
    body,
    contentType =
      "application/octet-stream",
  }) => {
    await b2Client.send(
      new PutObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,

        Body: body,

        ContentType:
          contentType,
      }),
    );

    return {
      key,
      bucket:
        process.env.B2_BUCKET,
    };
  };

export const getFromB2 =
  async (key) => {
    return b2Client.send(
      new GetObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,
      }),
    );
  };

export const deleteFromB2 =
  async (key) => {
    await b2Client.send(
      new DeleteObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,
      }),
    );
  };