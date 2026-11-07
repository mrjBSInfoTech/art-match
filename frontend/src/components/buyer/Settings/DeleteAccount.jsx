import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";

// Transition matching ArtworkForm.jsx
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

export default function DeleteAccount({
  open,
  onClose,
  onSubmit,
  password,
  onPasswordChange,
  error,
  loading,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={Boolean(open)}
      onClose={loading ? undefined : onClose}
      disableEscapeKeyDown={loading}
      aria-labelledby="delete-account-title"
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
        id="delete-account-title"
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
        <DeleteForeverOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Delete &amp; Anonymize Buyer Account
        <Button
          aria-label="Cancel and close dialog"
          onClick={onClose}
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

      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              This action is permanent under RA 10173. Your personal profile,
              saved addresses, favorites, cart, and recommendation history will
              be erased and anonymized immediately. Active orders must be
              completed or cancelled first.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              fullWidth
              required
              size="small"
              type="password"
              label="Enter your current password to confirm"
              placeholder="Current password"
              value={password}
              onChange={onPasswordChange}
              disabled={loading}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={onClose}
            disabled={loading}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !password?.trim()}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "#ef3340",
              boxShadow: "0 2px 10px rgba(239, 51, 64, 0.3)",
              "&:hover": { backgroundColor: "#d62835" },
            }}
          >
            {loading && (
              <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
            )}
            {loading ? "Deleting..." : "Permanently Delete Account"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

