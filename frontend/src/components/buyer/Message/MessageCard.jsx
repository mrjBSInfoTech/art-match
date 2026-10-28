import { Box, IconButton, Paper, Typography } from "@mui/material";
import CertificateMessage from "./CertificateMessage.jsx";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

const certificateLinkType = "application/vnd.artmatch.certificate-link";

export default function MessageCard({ message: msg, onViewMedia }) {
  const isMine = msg.sender === "buyer";
  return (
    <Box
      sx={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        maxWidth: { xs: "85%", sm: "70%" },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: msg.image ? 1 : 1.5,
          px: msg.image ? 1 : 2,
          borderRadius: 2.5,
          borderBottomRightRadius: isMine ? 4 : 20,
          borderBottomLeftRadius: isMine ? 20 : 4,
          bgcolor: isMine ? "primary.main" : "background.paper",
          color: isMine ? "#fff" : "text.primary",
          border: isMine ? "none" : "1px solid",
          borderColor: "divider",
        }}
      >
        {msg.image && msg.mediaType === certificateLinkType && <CertificateMessage message={msg} />}
        {msg.image && msg.mediaType !== certificateLinkType && (
          msg.mediaType?.startsWith("video/") || /\.(mp4|mov|webm|ogg|m4v)$/i.test(msg.image) ? (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxHeight: 250,
                borderRadius: 2,
                overflow: "hidden",
                mb: msg.text ? 1 : 0,
              }}
            >
              <video
                src={msg.image}a
                controls
                onClick={(event) => event.stopPropagation()}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 250,
                  objectFit: "cover",
                  background: "#000",
                }}
              />
              <IconButton
                aria-label="Enlarge video"
                onClick={() =>
                  onViewMedia({
                    src: msg.image,
                    type: "video",
                    alt: "Message video",
                  })
                }
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  color: "#fff",
                  bgcolor: "rgba(0, 0, 0, 0.6)",
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.8)" },
                }}
              >
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box
              component="img"
              src={msg.image}
              alt="Attachment — click to enlarge"
              onClick={() =>
                onViewMedia({
                  src: msg.image,
                  type: "image",
                  alt: "Message attachment",
                })
              }
              sx={{
                width: "100%",
                maxHeight: 250,
                objectFit: "cover",
                borderRadius: 2,
                mb: msg.text ? 1 : 0,
                display: "block",
                cursor: "zoom-in",
              }}
            />
          )
        )}
        {msg.text && (
          <Typography
            variant="body2"
            sx={{ lineHeight: 1.4, px: msg.image ? 1 : 0 }}
          >
            {msg.text}
          </Typography>
        )}
      </Paper>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mt: 0.5,
          textAlign: isMine ? "right" : "left",
          fontSize: "0.7rem",
        }}
      >
        {msg.time}
      </Typography>
    </Box>
  );
}
