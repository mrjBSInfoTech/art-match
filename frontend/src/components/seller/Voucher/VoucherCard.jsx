import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

const formatMoney = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? String(value || "")
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
};

const getDiscountLabel = (voucher) => {
  if (voucher.discount_type === "freebie") return "FREEBIE";
  if (voucher.discount_type === "percentage") {
    return `${Number(voucher.discount_value)}% OFF`;
  }
  return `${formatMoney(voucher.discount_value)} OFF`;
};

const escapeXml = (value) =>
  String(value ?? "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);

const getCouponSvg = (voucher, storeName) => {
  const scope = voucher.applies_to_all
    ? "Valid on all shop listings"
    : `Valid on: ${(voucher.artwork || []).map((item) => item.title).filter(Boolean).join(", ") || "Selected listings in your shop"}`;
  const validDates = `${formatDate(voucher.starts_on)} - ${formatDate(voucher.expires_on)}`;
  const title = getDiscountLabel(voucher);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="440" viewBox="0 0 1000 440">
  <rect x="8" y="8" width="984" height="424" rx="28" fill="#fffaf8" stroke="#e6c8c1" stroke-width="4"/>
  <path d="M36 8h928a28 28 0 0 1 28 28v126H8V36A28 28 0 0 1 36 8Z" fill="#881337"/>
  <text x="54" y="70" fill="#ffe4e6" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="4" textLength="880" lengthAdjust="spacingAndGlyphs">RED NEXUS • ${escapeXml(storeName)}</text>
  <text x="54" y="140" fill="#ffffff" font-family="Arial,sans-serif" font-size="54" font-weight="700">${escapeXml(title)}</text>
  <path d="M8 176h984" stroke="#b88d92" stroke-width="2" stroke-dasharray="10 10"/>
  <circle cx="8" cy="176" r="18" fill="#fff"/>
  <circle cx="992" cy="176" r="18" fill="#fff"/>
  <text x="54" y="230" fill="#6b293c" font-family="Arial,sans-serif" font-size="20" font-weight="700">DISCOUNT CODE</text>
  <text x="54" y="286" fill="#111827" font-family="Arial,sans-serif" font-size="46" font-weight="700" letter-spacing="3">${escapeXml(voucher.code)}</text>
  <text x="54" y="332" fill="#475569" font-family="Arial,sans-serif" font-size="20">Minimum purchase: ${escapeXml(formatMoney(voucher.minimum_purchase))}</text>
  <text x="54" y="370" fill="#475569" font-family="Arial,sans-serif" font-size="18">${escapeXml(scope)}</text>
  <text x="54" y="408" fill="#475569" font-family="Arial,sans-serif" font-size="18">Valid ${escapeXml(validDates)} • Use only in ${escapeXml(storeName)}'s shop</text>
  <rect x="812" y="218" width="140" height="140" rx="14" fill="#fff" stroke="#e6c8c1" stroke-width="2"/>
  <text x="882" y="260" fill="#881337" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle">MINIMUM</text>
  <text x="882" y="294" fill="#111827" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle">${escapeXml(formatMoney(voucher.minimum_purchase))}</text>
  <text x="882" y="328" fill="#64748b" font-family="Arial,sans-serif" font-size="14" text-anchor="middle">PURCHASE</text>
</svg>`;
};

const downloadCoupon = (voucher, storeName) => {
  const image = new Blob([getCouponSvg(voucher, storeName)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = url;
  link.download = `artmatch-voucher-${String(voucher.code).toLowerCase()}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function VoucherCard({ voucher, storeName, onCopy, onEdit, onDelete }) {
  return (
    <Card
      sx={{
        overflow: "hidden",
        height: "100%",
        minWidth: 0,
        background:
          "linear-gradient(135deg, #fffaf8 0%, #ffffff 56%, #fff1f2 100%)",
        border: "1px solid #f1d5d5",
      }}
    >
      <Box
        sx={{
          position: "relative",
          px: { xs: 2.5, sm: 3 },
          py: 2.5,
          color: "white",
          background:
            "linear-gradient(120deg, #881337 0%, #be123c 70%, #e11d48 100%)",
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 1,
            borderBottom: "2px dashed rgba(255,255,255,.6)",
          },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ letterSpacing: 2, color: "#ffe4e6" }}
            >
              RED NEXUS • {storeName || "Your Shop"}
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ mt: 0.5, lineHeight: 1.1 }}
            >
              {getDiscountLabel(voucher)}
            </Typography>
          </Box>
          <Chip
            label={voucher.discount_type === "freebie" ? "FREEBIE" : "DISCOUNT"}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,.16)",
              color: "white",
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              letterSpacing={1.2}
            >
              DISCOUNT CODE
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={1.5}
              sx={{ mt: 0.5 }}
            >
              <Typography
                variant="h5"
                fontWeight={800}
                letterSpacing={2}
                sx={{ overflowWrap: "anywhere" }}
              >
                {voucher.code}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<ContentCopyOutlinedIcon />}
                onClick={() => onCopy(voucher.code)}
                sx={{ flexShrink: 0 }}
              >
                Copy
              </Button>
            </Stack>
          </Box>
          <Divider sx={{ borderStyle: "dashed" }} />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                MINIMUM PURCHASE
              </Typography>
              <Typography fontWeight={700}>
                {formatMoney(voucher.minimum_purchase)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                VALID PERIOD
              </Typography>
              <Typography fontWeight={700}>
                {formatDate(voucher.starts_on)} - {formatDate(voucher.expires_on)}
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">
              APPLICABLE TO
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {voucher.applies_to_all
                ? "All listings in your shop"
                : (voucher.artwork || [])
                    .map((item) => item.title)
                  .filter(Boolean)
                  .join(", ") || "Selected listings in your shop"}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              onClick={() => downloadCoupon(voucher, storeName || "Your Shop")}
              sx={{
                alignSelf: { xs: "stretch", sm: "flex-start" },
                bgcolor: "#881337",
                "&:hover": { bgcolor: "#6b102c" },
                color:"#fff"
              }}
            >
              Download voucher
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<EditOutlinedIcon />}
              onClick={() => onEdit(voucher)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onDelete(voucher)}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
