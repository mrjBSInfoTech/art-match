import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  formatRecoveryKey,
  generateRecoveryKey,
} from "../../utils/chatEncryption";

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

export default function ChatRecoveryDialog({
  mode,
  busy = false,
  error = "",
  onSubmit,
  onReset,
  onSkip,
}) {
  const theme = useTheme();
  const [recoveryKey, setRecoveryKey] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saved, setSaved] = useState(false);
  const [enteredKey, setEnteredKey] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const isSetup = mode === "setup" || mode === "upgrade";
  const isRestore = mode === "restore-key";
  const isFresh = mode === "fresh";

  const dialogTitle = isFresh
    ? "No chat recovery backup found"
    : isRestore
    ? "Restore your chats"
    : mode === "upgrade"
    ? "Upgrade your chat recovery"
    : "Create your chat recovery key";

  const dialogDescription = isFresh
    ? "This account has an existing secure chat key, but this device has no copy and no recovery backup. Existing encrypted messages cannot be recovered. You can create a new key to continue messaging."
    : isRestore
    ? "Enter the 24-character recovery key saved when this backup was created."
    : mode === "upgrade"
    ? "Replace your legacy PIN backup with a stronger recovery key. The old PIN-encrypted backup will be replaced on the server."
    : "This key protects an encrypted backup of your secure chat key. It is shown only once. Losing it means old encrypted messages cannot be recovered.";

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
      <Dialog
        open={Boolean(mode)}
        disableEscapeKeyDown
        TransitionComponent={Transition}
        keepMounted
        fullWidth
        maxWidth="xs"
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
          {dialogTitle}
          <Button
            aria-label="Close chat recovery dialog"
            onClick={() => {
              if (!busy && onSkip) onSkip();
            }}
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
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {dialogDescription}
              </Typography>
            </Box>

            {isSetup && (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <Stack spacing={1.75}>
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Save this key before continuing. It cannot be shown again.
                  </Alert>

                  <Box
                    component="div"
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      backgroundColor: theme.palette.grey[100],
                      px: 1.5,
                      py: 1.25,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      component="code"
                      sx={{
                        display: "block",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        color: theme.palette.text.primary,
                        wordBreak: "break-word",
                      }}
                    >
                      {formatRecoveryKey(recoveryKey)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button variant="outlined" onClick={copyRecoveryKey}>Copy</Button>
                    <Button variant="outlined" onClick={downloadRecoveryKey}>Download</Button>
                  </Stack>

                  <FormControlLabel
                    control={<Checkbox checked={saved} onChange={(event) => setSaved(event.target.checked)} />}
                    label="I saved my recovery key in a safe place."
                    sx={{ m: 0 }}
                  />

                  <TextField
                    label="Re-enter the last 4 characters"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value.replace(/[^a-z2-7]/gi, "").slice(0, 4))}
                    inputProps={{ maxLength: 4, style: { textTransform: "uppercase" } }}
                    fullWidth
                  />
                </Stack>
              </Box>
            )}

            {isRestore && (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <TextField
                  autoFocus
                  fullWidth
                  label="Recovery key"
                  value={enteredKey}
                  onChange={(event) => setEnteredKey(event.target.value.slice(0, 29))}
                  helperText="24 characters using A-Z and 2-7"
                />
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: mode === "upgrade" || isFresh ? "space-between" : "flex-end",
            gap: 1,
          }}
        >
          {mode === "upgrade" ? (
            <Button color="inherit" disabled={busy} onClick={onSkip}>Not now</Button>
          ) : isFresh ? (
            <Button color="error" disabled={busy} onClick={onReset}>Create a new key</Button>
          ) : (
            <Box sx={{ flex: 1, minWidth: 0 }} />
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
