import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ArtworkImage from "../../common/ArtworkImage";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

const getStatusPillStyle = (theme, status) => {
  const isDark = theme?.palette?.mode === "dark";
  const success = theme?.palette?.success?.main || "#2e7d32";
  const warning = theme?.palette?.warning?.main || "#ed6c02";
  const info = theme?.palette?.info?.main || "#0288d1";
  const error = theme?.palette?.error?.main || "#d32f2f";

  const styles = {
    Completed: {
      bgcolor: safeAlpha(success, isDark ? 0.18 : 0.12),
      color: success,
      borderColor: safeAlpha(success, 0.4),
    },
    Pending: {
      bgcolor: safeAlpha(warning, isDark ? 0.18 : 0.12),
      color: warning,
      borderColor: safeAlpha(warning, 0.4),
    },
    Processing: {
      bgcolor: safeAlpha(info, isDark ? 0.18 : 0.12),
      color: info,
      borderColor: safeAlpha(info, 0.4),
    },
    Cancelled: {
      bgcolor: safeAlpha(error, isDark ? 0.22 : 0.12),
      color: error,
      borderColor: safeAlpha(error, 0.4),
    },
  };

  return (
    styles[status] || {
      bgcolor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", isDark ? 0.18 : 0.12),
      color: theme?.palette?.text?.secondary || "rgba(0, 0, 0, 0.6)",
      borderColor: safeAlpha(theme?.palette?.grey?.[500] || "#9e9e9e", 0.4),
    }
  );
};

export function SingleSalesCard({ transaction, formatCurrency }) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";
  const format =
    formatCurrency ||
    ((value) =>
      `₱${Number(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`);

  const status = transaction.status || "Completed";
  const pillStyle = getStatusPillStyle(theme, status);

  return (
    <Paper
      component="article"
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minWidth: 0,
        overflow: "hidden",
        transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          borderColor: "primary.light",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "stretch", lg: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ minWidth: 0 }}
      >
        {/* Left Side: Thumbnail / Icon Box + Title + Meta */}
        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          {/* Thumbnail / Artwork Image Box matching OrderCard */}
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: 2.5,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <ArtworkImage
              image={transaction.image || transaction.image_url}
              alt={transaction.artwork || "Artwork"}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>

          {/* Details */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Artwork Title & Status Pill */}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 0.5 }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.3,
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                }}
              >
                {transaction.artwork}
              </Typography>
              <Chip
                label={status}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: "16px",
                  bgcolor: pillStyle.bgcolor,
                  color: pillStyle.color,
                  border: `1px solid ${pillStyle.borderColor}`,
                  px: 0.5,
                  maxWidth: "100%",
                }}
              />
            </Stack>

            {/* Artist & Buyer Subtitle */}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                fontWeight: 500,
                mb: 0.45,
                wordBreak: "normal",
                overflowWrap: "break-word",
              }}
            >
              Artist: <strong style={{ color: "inherit" }}>{transaction.artist}</strong> · Buyer:{" "}
              <strong style={{ color: "inherit" }}>{transaction.buyer}</strong>
            </Typography>

            {/* Date */}
            <Stack direction="row" spacing={0.5} useFlexGap alignItems="center" sx={{ flexWrap: "wrap" }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>
                Date Sold: {transaction.date}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Right Side: 3 Metric Stat Boxes */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(auto-fit, minmax(105px, 1fr))",
              lg: "repeat(3, minmax(112px, auto))",
            },
            gap: 1.25,
            alignItems: "stretch",
            width: { xs: "100%", lg: "auto" },
            flexShrink: 0,
            minWidth: 0,
            pt: { xs: 1.5, lg: 0 },
            borderTop: { xs: "1px solid", lg: "none" },
            borderColor: { xs: "divider", lg: "transparent" },
          }}
        >
          {/* Price / Gross */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.25, sm: 1.75 },
              py: 1,
              textAlign: "center",
              minWidth: 0,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              PRICE / GROSS
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
                whiteSpace: "nowrap",
              }}
            >
              {format(transaction.amount)}
            </Typography>
          </Box>

          {/* Platform Take */}
          <Box
            sx={{
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: { xs: 1.25, sm: 1.75 },
              py: 1,
              textAlign: "center",
              minWidth: 0,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              PLATFORM TAKE
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
                whiteSpace: "nowrap",
              }}
            >
              ₱0 (0%)
            </Typography>
          </Box>

          {/* Net Student Payout */}
          <Box
            sx={{
              bgcolor: safeAlpha(
                theme?.palette?.success?.main || "#2e7d32",
                isDark ? 0.12 : 0.08
              ),
              border: "1px solid",
              borderColor: safeAlpha(theme?.palette?.success?.main || "#2e7d32", 0.35),
              borderRadius: 2,
              px: { xs: 1.25, sm: 1.75 },
              py: 1,
              textAlign: "center",
              minWidth: 0,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                color: "success.main",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              NET STUDENT PAYOUT
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: "success.main",
                fontSize: 14,
                fontVariantNumeric: "tabular-nums",
                mt: 0.25,
                whiteSpace: "nowrap",
              }}
            >
              {format(transaction.amount)}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function SalesCard({ transactions = [], formatCurrency }) {
  if (transactions.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          py: 4,
          borderRadius: 2,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No transactions match your search.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {transactions.map((transaction) => (
        <SingleSalesCard
          key={`${transaction.artwork}-${transaction.date}-${transaction.buyer}`}
          transaction={transaction}
          formatCurrency={formatCurrency}
        />
      ))}
    </Stack>
  );
}

