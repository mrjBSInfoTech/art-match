import { useEffect, useState } from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import { fetchCertificateIdentity } from "../../../api/buyer/certificateAPI.js";
import { fetchSellerCertificateIdentity } from "../../../api/seller/certificateAPI.js";
import { createCertificateQr } from "../../../utils/certificateQr.js";

const extractOrderItemId = (value) => {
  if (!value) return null;

  const candidates = [String(value)];

  try {
    candidates.push(new URL(value, window.location.origin).pathname);
  } catch {
    // Ignore invalid URLs; the raw value will be checked below.
  }

  for (const candidate of candidates) {
    const match = /(?:\/buyer\/certificate\/(\d+)|\/buyer\/certificates\/order-items\/(\d+)\/verification|\/seller\/certificates\/order-items\/(\d+)\/verification)/.exec(candidate);
    if (match) return match.slice(1).find(Boolean) ?? null;
  }

  const legacyMatch = /^\/buyer\/certificate\/(\d+)$/.exec(String(value));
  return legacyMatch ? legacyMatch[1] : null;
};

const coerceVerificationUrl = (value) => {
  if (!value) return "";

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return String(value);
  }
};

export default function CertificateMessage({ message, buyer = true }) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [failed, setFailed] = useState(false);
  const [revokedMessage, setRevokedMessage] = useState("");

  useEffect(() => {
    let active = true;
    setQr("");
    setFailed(false);
    setRevokedMessage("");
    setUrl("");
    setCertificateId("");

    const load = async () => {
      const orderItemId = extractOrderItemId(message.image);
      const identity = orderItemId
        ? await (buyer
          ? fetchCertificateIdentity(orderItemId)
          : fetchSellerCertificateIdentity(orderItemId))
        : {
            verificationUrl: coerceVerificationUrl(message.image),
            certificateId: /Certificate ID: ([A-Za-z0-9-]+)/.exec(message.text || "")?.[1] || "",
          };

      if (!identity?.verificationUrl) {
        throw new Error("Missing verification URL.");
      }

      const image = await createCertificateQr(identity.verificationUrl);
      if (active) {
        setQr(image);
        setUrl(identity.verificationUrl);
        setCertificateId(identity.certificateId || "");
      }
    };

    load().catch((error) => {
      console.error("Certificate QR unavailable:", error?.name || error?.message || error);
      if (active) {
        setFailed(true);
        const msg = error?.response?.data?.message || error?.message || "";
        if (error?.response?.status === 410 || /revoked/i.test(msg) || /returned/i.test(msg)) {
          setRevokedMessage(
            typeof msg === "string" && msg.includes("revoked")
              ? msg
              : "Access to this Certificate of Authenticity has been revoked because this product was returned."
          );
        }
      }
    });

    return () => {
      active = false;
    };
  }, [message.image, message.text, buyer]);

  return (
    <Stack spacing={1} sx={{ p: 1, maxWidth: "100%", alignItems: "center" }}>
      <Typography fontWeight={700}>Certificate of Authenticity</Typography>
      {certificateId && (
        <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
          Certificate ID: {certificateId}
        </Typography>
      )}
      {qr && !revokedMessage && (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          aria-label={`Open certificate ${certificateId}`}
          sx={{ maxWidth: "100%" }}
        >
          <Box
            component="img"
            src={qr}
            alt={`QR code for Certificate of Authenticity ${certificateId}`}
            sx={{
              display: "block",
              width: 200,
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1 / 1",
            }}
          />
        </Link>
      )}
      {revokedMessage ? (
        <Typography
          variant="body2"
          sx={{
            color: "error.main",
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 280,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {revokedMessage}
        </Typography>
      ) : (
        <Typography variant="caption" textAlign="center">
          {failed
            ? "Certificate QR is temporarily unavailable."
            : "Scan to view and verify the Certificate of Authenticity."}
        </Typography>
      )}
    </Stack>
  );
}
