import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import sharp from "sharp";
import { createCertificateQr } from "../../frontend/src/utils/certificateQr.js";

const source = fs.readFileSync(new URL("../utils/certificates.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace(/^export /gm, "");

function loadService({ queryHandler, connectionFactory } = {}) {
  const calls = [];
  const events = [];
  const connection = connectionFactory?.(calls);
  const db = {
    promise: () => ({
      query: async (sql, params = []) => {
        calls.push({ sql, params });
        return queryHandler ? queryHandler(sql, params, calls) : [[]];
      },
      getConnection: async () => connection,
    }),
  };
  const context = {
    db,
    randomBytes,
    QRCode,
    URL,
    process: { env: { FRONTEND_URL: "https://artmatch.example/" } },
    publishChatMessage: (...args) => events.push(args),
    console: { error() {} },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.service = { publishCertificate, getSellerCertificate, processDueCertificateDeliveries, getBuyerCertificate, getPublicCertificate, certificateWithQr, certificateUrl, reserveCertificateIdentity, getSellerOrderCertificateIdentity, revokeCertificateAccessForReturn };`,
    context,
  );
  return { service: context.service, calls, events };
}

test("certificate publication rejects unsafe SVG before database access", async () => {
  const current = loadService();
  for (const svg of ["", "<svg><script>alert(1)</script></svg>", "<svg onclick='run()'></svg>"]) {
    await assert.rejects(current.service.publishCertificate(3, 21, "RN-2026-ABCD", svg),
      (error) => error.status === 400);
  }
  assert.deepEqual(current.calls, []);
});

test("seller publication requires an approved owned artwork and stores one immutable certificate", async () => {
  const sqlCalls = [];
  const current = loadService({
    queryHandler: async (sql, params) => {
      sqlCalls.push({ sql, params });
      if (/SELECT a\.artwork_id/.test(sql)) return [[{ artwork_id: 21 }]];
      if (/INSERT IGNORE INTO marketplace_certificate_identity/.test(sql)) return [{ affectedRows: 1 }];
      if (/SELECT public_token/.test(sql)) return [[{ public_token: "a".repeat(64) }]];
      if (/INSERT IGNORE INTO marketplace_certificate/.test(sql)) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });
  const result = await current.service.publishCertificate(3, 21, "RN-2026-ABCD", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
  assert.equal(result.certificateId, "RN-2026-ABCD");
  assert.equal(result.published, true);
  assert.equal(result.verificationUrl, `https://artmatch.example/buyer/certificate/verify/${"a".repeat(64)}`);
  assert.match(result.svg, /certificate-verification-qr/);
  assert.match(sqlCalls[0].sql, /a\.student_id = \?/);
  assert.match(sqlCalls[0].sql, /request_status.*verified.*approved/i);
  const insert = sqlCalls.find((call) => /INSERT IGNORE INTO marketplace_certificate \(/.test(call.sql));
  assert.deepEqual(JSON.parse(JSON.stringify(insert.params.slice(0, 3))), [21, 3, "RN-2026-ABCD"]);
});

test("buyer certificate access is order-owned, available upon delivery, and blocked after a completed return", async () => {
  let completed = 0;
  const current = loadService({
    queryHandler: async (sql) => {
      assert.match(sql, /o\.customer_id = \?/);
      assert.match(sql, /o\.status = 'Delivered'/);
      assert.match(sql, /o\.delivered_at <= CURRENT_TIMESTAMP/);
      assert.match(sql, /o\.paid_at IS NOT NULL/);
      assert.match(sql, /r\.status IN \('Completed', 'Received'\)/);
      return [[{ certificate_svg: "<svg></svg>", return_completed: completed, access_ready: 1 }]];
    },
  });
  assert.equal(await current.service.getBuyerCertificate(7, 51), "<svg></svg>");
  completed = 1;
  await assert.rejects(current.service.getBuyerCertificate(7, 51),
    (error) => error.status === 410 && /revoked because this product was returned/i.test(error.message));
});

function deliveryConnection(calls, { alreadySent = false, completedReturn = false } = {}) {
  return {
    async beginTransaction() { calls.push({ action: "BEGIN" }); },
    async commit() { calls.push({ action: "COMMIT" }); },
    async rollback() { calls.push({ action: "ROLLBACK" }); },
    release() { calls.push({ action: "RELEASE" }); },
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/^SELECT oi\.order_item_id/.test(sql)) {
        assert.match(sql, /o\.delivered_at <= CURRENT_TIMESTAMP/);
        return [[{ order_item_id: 51, order_id: 41, artwork_id: 21, title: "Portrait",
          customer_id: 7, seller_id: 3 }]];
      }
      if (/^SELECT order_item_id FROM marketplace_certificate_delivery/.test(sql)) {
        return [alreadySent ? [{ order_item_id: 51 }] : []];
      }
      if (/^SELECT certificate_id FROM marketplace_certificate/.test(sql)) return [[{ certificate_id: "RN-2026-ABCD" }]];
      if (/^SELECT r\.return_request_id/.test(sql)) return [completedReturn ? [{ return_request_id: 81 }] : []];
      if (/^INSERT INTO conversation/.test(sql)) return [{ affectedRows: 1 }];
      if (/^SELECT conversation_id FROM conversation/.test(sql)) return [[{ conversation_id: 31 }]];
      if (/^UPDATE conversation_read_state/.test(sql)) return [{ affectedRows: 1 }];
      if (/^INSERT INTO message/.test(sql)) return [{ insertId: 91, affectedRows: 1 }];
      if (/^INSERT INTO marketplace_certificate_delivery/.test(sql)) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test("due delivery adds a chat certificate link once and publishes a live message update", async () => {
  const current = loadService({
    queryHandler: async (sql) => {
      if (/SELECT a\.artwork_id/.test(sql)) return [[{ artwork_id: 21 }]];
      if (/INSERT IGNORE INTO marketplace_certificate_identity/.test(sql)) return [{ affectedRows: 1 }];
      if (/SELECT public_token/.test(sql)) return [[{ public_token: "a".repeat(64) }]];
      assert.match(sql, /delivered_at <= CURRENT_TIMESTAMP/);
      return [[{ order_item_id: 51 }]];
    },
    connectionFactory: (calls) => deliveryConnection(calls),
  });
  assert.equal(await current.service.processDueCertificateDeliveries(), 1);
  assert.ok(current.calls.some((call) => call.action === "COMMIT"));
  const message = current.calls.find((call) => /^INSERT INTO message/.test(call.sql || ""));
  assert.deepEqual(JSON.parse(JSON.stringify(message.params)), [
    31,
    'Your Certificate of Authenticity for "Portrait" is ready. Certificate ID: RN-2026-ABCD',
    `https://artmatch.example/buyer/certificate/verify/${"a".repeat(64)}`,
    "application/vnd.artmatch.certificate-link",
  ]);
  assert.deepEqual(current.events, [[3, 7, 31, 91]]);
});

test("an owned certificate sent early explains the remaining wait without exposing its SVG", async () => {
  const current = loadService({
    queryHandler: async (sql) => {
      assert.match(sql, /o\.customer_id = \?/);
      return [[{ certificate_svg: "<svg></svg>", return_completed: 0, access_ready: 0, minutes_remaining: 87 }]];
    },
  });
  await assert.rejects(current.service.getBuyerCertificate(7, 51),
    (error) => error.status === 409 && /upon delivery/.test(error.message) && /87 minute/.test(error.message));
});

test("unavailable or another buyer's certificate remains inaccessible", async () => {
  const current = loadService({ queryHandler: async () => [[]] });
  await assert.rejects(current.service.getBuyerCertificate(8, 51),
    (error) => error.status === 404);
});

test("delivery skips already-sent items and items whose return is completed", async () => {
  for (const options of [{ alreadySent: true }, { completedReturn: true }]) {
    const current = loadService({
      queryHandler: async () => [[{ order_item_id: 51 }]],
      connectionFactory: (calls) => deliveryConnection(calls, options),
    });
    assert.equal(await current.service.processDueCertificateDeliveries(), 0);
    assert.ok(!current.calls.some((call) => /^INSERT INTO message/.test(call.sql || "")));
    assert.deepEqual(current.events, []);
  }
});

test("certificate overlay and message QR decode to the identical stable public URL, including on a custom template", async () => {
  const current = loadService();
  const url = current.service.certificateUrl("b".repeat(64));
  const background = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#941b27" } }).png().toBuffer();
  for (const template of ["<rect width=\"1200\" height=\"800\" fill=\"#fbf8f1\"/>",
    `<image href="data:image/png;base64,${background.toString("base64")}" width="1200" height="800"/>`]) {
    const svg = await current.service.certificateWithQr(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">${template}</svg>`, url);
    const repeated = await current.service.certificateWithQr(svg, url);
    assert.equal((repeated.match(/id="certificate-verification-qr"/g) || []).length, 1);
    const png = await sharp(Buffer.from(svg)).extract({ left: 990, top: 597, width: 146, height: 151 }).resize(584, 604).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(jsQR(new Uint8ClampedArray(png.data), png.info.width, png.info.height)?.data, url);
    assert.ok(svg.indexOf("certificate-verification-qr") > svg.indexOf(template));
  }
  const messagePng = PNG.sync.read(Buffer.from((await createCertificateQr(url)).split(",")[1], "base64"));
  assert.equal(jsQR(new Uint8ClampedArray(messagePng.data), messagePng.width, messagePng.height)?.data, url);
});

test("public verification rejects malformed tokens, unpublished certificates, early access and completed returns", async () => {
  const missing = loadService();
  await assert.rejects(missing.service.getPublicCertificate("1"), (error) => error.status === 404);
  assert.equal(missing.calls.length, 0);
  await assert.rejects(missing.service.getPublicCertificate("c".repeat(64)), (error) => error.status === 404);
  for (const [row, status] of [
    [{ status: "Delivered", access_ready: 0, paid: 1 }, 409],
    [{ status: "Delivered", access_ready: 1, paid: 0 }, 409],
    [{ status: "Delivered", access_ready: 1, paid: 1, return_completed: 1 }, 410],
  ]) {
    const current = loadService({ queryHandler: async () => [[row]] });
    await assert.rejects(current.service.getPublicCertificate("c".repeat(64)), (error) => error.status === status);
  }
  const active = loadService({ queryHandler: async () => [[{ status: "Delivered", access_ready: 1, paid: 1, certificate_id: "RN-TEST", certificate_svg: "<svg></svg>" }]] });
  const result = await active.service.getPublicCertificate("c".repeat(64));
  assert.deepEqual(Object.keys(result).sort(), ["certificateId", "status", "svg"]);
  assert.equal(result.certificateId, "RN-TEST");
  assert.equal(result.status, "Active");
});

test("identity reservation cannot bypass approved artwork ownership", async () => {
  const current = loadService();
  await assert.rejects(current.service.reserveCertificateIdentity(3, 21), (error) => error.status === 404);
  assert.equal(current.calls.length, 1);
  assert.match(current.calls[0].sql, /a\.student_id = \?/);
});

test("legacy seller certificate metadata cannot resolve another seller's order", async () => {
  const current = loadService();
  await assert.rejects(current.service.getSellerOrderCertificateIdentity(9, 51), error => error.status === 404);
  assert.equal(current.calls.length, 1);
  assert.match(current.calls[0].sql, /o\.seller_id = \?/);
  assert.deepEqual(Array.from(current.calls[0].params), [51, 9]);
});

test("the real seller preview/download SVG retains the design, certificate ID and scannable bottom-right QR", async () => {
  const page = fs.readFileSync(new URL("../../frontend/src/pages/seller/CertificateOfAuthenticity.jsx", import.meta.url), "utf8");
  const prefix = page.slice(0, page.indexOf("export default function"))
    .replace(/^import[\s\S]*?;\s*/gm, "");
  const context = vm.createContext({});
  vm.runInContext(`${prefix}\nglobalThis.build = createCertificateSvg;`, context);
  const url = loadService().service.certificateUrl("d".repeat(64));
  const qrData = await createCertificateQr(url);
  for (const templateData of ["", await QRCode.toDataURL("custom raster template")]) {
    const svg = context.build({ artworkTitle: "Night", artistName: "Test Artist", medium: "Oil", certificateId: "RN-TEST", issueDate: "2026-10-28", qrData, templateData });
    assert.match(svg, /width="1200" height="800"/);
    assert.match(svg, /CERTIFICATE ID: RN-TEST/);
    assert.match(svg, /stroke="#941b27" stroke-width="8"/);
    assert.match(svg, /Night/);
    const result = await sharp(Buffer.from(svg)).extract({ left: 990, top: 597, width: 146, height: 151 }).resize(584, 604).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(jsQR(new Uint8ClampedArray(result.data), result.info.width, result.info.height)?.data, url);
  }
});

test("revokeCertificateAccessForReturn updates access and delivery records for returned items", async () => {
  const current = loadService({
    queryHandler: async (sql, params) => {
      if (/INSERT INTO marketplace_certificate_access/.test(sql)) {
        assert.match(sql, /ownership_status/);
        assert.match(sql, /'revoked'/);
        assert.match(sql, /r\.return_request_id = \?/);
        assert.equal(params[0], 88);
        return [{ affectedRows: 1 }];
      }
      if (/UPDATE marketplace_certificate_delivery/.test(sql)) {
        assert.match(sql, /cd\.access_status = 'revoked'/);
        assert.equal(params[0], 88);
        assert.equal(params[1], 88);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });
  await current.service.revokeCertificateAccessForReturn(null, 88);
  assert.equal(current.calls.length, 2);
});
