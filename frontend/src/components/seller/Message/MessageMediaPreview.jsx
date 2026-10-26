import { Box, DialogContent } from "@mui/material";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import MessageDialog from "./MessageDialog";

export default function MessageMediaPreview({ selectedMedia, onClose, isMobile }) {
  return (
    <MessageDialog open={Boolean(selectedMedia)} onClose={onClose}
      title={selectedMedia?.alt || "Media"} titleId="message-media-preview-title"
      width={1200} fullScreen={isMobile} keepMounted={false}
      icon={<PermMediaOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />}>
      <DialogContent dividers
        sx={{
          display: "grid",
          placeItems: "center",
          p: { xs: 1, sm: 2 },
        }}
      >
        {selectedMedia?.type === "video" ? (
          <Box
            component="video"
            src={selectedMedia.src}
            controls
            autoPlay
            sx={{ maxWidth: "100%", maxHeight: "80vh" }}
          />
        ) : selectedMedia ? (
          <Box
            component="img"
            src={selectedMedia.src}
            alt={selectedMedia.alt}
            sx={{
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
            }}
          />
        ) : null}
      </DialogContent>
    </MessageDialog>
  );
}
