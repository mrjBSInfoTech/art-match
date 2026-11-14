import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { createPayoutService } from "../utils/payouts.js";

const institution = {
  code: "GXCHPHM2XXX",
  name: "G-Xchange, Inc.",
  provider: "instapay",
  destinationType: "ewallet",
};

function createMockPayoutService({ initialAccount = null, initialPendingRequests = [] } = {}) {
  const state = {
    account: initialAccount,
    pendingRequests: [...initialPendingRequests],
    approvalsCleared: 0,
    audits: [],
    nextRequestId: 100,
  };

  const query = async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, " ").trim();

    if (normalized.startsWith("SELECT student_id FROM student")) {
      return [[{ student_id: params[0] }]];
    }
    if (normalized.startsWith("SELECT split_id FROM seller_payment_split")) {
      return [[]];
    }
    if (normalized.startsWith("SELECT payout_account_id FROM seller_payout_account")) {
      return [state.account ? [{ payout_account_id: 1 }] : []];
    }
    if (normalized.startsWith("SELECT * FROM seller_payout_account WHERE student_id")) {
      return [state.account ? [state.account] : []];
    }
    if (normalized.startsWith("INSERT INTO seller_payout_account ")) {
      const [student_id, destination_type, institution_code, institution_name, institution_provider, account_name, account_number_ciphertext] = params;
      state.account = {
        student_id,
        destination_type,
        institution_code,
        institution_name,
        institution_provider,
        account_name,
        account_number_ciphertext,
      };
      return [{ insertId: 1 }];
    }
    if (normalized.startsWith("DELETE FROM seller_payout_account_request WHERE student_id = ? AND status = 'Pending'")) {
      state.pendingRequests = state.pendingRequests.filter((req) => req.status !== "Pending");
      return [{ affectedRows: 1 }];
    }
    if (normalized.startsWith("SELECT request_id FROM seller_payout_account_request WHERE student_id = ? AND status = 'Pending'")) {
      return [state.pendingRequests.filter((req) => req.status === "Pending").map((req) => ({ request_id: req.request_id }))];
    }
    if (normalized.startsWith("DELETE FROM seller_payout_account_approval")) {
      state.approvalsCleared++;
      return [{ affectedRows: 1 }];
    }
    if (normalized.startsWith("UPDATE seller_payout_account_request SET")) {
      const [destination_type, institution_code, institution_name, institution_provider, account_name, account_number_ciphertext, request_id] = params;
      const target = state.pendingRequests.find((req) => req.request_id === request_id);
      Object.assign(target, { destination_type, institution_code, institution_name, institution_provider, account_name, account_number_ciphertext });
      return [{ affectedRows: 1 }];
    }
    if (normalized.startsWith("INSERT INTO seller_payout_account_request")) {
      const [student_id, destination_type, institution_code, institution_name, institution_provider, account_name, account_number_ciphertext] = params;
      state.pendingRequests.push({
        request_id: ++state.nextRequestId,
        student_id,
        destination_type,
        institution_code,
        institution_name,
        institution_provider,
        account_name,
        account_number_ciphertext,
        status: "Pending",
        approval_count: 0,
        requested_at: new Date().toISOString(),
      });
      return [{ insertId: state.nextRequestId }];
    }
    if (normalized.includes("FROM seller_payout_account_request r WHERE r.student_id = ? AND r.status = 'Pending'")) {
      return [state.pendingRequests.filter((req) => req.status === "Pending").slice(-1)];
    }
    if (normalized.includes("FROM seller_payout_account_request WHERE student_id = ? AND status = 'Rejected'")) {
      return [[]];
    }
    throw new Error(`Unexpected SQL in test mock: ${normalized}`);
  };

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    query,
  };

  const pool = {
    query,
    async getConnection() {
      return connection;
    },
  };

  const service = createPayoutService({
    pool,
    provider: {
      getPayoutProviderName: () => "paymongo",
      listPayoutInstitutions: async () => [institution],
      getPayoutCapability: async () => ({ enabled: true, mode: "test", provider: "paymongo", simulated: false, walletConfigured: true }),
    },
    audit: async (entry) => { state.audits.push(entry); },
  });

  return { service, state };
}

test("new seller without an active payout account activates payment method immediately without admin approval request", async () => {
  const previousKey = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  try {
    const { service, state } = createMockPayoutService();
    const result = await service.saveAccount(7, {
      institutionCode: institution.code,
      provider: institution.provider,
      accountName: "John Doe",
      accountNumber: "09123450001",
    });

    assert.equal(result.requiresApproval, false);
    assert.equal(result.pendingRequest, null);
    assert.equal(result.account?.institutionCode, institution.code);
    assert.equal(result.account?.accountName, "John Doe");
    assert.equal(state.pendingRequests.length, 0);
    assert.equal(state.audits.at(-1)?.action, "PAYOUT_ACCOUNT_CONFIGURED");
  } finally {
    if (previousKey === undefined) delete process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = previousKey;
  }
});

test("seller without active payout account clears any stale pending request and activates immediately", async () => {
  const previousKey = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  try {
    const { service, state } = createMockPayoutService({
      initialPendingRequests: [{ request_id: 55, student_id: 7, status: "Pending" }],
    });
    const result = await service.saveAccount(7, {
      institutionCode: institution.code,
      provider: institution.provider,
      accountName: "John Doe",
      accountNumber: "09123450001",
    });

    assert.equal(result.requiresApproval, false);
    assert.equal(result.pendingRequest, null);
    assert.ok(result.account);
    assert.equal(state.pendingRequests.length, 0);
  } finally {
    if (previousKey === undefined) delete process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = previousKey;
  }
});

test("seller with an existing active payout account sends a change request requiring admin approval", async () => {
  const previousKey = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  try {
    const { service, state } = createMockPayoutService({
      initialAccount: {
        student_id: 7,
        destination_type: "ewallet",
        institution_code: institution.code,
        institution_name: institution.name,
        institution_provider: institution.provider,
        account_name: "Existing Seller",
        account_number_ciphertext: "enc:existing",
      },
    });

    const result = await service.saveAccount(7, {
      institutionCode: institution.code,
      provider: institution.provider,
      accountName: "Updated Seller",
      accountNumber: "09987654321",
    });

    assert.equal(result.requiresApproval, true);
    assert.equal(result.pendingRequest?.status, "Pending");
    assert.equal(result.pendingRequest?.accountName, "Updated Seller");
    assert.equal(state.account.account_name, "Existing Seller");
    assert.equal(state.pendingRequests.length, 1);
    assert.equal(state.audits.at(-1)?.action, "PAYOUT_ACCOUNT_CHANGE_REQUESTED");
  } finally {
    if (previousKey === undefined) delete process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = previousKey;
  }
});

