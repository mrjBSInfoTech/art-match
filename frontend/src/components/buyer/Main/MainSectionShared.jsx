import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export function ArtworkCardSkeleton() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid",
        borderColor: darkMode
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(15, 23, 42, 0.08)",
        borderRadius: 3,
        backgroundColor: "background.paper",
        boxShadow: darkMode
          ? "0 4px 16px rgba(0, 0, 0, 0.28)"
          : "0 4px 16px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Skeleton
        variant="rectangular"
        animation="wave"
        sx={{
          width: "100%",
          aspectRatio: { xs: "1.12 / 1", sm: "1.05 / 1" },
          transform: "none",
        }}
      />
      <Box
        sx={{
          p: { xs: 1, sm: 2 },
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: { xs: 0.4, sm: 0.75 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Skeleton
            variant="text"
            animation="wave"
            sx={{ width: "65%", height: 24, borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ width: 36, height: 20, borderRadius: 1 }}
          />
        </Stack>
        <Skeleton
          variant="text"
          animation="wave"
          sx={{ width: "45%", height: 18, borderRadius: 1 }}
        />
        <Box sx={{ flex: 1, minHeight: 12 }} />
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pt: 1 }}
        >
          <Skeleton
            variant="text"
            animation="wave"
            sx={{ width: "35%", height: 26, borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            animation="wave"
            sx={{ width: 40, height: 40, borderRadius: 2.5 }}
          />
        </Stack>
      </Box>
    </Box>
  );
}

export function SectionHeader({
  title,
  to,
  titleId,
  titleComponent = "h2",
}) {
  return (
    <Stack
      direction="row"
      gap={{ xs: 1.25, sm: 2 }}
      sx={{
        alignItems: { xs: "center", sm: "flex-end" },
        justifyContent: "space-between",
        mb: { xs: 2, sm: 3 },
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          id={titleId}
          component={titleComponent}
          variant="h4"
          sx={{
            mt: 0.5,
            maxWidth: 760,
            fontSize: {
              xs: 18,
              sm: 24,
              md: 30,
            },
            fontWeight: 800,
            lineHeight: 1.2,
            overflowWrap: "break-word",
          }}
        >
          {title}
        </Typography>
      </Box>
      {to && (
        <Button
          component={RouterLink}
          to={to}
          endIcon={
            <ArrowForwardIcon
              sx={{
                fontSize: {
                  xs: "16px !important",
                  sm: "18px !important",
                  md: "20px !important",
                },
              }}
            />
          }
          sx={{
            color: "text.primary",
            fontSize: { xs: 12.5, sm: 14, md: 16 },
            fontWeight: 600,
            whiteSpace: "nowrap",
            minHeight: { xs: 36, sm: 44 },
            minWidth: "auto",
            px: { xs: 0.75, sm: 1.5 },
            py: 0.5,
            textTransform: "none",
            flexShrink: 0,
            "& .MuiButton-endIcon": {
              ml: { xs: 0.5, sm: 0.75 },
            },
          }}
        >
          View all
        </Button>
      )}
    </Stack>
  );
}
