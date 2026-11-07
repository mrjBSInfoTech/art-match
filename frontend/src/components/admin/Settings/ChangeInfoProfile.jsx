import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Alert,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

function ChangeInfoProfile({
  open,
  handleClose,
  password,
  onPasswordChange,
  error,
  loading,
  onConfirm,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={Boolean(open)}
      onClose={loading ? undefined : handleClose}
      disableRestoreFocus
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <LockOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Confirm Your Password
        <Button
          aria-label="Close"
          onClick={handleClose}
          disabled={loading}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          Enter your current password to confirm these account changes.
        </Alert>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Current Password"
          value={password}
          onChange={onPasswordChange}
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === "Enter") onConfirm();
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          disabled={loading}
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
            backgroundColor: "#ef3340",
            "&:hover": { backgroundColor: "#d62835" },
          }}
        >
          {loading ? "Verifying..." : "Confirm & Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangeInfoProfile;
