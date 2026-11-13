import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import RefreshOutlinedIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";

export default function ChatWorkspace({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  isMobile = false,
  hasActiveThread = false,
  onBack,
  alerts = null,
  searchPlaceholder = "Search conversations...",
  searchQuery = "",
  onSearchChange,
  onSearchKeyDown,
  sidebarExtra = null,
  filters = [],
  activeFilter = "all",
  onFilterChange,
  listLoading = false,
  listContent = null,
  listEmpty = null,
  threadHeaderLeft = null,
  threadHeaderRight = null,
  messagesRef = null,
  messagesContent = null,
  attachmentPreview = null,
  composer = null,
  emptyThreadTitle = "Select a conversation",
  emptyThreadSubtitle = "Choose a thread from the list on the left to read and reply.",
  embedded = false,
}) {
  const theme = useTheme();
  const showSidebar = !isMobile || !hasActiveThread;
  const showThread = !isMobile || hasActiveThread;

  return (
    <Box
      sx={{
        p: embedded ? 0 : { xs: 1.5, sm: 2.5 },
        height: embedded
          ? { xs: "min(68dvh, 620px)", md: "min(70dvh, 640px)" }
          : {
              xs: "calc(100dvh - 76px)",
              sm: "calc(100dvh - 96px)",
              md: "calc(100dvh - 112px)",
            },
        minHeight: embedded ? { xs: 420, md: 460 } : { xs: 420, md: 520 },
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {/* Hide hero header when inside an open thread on small screens for native app feel */}
      <Box
        sx={{
          display: isMobile && hasActiveThread ? "none" : "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: { xs: 1.5, sm: 2 },
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontSize: { xs: 28, sm: 34, md: 38 },
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: 13 }}
          >
            {subtitle}
          </Typography>
        </Box>

        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={onRefresh}
            disabled={refreshing}
            sx={{
              width: { xs: "100%", sm: 140 },
              height: { xs: 38, sm: 42 },
              fontSize: { xs: 13, sm: 15 },
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Refresh
          </Button>
        )}
      </Box>

      {alerts && <Box sx={{ flexShrink: 0 }}>{alerts}</Box>}

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: { xs: 2, md: 3 },
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {/* Conversation List Sidebar */}
        {showSidebar && (
          <Box
            sx={{
              width: { xs: "100%", md: 295, lg: 335, xl: 360 },
              flexShrink: 0,
              borderRight: { xs: "none", md: "1px solid" },
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderBottom: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.common.white, 0.03)
                        : alpha(theme.palette.common.black, 0.02),
                  },
                }}
              />

              {filters.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{
                    mt: 1.25,
                    overflowX: "auto",
                    pb: 0.25,
                    "&::-webkit-scrollbar": { display: "none" },
                  }}
                >
                  {filters.map((filter) => {
                    const active = activeFilter === filter.id;
                    return (
                      <Chip
                        key={filter.id}
                        size="small"
                        clickable
                        onClick={() => onFilterChange?.(filter.id)}
                        label={
                          filter.count > 0
                            ? `${filter.label} (${filter.count})`
                            : filter.label
                        }
                        sx={{
                          flexShrink: 0,
                          height: 26,
                          fontSize: 11.5,
                          fontWeight: active ? 700 : 500,
                          borderRadius: 1.5,
                          bgcolor: active ? "error.main" : "transparent",
                          color: active ? "#fff" : "text.secondary",
                          border: "1px solid",
                          borderColor: active ? "error.main" : "divider",
                          "&:hover": {
                            bgcolor: active ? "error.dark" : "action.hover",
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              )}

              {sidebarExtra}
            </Box>

            {listLoading ? (
              <Box
                sx={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  p: 3,
                }}
              >
                <CircularProgress size={26} color="error" />
              </Box>
            ) : listEmpty ? (
              <Box
                sx={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  px: 2.5,
                  py: 5,
                }}
              >
                {listEmpty}
              </Box>
            ) : (
              <List
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  py: 0.5,
                  px: 0,
                }}
              >
                {listContent}
              </List>
            )}
          </Box>
        )}

        {/* Active Conversation Area */}
        {showThread &&
          (hasActiveThread ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minWidth: 0,
                minHeight: 0,
              }}
            >
              {/* Thread Header */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{
                  px: { xs: 1.25, sm: 2 },
                  py: { xs: 1.25, sm: 1.75 },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                  minWidth: 0,
                }}
              >
                <Stack
                  direction="row"
                  spacing={{ xs: 1, sm: 1.5 }}
                  alignItems="center"
                  sx={{ minWidth: 0, flex: 1 }}
                >
                  {isMobile && onBack && (
                    <IconButton
                      size="small"
                      aria-label="Back to conversations"
                      onClick={onBack}
                      sx={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                      }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  )}
                  {threadHeaderLeft}
                </Stack>
                {threadHeaderRight && (
                  <Box sx={{ flexShrink: 0 }}>{threadHeaderRight}</Box>
                )}
              </Stack>

              {/* Scrollable Messages */}
              <Box
                ref={messagesRef}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  p: { xs: 1.5, sm: 2, md: 2.5 },
                  overflowY: "auto",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "background.default"
                      : "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                {messagesContent}
              </Box>

              {attachmentPreview}
              {composer}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: { xs: "none", md: "grid" },
                placeItems: "center",
                p: 4,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "background.default"
                    : "#f8fafc",
              }}
            >
              <Stack alignItems="center" spacing={1.25} sx={{ maxWidth: 340, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: "error.main",
                  }}
                >
                  <ForumOutlinedIcon sx={{ fontSize: 30 }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {emptyThreadTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {emptyThreadSubtitle}
                </Typography>
              </Stack>
            </Box>
          ))}
      </Paper>
    </Box>
  );
}

