import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  fetchBuyerNotifications,
  fetchBuyerParcelPhoto,
  markBuyerNotificationsRead,
} from "../../api/buyer/messageAPI";

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

function ParcelPhotoButton({ photo, index, onOpen }) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;
    fetchBuyerParcelPhoto(photo)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setImageError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  return (
    <Box
      component="button"
      type="button"
      onClick={() => imageUrl && onOpen(imageUrl)}
      disabled={!imageUrl}
      aria-label={`Enlarge parcel photo ${index + 1}`}
      sx={{
        p: 0,
        border: 0,
        borderRadius: 1,
        overflow: "hidden",
        cursor: imageUrl ? "zoom-in" : "default",
        background: "none",
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={`Parcel photo ${index + 1}`}
          sx={{
            display: "block",
            width: 104,
            height: 104,
            objectFit: "cover",
          }}
        />
      ) : (
        <Box
          sx={{
            width: 104,
            height: 104,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
            typography: "caption",
          }}
        >
          {imageError ? "Unavailable" : "Loading"}
        </Box>
      )}
    </Box>
  );
}

export default function BuyerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedParcelPhoto, setSelectedParcelPhoto] = useState(null);

  const loadNotifications = async () => {
    try {
      setError("");
      const rows = await fetchBuyerNotifications();
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
      await markBuyerNotificationsRead();
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
              Updates about your orders, shipping, and account activity.
            </Typography>
          </Box>

          {notifications.some((notification) => !Number(notification.is_read)) && (
            <Button variant="contained" onClick={handleMarkAllRead} sx={{ borderRadius: 999, color: "common.white", textTransform: "none" }}>
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
              Your account updates will appear here.
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
                    {notification.parcel_photos?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          Parcel photos
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {notification.parcel_photos.map((photo, index) => (
                            <ParcelPhotoButton
                              key={`${notification.notification_id}-${index}`}
                              photo={photo}
                              index={index}
                              onOpen={setSelectedParcelPhoto}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {notification.tracking_url && (
                      <Button
                        component="a"
                        href={notification.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1.5, borderRadius: 999, textTransform: "none" }}
                      >
                        Track parcel
                      </Button>
                    )}
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
      <Dialog
        open={Boolean(selectedParcelPhoto)}
        onClose={() => setSelectedParcelPhoto(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton
            aria-label="Close enlarged parcel photo"
            onClick={() => setSelectedParcelPhoto(null)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: "0 !important", textAlign: "center" }}>
          {selectedParcelPhoto && (
            <Box
              component="img"
              src={selectedParcelPhoto}
              alt="Enlarged parcel"
              sx={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
