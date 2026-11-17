import https from "node:https";
import dotenv from "dotenv";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

dotenv.config();

let b2Client;

const isPlaceholder = (val) =>
  !val ||
  /dev_placeholder|placeholder|your_|your\.|example|sample|changeme|set_me/i.test(
    String(val).trim(),
  );

export const isB2Configured = () =>
  [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET",
    "B2_REGION",
    "B2_ENDPOINT",
  ].every((name) => Boolean(process.env[name]) && !isPlaceholder(process.env[name]));

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
        String(process.env.B2_ENDPOINT).trim(),

      region:
        String(process.env.B2_REGION).trim(),

      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      requestHandler: {
        httpsAgent: new https.Agent({ keepAlive: false }),
        connectionTimeout: 15000,
        socketTimeout: 60000,
      },

      credentials: {
        accessKeyId:
          String(process.env.B2_KEY_ID).trim(),

        secretAccessKey:
          String(process.env.B2_APPLICATION_KEY).trim(),
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
    const normalizedBody = Buffer.isBuffer(body)
      ? body
      : ArrayBuffer.isView(body)
        ? Buffer.from(body.buffer, body.byteOffset, body.byteLength)
        : body instanceof ArrayBuffer
          ? Buffer.from(body)
          : body;

    const contentLength = Buffer.isBuffer(normalizedBody)
      ? normalizedBody.byteLength
      : typeof normalizedBody === "string"
        ? Buffer.byteLength(normalizedBody)
        : undefined;

    await getB2Client().send(
      new PutObjectCommand({
        Bucket:
          process.env.B2_BUCKET,

        Key: key,

        Body: normalizedBody,

        ContentType:
          contentType,

        ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
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

export const listB2Objects = async function* (prefix) {
  let continuationToken;
  do {
    const result = await getB2Client().send(
      new ListObjectsV2Command({
        Bucket: process.env.B2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of result.Contents || []) {
      if (object.Key && object.Key !== prefix) yield object;
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
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