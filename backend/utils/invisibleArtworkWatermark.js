import sharp from "sharp";

const BLOCK_SIZE = 8;
const QUANTIZATION_STEP = 36;
const MAGIC = 0xa73d;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PAYLOAD_BITS = 16 + 32 + 8;
const MINIMUM_REPETITIONS = 3;

const cosine = Array.from({ length: BLOCK_SIZE }, (_, frequency) =>
  Array.from({ length: BLOCK_SIZE }, (_, position) =>
    Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * BLOCK_SIZE)),
  ),
);
const scale = (frequency) =>
  frequency === 0 ? Math.sqrt(1 / BLOCK_SIZE) : Math.sqrt(2 / BLOCK_SIZE);
const carrier = { row: 2, column: 3 };
const latticeStep = QUANTIZATION_STEP / 2;

const getCarrierBasis = (row, column) =>
  scale(carrier.row) *
  scale(carrier.column) *
  cosine[carrier.row][row] *
  cosine[carrier.column][column];

const getLuminance = (data, info, x, y) => {
  const offset = (y * info.width + x) * info.channels;
  return (
    data[offset] * 0.299 +
    data[offset + 1] * 0.587 +
    data[offset + 2] * 0.114 -
    128
  );
};

const isBlockEligible = (data, info, blockX, blockY) => {
  const channelSums = [0, 0, 0];
  for (let row = 0; row < BLOCK_SIZE; row += 1) {
    for (let column = 0; column < BLOCK_SIZE; column += 1) {
      const offset =
        ((blockY + row) * info.width + blockX + column) * info.channels;
      channelSums[0] += data[offset];
      channelSums[1] += data[offset + 1];
      channelSums[2] += data[offset + 2];
    }
  }
  return channelSums.every((sum) => sum / 64 >= 8 && sum / 64 <= 247);
};

const readBlockCoefficient = (data, info, blockX, blockY) => {
  let coefficient = 0;
  for (let row = 0; row < BLOCK_SIZE; row += 1) {
    for (let column = 0; column < BLOCK_SIZE; column += 1) {
      coefficient +=
        getLuminance(data, info, blockX + column, blockY + row) *
        getCarrierBasis(row, column);
    }
  }
  return coefficient;
};

const writeBlockCoefficient = (data, info, blockX, blockY, difference) => {
  for (let row = 0; row < BLOCK_SIZE; row += 1) {
    for (let column = 0; column < BLOCK_SIZE; column += 1) {
      const offset =
        ((blockY + row) * info.width + blockX + column) * info.channels;
      const adjustment = difference * getCarrierBasis(row, column);
      for (let channel = 0; channel < 3; channel += 1) {
        data[offset + channel] = Math.max(
          0,
          Math.min(255, Math.round(data[offset + channel] + adjustment)),
        );
      }
    }
  }
};

const crc8 = (value) => {
  let crc = 0;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
};

const bytesToBits = (bytes) =>
  [...bytes].flatMap((byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >> (7 - index)) & 1),
  );

const createPayload = (code) => {
  const normalized = String(code).toUpperCase();
  if (
    normalized.length !== 5 ||
    [...normalized].some((character) => !ALPHABET.includes(character))
  ) {
    throw new Error("Invisible watermark code must be five supported characters.");
  }

  let encodedCode = 0;
  for (const character of normalized) {
    encodedCode = (encodedCode << 5) | ALPHABET.indexOf(character);
  }
  const prefix = Buffer.from([
    (MAGIC >> 8) & 0xff,
    MAGIC & 0xff,
    (encodedCode >> 24) & 0x01,
    (encodedCode >> 16) & 0xff,
    (encodedCode >> 8) & 0xff,
    encodedCode & 0xff,
  ]);
  return bytesToBits(Buffer.concat([prefix, Buffer.from([crc8(prefix)])]));
};

const createBlockOrder = (blocks) => {
  const order = Array.from({ length: blocks }, (_, index) => index);
  let seed = 0x4d41544c;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = random() % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
};

const forEachEligibleBlock = (data, info, callback) => {
  const blocksWide = Math.floor(info.width / BLOCK_SIZE);
  const blockCount = blocksWide * Math.floor(info.height / BLOCK_SIZE);
  const order = createBlockOrder(blockCount);
  let eligibleCount = 0;

  order.forEach((block, sequence) => {
    const blockX = (block % blocksWide) * BLOCK_SIZE;
    const blockY = Math.floor(block / blocksWide) * BLOCK_SIZE;
    if (!isBlockEligible(data, info, blockX, blockY)) return;
    callback(blockX, blockY, sequence);
    eligibleCount += 1;
  });
  return eligibleCount;
};

export const embedInvisibleArtworkWatermark = (pixels, code) => {
  const { data, info } = pixels;
  const bits = createPayload(code);
  const blockCount = forEachEligibleBlock(data, info, (blockX, blockY, sequence) => {
    const bit = bits[sequence % bits.length];
    const coefficient = readBlockCoefficient(data, info, blockX, blockY);
    const target =
      Math.round((coefficient - bit * latticeStep) / QUANTIZATION_STEP) *
        QUANTIZATION_STEP +
      bit * latticeStep;
    writeBlockCoefficient(
      data,
      info,
      blockX,
      blockY,
      target - coefficient,
    );
  });

  if (blockCount < bits.length * MINIMUM_REPETITIONS) {
    throw new Error(
      `Artwork image has insufficient detail for a redundant invisible watermark (${blockCount} eligible blocks).`,
    );
  }
  return pixels;
};

export const readInvisibleArtworkWatermark = async (source) => {
  const { data, info } = await sharp(source)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const votes = Array.from({ length: PAYLOAD_BITS }, () => [0, 0]);
  const blockCount = forEachEligibleBlock(data, info, (blockX, blockY, sequence) => {
    const bitIndex = sequence % PAYLOAD_BITS;
    const coefficient = readBlockCoefficient(data, info, blockX, blockY);
    const bit = Math.round(coefficient / latticeStep) & 1;
    votes[bitIndex][bit] += 1;
  });

  if (blockCount < PAYLOAD_BITS * MINIMUM_REPETITIONS) return null;
  const bits = votes.map(([zero, one]) => (one > zero ? 1 : 0));
  const bytes = Buffer.alloc(Math.ceil(PAYLOAD_BITS / 8));
  bits.forEach((bit, index) => {
    bytes[Math.floor(index / 8)] |= bit << (7 - (index % 8));
  });
  const prefix = bytes.subarray(0, 6);
  if (prefix.readUInt16BE(0) !== MAGIC || crc8(prefix) !== bytes[6]) return null;

  let encodedCode = 0;
  for (let index = 2; index < 6; index += 1) {
    encodedCode = (encodedCode << 8) | bytes[index];
  }
  const characters = [];
  for (let index = 0; index < 5; index += 1) {
    characters.unshift(ALPHABET[encodedCode & 0x1f]);
    encodedCode >>>= 5;
  }
  return characters.join("");
};
