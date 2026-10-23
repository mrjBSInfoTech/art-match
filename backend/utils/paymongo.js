const PAYMONGO_API_BASE_URL = "https://api.paymongo.com";

/*
 * Get PayMongo secret key from backend/.env
 */
const getPayMongoSecretKey = () => {
  const secretKey = String(process.env.PAYMONGO_SECRET_KEY || "").trim();

  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is missing from backend/.env");
  }

  return secretKey;
};

/*
 * PayMongo uses HTTP Basic Authentication.
 *
 * Secret key is formatted as:
 *
 * sk_test_xxxxx:
 *
 * then converted to Base64.
 */
const getAuthorizationHeader = () => {
  const secretKey = getPayMongoSecretKey();

  const encodedCredentials = Buffer.from(`${secretKey}:`).toString("base64");

  return `Basic ${encodedCredentials}`;
};

/*
 * Convert Philippine pesos to centavos.
 *
 * ₱1      = 100
 * ₱100    = 10000
 * ₱1500   = 150000
 */
export const pesosToCentavos = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return Math.round(amount * 100);
};

/*
 * Extract a readable error from PayMongo.
 */
const getPayMongoErrorMessage = (responseBody, statusCode) => {
  const firstError = responseBody?.errors?.[0];

  return (
    firstError?.detail ||
    firstError?.code ||
    responseBody?.message ||
    `PayMongo request failed with status ${statusCode}`
  );
};

/*
 * Create a PayMongo Hosted Checkout Session.
 */
export const createPayMongoCheckoutSession = async ({
  lineItems,
  paymentMethodTypes,
  successUrl,
  cancelUrl,
  referenceNumber,
  metadata = null,
}) => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error("PayMongo checkout requires at least one line item");
  }

  if (!Array.isArray(paymentMethodTypes) || paymentMethodTypes.length === 0) {
    throw new Error("PayMongo checkout requires at least one payment method");
  }

  if (!successUrl) {
    throw new Error("PayMongo checkout requires a success URL");
  }

  if (!cancelUrl) {
    throw new Error("PayMongo checkout requires a cancel URL");
  }

  if (!referenceNumber) {
    throw new Error("PayMongo checkout requires a reference number");
  }

  const attributes = {
    line_items: lineItems,

    payment_method_types: paymentMethodTypes,

    success_url: successUrl,

    cancel_url: cancelUrl,

    reference_number: referenceNumber,

    send_email_receipt: true,
  };

  if (metadata) {
    attributes.metadata = metadata;
  }

  const response = await fetch(
    `${PAYMONGO_API_BASE_URL}/v2/checkout_sessions`,
    {
      method: "POST",

      headers: {
        Authorization: getAuthorizationHeader(),

        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        data: {
          attributes,
        },
      }),
    },
  );

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getPayMongoErrorMessage(responseBody, response.status));
  }

  const session = responseBody?.data;

  if (!session?.id || !session?.attributes?.checkout_url) {
    throw new Error("PayMongo did not return a valid Checkout Session");
  }

  return {
    checkoutSessionId: session.id,

    checkoutUrl: session.attributes.checkout_url,

    referenceNumber: session.attributes.reference_number || referenceNumber,
  };
};
