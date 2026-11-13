import {
  Avatar,
  Badge,
  Box,
  Chip,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const getInitials = (name, fallback = "A") =>
  (name || fallback)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || fallback;

export default function ChatConversationItem({
  name,
  avatarSrc,
  avatarIcon = null,
  avatarFallback = "A",
  avatarBgColor = "error.main",
  timeLabel,
  preview,
  unreadCount = 0,
  selected = false,
  chips = [],
  onSelect,
}) {
  const theme = useTheme();
  const unread = Number(unreadCount || 0);
  const accentTint = alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.14 : 0.06);
  const selectedTint = alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.2 : 0.09);

  return (
    <ListItemButton
      selected={selected}
      onClick={onSelect}
      sx={{
        mx: 1,
        my: 0.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        alignItems: "flex-start",
        borderLeft: "3px solid",
        borderColor: selected || unread > 0 ? "error.main" : "transparent",
        backgroundColor: selected ? selectedTint : unread > 0 ? accentTint : "transparent",
        transition: "background-color 150ms ease, border-color 150ms ease",
        "&.Mui-selected": {
          backgroundColor: selectedTint,
        },
        "&.Mui-selected:hover": {
          backgroundColor: selectedTint,
        },
        "&:hover": {
          backgroundColor: selected
            ? selectedTint
            : alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.06 : 0.04),
        },
      }}
    >
      <ListItemAvatar sx={{ minWidth: 50, mt: 0.25 }}>
        <Badge
          color="error"
          badgeContent={unread}
          max={99}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: 10,
              fontWeight: 700,
              minWidth: 18,
              height: 18,
            },
          }}
        >
          <Avatar
            src={avatarSrc}
            alt={name}
            sx={{
              width: 40,
              height: 40,
              bgcolor: avatarBgColor,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {avatarIcon || getInitials(name, avatarFallback)}
          </Avatar>
        </Badge>
      </ListItemAvatar>

      <ListItemText
        primaryTypographyProps={{ component: "div" }}
        secondaryTypographyProps={{ component: "div" }}
        sx={{ minWidth: 0, my: 0 }}
        primary={
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography
              variant="subtitle2"
              fontWeight={unread > 0 || selected ? 700 : 600}
              noWrap
              sx={{ minWidth: 0, flex: 1 }}
            >
              {name}
            </Typography>
            {timeLabel && (
              <Typography
                variant="caption"
                color={unread > 0 ? "error.main" : "text.secondary"}
                sx={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: unread > 0 ? 700 : 500,
                }}
              >
                {timeLabel}
              </Typography>
            )}
          </Stack>
        }
        secondary={
          <Box sx={{ mt: 0.35, minWidth: 0 }}>
            {chips.length > 0 && (
              <Stack
                direction="row"
                spacing={0.5}
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 0.5 }}
              >
                {chips.map((chip) => (
                  <Chip
                    key={chip.label}
                    size="small"
                    label={chip.label}
                    color={chip.color || "default"}
                    variant={chip.variant || "outlined"}
                    sx={{
                      height: 19,
                      fontSize: 10.5,
                      fontWeight: 600,
                      "& .MuiChip-label": { px: 0.85 },
                    }}
                  />
                ))}
              </Stack>
            )}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
            >
              <Typography
                variant="body2"
                color={unread > 0 ? "text.primary" : "text.secondary"}
                fontWeight={unread > 0 ? 600 : 400}
                noWrap
                sx={{ fontSize: 12.5, minWidth: 0, flex: 1 }}
              >
                {preview || "No messages yet"}
              </Typography>
              {unread > 0 && (
                <Box
                  aria-label={`${unread} unread messages`}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "error.main",
                    flexShrink: 0,
                  }}
                />
              )}
            </Stack>
          </Box>
        }
      />
    </ListItemButton>
  );
}

