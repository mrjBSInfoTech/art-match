import { Button, DialogActions, DialogContent, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MessageDialog from "./MessageDialog";

export default function MessageDelete({ open, onClose, onConfirm, isReturnConversation = false }) {
  return (
    <MessageDialog open={open} onClose={onClose} title="Delete chat" titleId="message-delete-title"
      icon={<DeleteOutlineIcon sx={{ color: "#ef3340", fontSize: 20 }} />}>
      <DialogContent dividers>
        <Typography color="text.secondary">
          Both people lose this conversation and its messages. Anyone can send a new message later, and that starts a fresh chat.
          {isReturnConversation && " Return requests and their actions remain available."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>Delete chat</Button>
      </DialogActions>
    </MessageDialog>
  );
}
