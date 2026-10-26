import { Avatar, Badge, Box, Divider, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";

export default function MessageConversationCard({ chat, isSelected, avatarSrc, timeLabel, preview, onSelect }) {
  return (
    <Box>
      <ListItemButton
        selected={isSelected}
        onClick={onSelect}
        sx={{
          py: 1.5,
          px: 2,
          backgroundColor:
            Number(chat.unread_count || 0) > 0 && !isSelected
              ? "rgba(25, 118, 210, 0.06)"
              : "transparent",
          borderLeft:
            Number(chat.unread_count || 0) > 0 && !isSelected
              ? "3px solid"
              : "none",
          borderColor: "primary.main",
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            variant="dot"
            color="success"
          >
            <Avatar
              src={avatarSrc}
              alt={chat.other_name || "Seller"}
            />
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="subtitle2"
                fontWeight={
                  Number(chat.unread_count || 0) > 0 ? 800 : 600
                }
              >
                {chat.other_name || "Seller"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight:
                    Number(chat.unread_count || 0) > 0 ? 700 : 400,
                }}
              >
                {timeLabel}
              </Typography>
            </Stack>
          }
          secondary={
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Typography
                variant="body2"
                color={
                  Number(chat.unread_count || 0) > 0
                    ? "text.primary"
                    : "text.secondary"
                }
                fontWeight={
                  Number(chat.unread_count || 0) > 0 ? 600 : 400
                }
                noWrap
                sx={{ maxWidth: 180 }}
              >
                {preview}
              </Typography>
              {Number(chat.unread_count || 0) > 0 && (
                <Box
                  aria-label={`${chat.unread_count} unread messages`}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    flexShrink: 0,
                  }}
                />
              )}
            </Stack>
          }
        />
      </ListItemButton>
      <Divider component="li" />
    </Box>
  );
}
