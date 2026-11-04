import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  formatRecoveryKey,
  generateRecoveryKey,
} from "../../utils/chatEncryption";

export default function ChatRecoveryDialog({
  mode,
  busy = false,
  error = "",
  onSubmit,
  onReset,
  onSkip,
}) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saved, setSaved] = useState(false);
  const [enteredKey, setEnteredKey] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const isSetup = mode === "setup" || mode === "upgrade";
  const isRestore = mode === "restore-key";
  const isFresh = mode === "fresh";

  useEffect(() => {
    if (!mode) {
      setRecoveryKey("");
      setConfirmation("");
      setSaved(false);
      setEnteredKey("");
      setResetConfirmation(false);
      return;
    }
    if (isSetup) {
      setRecoveryKey(generateRecoveryKey());
      setConfirmation("");
      setSaved(false);
    }
    if (!isRestore) setEnteredKey("");
  }, [mode, isRestore, isSetup]);

  const normalizedEnteredKey = enteredKey.replace(/\s/g, "").toUpperCase();
  const validSetup = saved
    && confirmation.toUpperCase() === recoveryKey.slice(-4)
    && recoveryKey.length === 24;
  const validRestore = /^[A-Z2-7]{24}$/.test(normalizedEnteredKey);

  const submit = () => {
    if (busy) return;
    if (isSetup && validSetup) onSubmit(recoveryKey);
    if (isRestore && validRestore) onSubmit(normalizedEnteredKey);
  };

  const copyRecoveryKey = async () => {
    await navigator.clipboard.writeText(formatRecoveryKey(recoveryKey));
  };

  const downloadRecoveryKey = () => {
    const blob = new Blob([`${formatRecoveryKey(recoveryKey)}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "artmatch-chat-recovery-key.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={Boolean(mode)} disableEscapeKeyDown fullWidth maxWidth="xs">
        <DialogTitle>
          {isFresh
            ? "No chat recovery backup found"
            : isRestore
            ? "Restore your chats"
            : mode === "upgrade"
            ? "Upgrade your chat recovery"
            : "Create your chat recovery key"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isFresh
                ? "This account has an existing secure chat key, but this device has no copy and no recovery backup. Existing encrypted messages cannot be recovered. You can create a new key to continue messaging."
                : isRestore
                ? "Enter the 24-character recovery key saved when this backup was created."
                : mode === "upgrade"
                ? "Replace your legacy PIN backup with a stronger recovery key. The old PIN-encrypted backup will be replaced on the server."
                : "This key protects an encrypted backup of your secure chat key. It is shown only once. Losing it means old encrypted messages cannot be recovered."}
            </Typography>
            {isSetup && (
              <>
                <Alert severity="warning">
                  Save this key before continuing. It cannot be shown again.
                </Alert>
                <Typography
                  component="code"
                  sx={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: 1.5, textAlign: "center" }}
                >
                  {formatRecoveryKey(recoveryKey)}
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button variant="outlined" onClick={copyRecoveryKey}>Copy</Button>
                  <Button variant="outlined" onClick={downloadRecoveryKey}>Download</Button>
                </Stack>
                <FormControlLabel
                  control={<Checkbox checked={saved} onChange={(event) => setSaved(event.target.checked)} />}
                  label="I saved my recovery key in a safe place."
                />
                <TextField
                  label="Re-enter the last 4 characters"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value.replace(/[^a-z2-7]/gi, "").slice(0, 4))}
                  inputProps={{ maxLength: 4, style: { textTransform: "uppercase" } }}
                />
              </>
            )}
            {isRestore && (
              <TextField
                autoFocus
                fullWidth
                label="Recovery key"
                value={enteredKey}
                onChange={(event) => setEnteredKey(event.target.value.slice(0, 29))}
                helperText="24 characters using A-Z and 2-7"
              />
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          {mode === "upgrade" ? (
            <Button color="inherit" disabled={busy} onClick={onSkip}>Not now</Button>
          ) : isFresh ? (
            <Button color="error" disabled={busy} onClick={onReset}>Create a new key</Button>
          ) : (
            <span />
          )}
          {!isFresh && (
            <Button
              variant="contained"
              disabled={busy || (isSetup && !validSetup) || (isRestore && !validRestore)}
              onClick={submit}
            >
              {busy ? "Securing chats..." : isRestore ? "Restore chats" : "Finish"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={resetConfirmation} onClose={() => !busy && setResetConfirmation(false)} fullWidth maxWidth="xs">
        <DialogTitle>Start with a new chat key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently makes existing encrypted chat history unavailable on this account key.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setResetConfirmation(false)}>Cancel</Button>
          <Button color="error" disabled={busy} onClick={onReset}>Start fresh</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
