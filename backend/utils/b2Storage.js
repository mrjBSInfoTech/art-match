import dotenv from "dotenv";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

let b2Client;

export const isB2Configured = () =>
  [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET",
    "B2_REGION",
    "B2_ENDPOINT",
  ].every((name) => Boolean(process.env[name]));

const getB2Client = () => {
  const required = [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET",
    "B2_REGION",
    "B2_ENDPOINT",
  ];

  const missing = required.find((name) => !process.env[name]);
  if (missing) {
    throw new Error(`Missing environment variable: ${missing}`);
  }

  if (!b2Client) {
    b2Client = new S3Client({
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
  }

  return b2Client;
};

export const uploadToB2 =
  async ({
    key,
    body,
    contentType =
      "application/octet-stream",
  }) => {
    await getB2Client().send(
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
    return getB2Client().send(
      new GetObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,
      }),
    );
  };

export const deleteFromB2 =
  async (key) => {
    await getB2Client().send(
      new DeleteObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,
      }),
    );
  };