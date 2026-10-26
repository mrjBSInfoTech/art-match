import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import MessageDialog from "./MessageDialog";
import MessageMediaCard from "./MessageMediaCard";

export default function MessageMedia({ open, onClose, sharedMedia, onViewMedia }) {
  return (
    <MessageDialog open={open} onClose={onClose} title="Photos and videos" titleId="message-media-title"
      width={900} keepMounted={false}
      icon={<PermMediaOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />}>
      <DialogContent dividers>
        {sharedMedia.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 100%), 1fr))",
              gap: 1.5,
            }}
          >
            {sharedMedia.map((media) => (
              <MessageMediaCard key={media.id} media={media} onViewMedia={onViewMedia} />
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">
            No photos or videos in this conversation yet.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Close</Button>
      </DialogActions>
    </MessageDialog>
  );
}
