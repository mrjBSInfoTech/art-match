import { Button, DialogActions, DialogContent, Typography } from "@mui/material";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import MessageDialog from "./MessageDialog";

export default function MessageBlock({ open, onClose, onConfirm, isReturnConversation = false }) {
  return (
    <MessageDialog open={open} onClose={onClose} title="Block user" titleId="message-block-title"
      icon={<BlockOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />}>
      <DialogContent dividers>
        <Typography color="text.secondary">
          You and this user will no longer be able to send messages to each other.
          {isReturnConversation && " Return requests and their actions remain available."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>Block user</Button>
      </DialogActions>
    </MessageDialog>
  );
}
