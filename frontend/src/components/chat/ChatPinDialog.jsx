import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PinInput from "./PinInput";

// mode: "create" -> pick a new six-digit PIN and confirm it
//       "enter"  -> type the existing six-digit PIN
export default function ChatPinDialog({
  open,
  mode = "enter",
  busy = false,
  error = "",
  onSubmit,
  onReset,
}) {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const pinInputRef = useRef(null);
  const confirmationInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setConfirmation("");
    setMessage("");
  }, [open, mode]);

  const isCreate = mode === "create";

  const submit = (enteredPin = pin, enteredConfirmation = confirmation) => {
    if (busy) return;
    if (!/^\d{6}$/.test(enteredPin)) {
      setMessage("Enter all six digits");
      return;
    }
    if (isCreate && enteredConfirmation !== enteredPin) {
      setMessage("The two PINs do not match");
      setConfirmation("");
      confirmationInputRef.current?.focus();
      return;
    }
    setMessage("");
    onSubmit(enteredPin);
  };

  const handlePinComplete = (enteredPin) => {
    if (isCreate) confirmationInputRef.current?.focus();
    else submit(enteredPin, "");
  };

  const handleConfirmationComplete = (enteredConfirmation) => {
    submit(pin, enteredConfirmation);
  };

  const valid = /^\d{6}$/.test(pin) && (!isCreate || pin === confirmation);

  return (
    <>
      <Dialog
        open={open}
        disableEscapeKeyDown
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3, px: 1 } }}
        TransitionProps={{ onEntered: () => pinInputRef.current?.focus() }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack alignItems="center" spacing={1.5} sx={{ pt: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              {busy ? <CircularProgress size={24} color="inherit" /> : <LockOutlinedIcon />}
            </Box>
            <Typography variant="h6" component="span" textAlign="center">
              {isCreate ? "Create your recovery PIN" : "Enter your recovery PIN"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="stretch" sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {isCreate
                ? "Choose a six-digit PIN to protect an encrypted backup of your secure chat key. You will enter it to unlock your chats on another device. It never leaves this device, and it cannot be recovered if you forget it."
                : "Type the six-digit PIN you created when you set up secure messaging to unlock your chats on this device."}
            </Typography>
            {(message || error) && (
              <Alert severity="error">{message || error}</Alert>
            )}
            <Typography variant="caption" color="text.secondary" textAlign="center">
              {isCreate ? "New PIN" : "PIN"}
            </Typography>
            <PinInput
              value={pin}
              onChange={(next) => {
                setPin(next);
                setMessage("");
              }}
              onComplete={handlePinComplete}
              disabled={busy}
              error={Boolean(message || error)}
              firstInputRef={pinInputRef}
              ariaLabel={isCreate ? "New PIN" : "Recovery PIN"}
            />
            {isCreate && (
              <>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Confirm PIN
                </Typography>
                <PinInput
                  value={confirmation}
                  onChange={(next) => {
                    setConfirmation(next);
                    setMessage("");
                  }}
                  onComplete={handleConfirmationComplete}
                  disabled={busy}
                  error={Boolean(message === "The two PINs do not match")}
                  firstInputRef={confirmationInputRef}
                  ariaLabel="Confirm PIN"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2.5, pt: 0.5 }}>
          {!isCreate && onReset ? (
            <Button
              color="inherit"
              sx={{ textTransform: "none" }}
              disabled={busy}
              onClick={() => setResetConfirmation(true)}
            >
              Forgot PIN?
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="contained"
            sx={{ borderRadius: 999, px: 3, textTransform: "none" }}
            disabled={busy || !valid}
            onClick={() => submit()}
          >
            {busy ? "Please wait..." : isCreate ? "Create PIN" : "Unlock chats"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={resetConfirmation}
        onClose={() => !busy && setResetConfirmation(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Start with a new chat key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Without your PIN, your previous encrypted chat history cannot be read on
            this account key. You can create a new key to keep messaging securely from
            now on. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setResetConfirmation(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={busy}
            onClick={async () => {
              await onReset();
              setResetConfirmation(false);
            }}
          >
            Start fresh
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
