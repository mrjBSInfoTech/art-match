import { Avatar, Box, Divider, ListItemAvatar, ListItemButton, ListItemText, Typography } from "@mui/material";

export default function MessageNoticeCard({ notification, selected, onSelect }) {
  return (
    <Box>
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{ py: 1.5, px: 2 }}
      >
        <ListItemAvatar>
          <Avatar
            sx={{
              bgcolor:
                notification.notification_type === "ban"
                  ? "error.main"
                  : "warning.main",
            }}
          >
            !
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="subtitle2" fontWeight={600}>
              Account notice
            </Typography>
          }
          secondary={
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
            >
              {notification.message}
            </Typography>
          }
        />
      </ListItemButton>
      <Divider component="li" />
    </Box>
  );
}
