import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function ChatRecoveryDialog({
  mode,
  busy = false,
  error = "",
  onSubmit,
  onReset,
}) {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState(false);
  useEffect(() => {
    setPin("");
    setConfirmation("");
    setResetConfirmation(false);
  }, [mode]);

  const isSetup = mode === "setup";
  const isFreshKey = mode === "fresh";
  const valid = /^\d{6}$/.test(pin)
    && (!isSetup || (pin === confirmation && /^\d{6}$/.test(confirmation)));

  const submit = () => {
    if (valid && !busy) onSubmit(pin);
  };

  return (
    <>
      <Dialog open={Boolean(mode)} disableEscapeKeyDown fullWidth maxWidth="xs">
        <DialogTitle>
          {isFreshKey ? "No chat recovery backup found" : isSetup ? "Set up chat recovery PIN" : "Restore your chats"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isFreshKey
                ? "This account already has a secure chat key, but this device has no copy and no recovery backup exists. Existing encrypted messages cannot be recovered. You can create a new key to continue messaging."
                : isSetup
                ? "Create a six-digit PIN to protect an encrypted backup of your secure chat key. You’ll need it to restore chat history on another device. Your PIN is never sent to ArtMatch; the key is encrypted on this device before backup."
                : "Enter the six-digit PIN you created to unlock your encrypted chat-key backup on this device."}
            </Typography>
            {isSetup && (
              <Typography variant="body2" color="warning.main">
                If this device has no saved chat key and no backup exists, messages encrypted with an older key cannot be recovered. A six-digit PIN is easier to guess than a long password; keep your account secure and do not reuse a sensitive PIN.
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              fullWidth
              label="Six-digit PIN"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 }}
            />
            {isSetup && (
              <TextField
                fullWidth
                label="Confirm PIN"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputProps={{ inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6 }}
                error={Boolean(confirmation) && confirmation !== pin}
                helperText={confirmation && confirmation !== pin ? "PINs do not match" : ""}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              Keep this PIN safe. If you forget it, your old encrypted chat history cannot be restored.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          {!isSetup && !isFreshKey ? (
            <Button color="error" disabled={busy} onClick={() => setResetConfirmation(true)}>
              Forgot PIN?
            </Button>
          ) : <span />}
          <Button
            variant="contained"
            disabled={busy || (!isFreshKey && !valid)}
            onClick={isFreshKey ? onReset : submit}
          >
            {busy ? "Securing chats..." : isFreshKey ? "Create a new key" : isSetup ? "Save PIN" : "Restore chats"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={resetConfirmation} onClose={() => !busy && setResetConfirmation(false)} fullWidth maxWidth="xs">
        <DialogTitle>Start with a new chat key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently makes your existing encrypted chat history unavailable on this account key. You can create a new PIN and use secure messaging going forward. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setResetConfirmation(false)}>Cancel</Button>
          <Button
            color="error"
            disabled={busy}
            onClick={async () => {
              await onReset();
              setResetConfirmation(false);
              setPin("");
              setConfirmation("");
            }}
          >
            Start fresh
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
