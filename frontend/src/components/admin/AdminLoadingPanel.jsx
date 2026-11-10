import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Helmet } from "react-helmet-async";

export default function AdminLoadingPanel({
  title = "Loading",
  subtitle = "",
  helmetTitle,
  showMetrics = true,
  showFilters = true,
}) {
  const theme = useTheme();

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: theme.palette?.background?.default,
        color: theme.palette?.text?.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{helmetTitle || title}</title>
      </Helmet>

      {/* Page Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
            color: theme.palette?.text?.primary,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette?.text?.secondary,
              fontSize: 13,
            }}
          >
            {subtitle}
          </Typography>
        ) : (
          <Skeleton variant="text" width={280} height={20} sx={{ mt: 0.75 }} />
        )}
      </Box>

      {/* Skeleton Summary Metric Cards */}
      {showMetrics && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
            mb: 2.5,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Card
              key={index}
              sx={{
                backgroundColor: theme.palette?.background?.paper,
                border: `1px solid ${theme.palette?.divider || "rgba(148, 163, 184, 0.2)"}`,
                borderRadius: 2.5,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="55%" height={16} />
                    <Skeleton variant="text" width="35%" height={38} sx={{ mt: 0.5 }} />
                    <Skeleton variant="text" width="70%" height={16} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="rounded" width={50} height={50} sx={{ borderRadius: 2 }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Skeleton Filter Bar */}
      {showFilters && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2.5,
            backgroundColor: theme.palette?.background?.paper,
            borderColor: theme.palette?.divider,
            mb: 2,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
          >
            <Skeleton
              variant="rounded"
              height={40}
              sx={{ width: { xs: "100%", sm: "60%" }, borderRadius: 1.5 }}
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ width: { xs: "100%", sm: "auto" }, justifyContent: "flex-end" }}
            >
              <Skeleton variant="rounded" width={110} height={40} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width={130} height={40} sx={{ borderRadius: 2 }} />
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Main Content Loading Card */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 4, sm: 6 },
          borderRadius: 2.5,
          backgroundColor: theme.palette?.background?.paper,
          borderColor: theme.palette?.divider,
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 2,
        }}
      >
        <CircularProgress color="error" size={40} thickness={4} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Loading {title}...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Please wait while we fetch the latest data from the server.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

