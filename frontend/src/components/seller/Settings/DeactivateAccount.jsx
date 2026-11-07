import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

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

export default function DeactivateAccountDialog({
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
      TransitionComponent={Transition}
      keepMounted
      disableRestoreFocus
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
        <WarningAmberOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Deactivate Seller Account
        <Button
          aria-label="Close"
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
        <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Alert severity="warning">
              Deactivating your seller account will block further processing,
              archive all of your unsold artwork listings, and sign you out
              immediately. Active orders must be fulfilled or resolved first.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              fullWidth
              required
              type="password"
              label="Enter your current password to confirm"
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
            color="error"
            disabled={loading}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {loading ? "Deactivating..." : "Confirm Deactivation"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

