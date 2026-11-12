import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function MarketingSectionBanner({
  icon: Icon,
  title,
  description,
  aside,
}) {
  const theme = useTheme();

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2.5,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            color: theme.palette.error.main,
            backgroundColor: alpha(
              theme.palette.error.main,
              theme.palette.mode === "dark" ? 0.16 : 0.08,
            ),
          }}
        >
          <Icon sx={{ fontSize: 21 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "text.secondary",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.8,
              lineHeight: 1.2,
            }}
          >
            MARKETING WORKSPACE
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 0.25, fontWeight: 800, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: 13 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      {aside}
    </Paper>
  );
}
