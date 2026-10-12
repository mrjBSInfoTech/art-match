import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { fetchSellerNotifications, markSellerNotificationsRead } from "../../api/seller/messageAPI";

const formatNotificationDate = (value) => {
  if (!value) return "Just now";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getNotificationTypeLabel = (notificationType) => {
  switch (notificationType) {
    case "shipping":
      return "Shipping update";
    case "order_status":
      return "Order update";
    case "ban":
      return "Account notice";
    case "strike":
      return "Account alert";
    default:
      return "Account update";
  }
};

export default function SellerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setError("");
      setLoading(true);
      const rows = await fetchSellerNotifications();
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 4000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markSellerNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: 1 })),
      );
    } catch (markError) {
      setError(markError.message || "Unable to update notifications");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              See customer updates, order shipping changes, and account alerts.
            </Typography>
          </Box>

          {notifications.some((notification) => !Number(notification.is_read)) && (
            <Button variant="contained" onClick={handleMarkAllRead} sx={{ borderRadius: 999 }}>
              Mark all as read
            </Button>
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 220 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={700}>No notifications yet</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              When your orders or account are updated, they will appear here.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {notifications.map((notification) => (
              <Paper
                key={notification.notification_id}
                variant={Number(notification.is_read) ? "outlined" : "elevation"}
                elevation={Number(notification.is_read) ? 0 : 1}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderColor: Number(notification.is_read) ? "divider" : "primary.main",
                  backgroundColor: Number(notification.is_read) ? "background.paper" : "action.hover",
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {getNotificationTypeLabel(notification.notification_type)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {notification.message}
                    </Typography>
                  </Box>

                  <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      {formatNotificationDate(notification.created_at)}
                    </Typography>
                    {!Number(notification.is_read) && (
                      <Typography variant="caption" color="primary.main" fontWeight={700}>
                        New
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
