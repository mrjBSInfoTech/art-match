import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { addChatEventClient, publishChatMessage, publishReturnUpdated } from "../utils/chatEvents.js";

function client(role, id) {
  const response = new EventEmitter();
  response.frames = [];
  response.status = () => response;
  response.set = () => response;
  response.flushHeaders = () => {};
  response.write = frame => response.frames.push(frame);
  addChatEventClient(role, id, response);
  response.frames.length = 0;
  return response;
}

test("return live updates reach only both transaction participants with structured identifiers", () => {
  const buyer = client("buyer", 7031);
  const seller = client("seller", 7032);
  const bystander = client("buyer", 7033);
  try {
    publishReturnUpdated(7032, 7031, 12, 34, 56, "Approved");
    assert.equal(buyer.frames.length, 1);
    assert.deepEqual(buyer.frames, seller.frames);
    assert.equal(bystander.frames.length, 0);
    assert.match(buyer.frames[0], /^event: return_updated\ndata: /);
    const payload = JSON.parse(buyer.frames[0].split("\ndata: ")[1]);
    assert.deepEqual(payload, { conversation_id: 12, return_request_id: 34, order_id: 56, status: "Approved" });
    assert.equal(payload.message_data, undefined);
    assert.equal(payload.encryption_iv, undefined);
  } finally {
    [buyer, seller, bystander].forEach(response => response.emit("close"));
  }
});

test("ordinary message events retain their type and payload alongside return events", () => {
  const buyer = client("buyer", 7041);
  const seller = client("seller", 7042);
  try {
    publishChatMessage(7042, 7041, 90, 91);
    assert.match(buyer.frames[0], /^event: message\ndata: /);
    assert.deepEqual(JSON.parse(buyer.frames[0].split("\ndata: ")[1]), { conversation_id: 90, message_id: 91 });
    assert.deepEqual(buyer.frames, seller.frames);
  } finally { [buyer, seller].forEach(response => response.emit("close")); }
});

test("closed or destroyed clients stop receiving return updates", () => {
  const closed = client("buyer", 7051);
  const destroyed = client("seller", 7052);
  closed.emit("close");
  destroyed.destroyed = true;
  try {
    publishReturnUpdated(7052, 7051, 12, 34, 56, "Completed");
    assert.equal(closed.frames.length, 0);
    assert.equal(destroyed.frames.length, 0);
  } finally { destroyed.emit("close"); }
});
