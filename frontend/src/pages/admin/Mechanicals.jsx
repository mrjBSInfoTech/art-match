import { useEffect, useState, useCallback, forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Slide,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BackupIcon from "@mui/icons-material/Backup";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import { Helmet } from "react-helmet-async";
import ThemeModeSetting from "../../components/admin/Settings/ThemeModeSetting";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import {
  fetchAccountExpirationDate,
  downloadSystemBackup,
  importSystemBackup,
  saveAccountExpirationDate,
} from "../../api/admin/systemSettingsAPI";

const Transition = forwardRef(function Transition(props, ref) {
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

const getTodayDateValue = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const MAX_BACKUP_SIZE_MB = 2048;

export default function Mechanicals() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [expirationDate, setExpirationDate] = useState("");
  const [loadingExpiration, setLoadingExpiration] = useState(true);
  const [expirationLoaded, setExpirationLoaded] = useState(false);
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState("");
  const [expirationNotice, setExpirationNotice] = useState("");

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupNotice, setBackupNotice] = useState("");
  const [importingBackup, setImportingBackup] = useState(false);
  const [backupFile, setBackupFile] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupAction, setBackupAction] = useState("");

  const cardSx = {
    width: "100%",
    p: { xs: 2, sm: 2.5, md: 3 },
    borderRadius: 3,
    bgcolor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
    border: "1px solid",
    borderColor: isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(15, 23, 42, 0.08)",
    boxShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.25)"
      : "0 4px 20px rgba(15, 23, 42, 0.04)",
  };

  const loadExpiration = useCallback(async () => {
    try {
      setLoadingExpiration(true);
      setExpirationError("");
      const { date } = await fetchAccountExpirationDate();
      setExpirationDate(date || "");
      setExpirationLoaded(true);
    } catch (error) {
      setExpirationError(error.message || "Unable to load expiration date.");
    } finally {
      setLoadingExpiration(false);
    }
  }, []);

  useEffect(() => {
    loadExpiration();
  }, [loadExpiration]);

  const handleSaveExpiration = async (event) => {
    event.preventDefault();
    if (!expirationDate) {
      setExpirationError("Choose an expiration date.");
      setExpirationNotice("");
      return;
    }
    try {
      setSavingExpiration(true);
      setExpirationError("");
      setExpirationNotice("");
      await saveAccountExpirationDate(expirationDate);
      setExpirationNotice("Shared expiration date updated successfully.");
    } catch (error) {
      setExpirationError(error.message || "Unable to save expiration date.");
    } finally {
      setSavingExpiration(false);
    }
  };

  const openExportDialog = () => {
    setBackupError("");
    setBackupNotice("");
    setBackupPassword("");
    setBackupAction("export");
    setImportDialogOpen(true);
  };

  const handleDownloadBackup = async () => {
    if (!backupPassword.trim()) {
      setBackupError("Admin password is required to export backup.");
      return;
    }
    try {
      setCreatingBackup(true);
      setBackupError("");
      setBackupNotice("");
      const { blob, filename } = await downloadSystemBackup(backupPassword);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupNotice("System backup downloaded successfully.");
      setImportDialogOpen(false);
      setBackupPassword("");
      setBackupAction("");
    } catch (error) {
      setBackupError(error.message || "Unable to create backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleBackupFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_SIZE_MB * 1024 * 1024) {
      setBackupError(
        `Backup file exceeds the ${MAX_BACKUP_SIZE_MB}MB size limit.`,
      );
      event.target.value = "";
      return;
    }
    setBackupFile(file);
    setBackupError("");
    setBackupNotice("");
    setBackupPassword("");
    setBackupAction("import");
    setImportDialogOpen(true);
    event.target.value = "";
  };

  const handleImportBackup = async () => {
    if (!backupFile) {
      setBackupError("Choose a backup ZIP file first.");
      return;
    }
    if (!backupPassword.trim()) {
      setBackupError("Admin password is required to restore backup.");
      return;
    }
    try {
      setImportingBackup(true);
      setBackupError("");
      setBackupNotice("");
      const result = await importSystemBackup(backupFile, backupPassword);
      setBackupNotice(
        result.message || "System backup restored successfully. Reloading...",
      );
      setImportDialogOpen(false);
      setBackupFile(null);
      setBackupPassword("");
      setBackupAction("");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setBackupError(error.message || "Unable to restore backup.");
    } finally {
      setImportingBackup(false);
    }
  };

  if (expirationError && !loadingExpiration && !expirationLoaded) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Mechanicals Unavailable</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Mechanicals Unavailable"
          message={expirationError}
          onRetry={loadExpiration}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Mechanicals</title>
      </Helmet>

      {/* Standard Admin Header Banner */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            Mechanicals
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
            System maintenance, shared semester reactivation schedules, and
            database disaster recovery.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        {/* Appearance & Theme Section */}
        <ThemeModeSetting />

        {/* Reactivation Time Frame Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
                flexShrink: 0,
              }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Reactivation Time Frame &amp; Semester Expiration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set the shared semester expiration date for student artist
                accounts across ArtMatch
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleSaveExpiration} noValidate>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 2,
                justifyContent: "space-between",
              }}
            >
              <TextField
                label="Shared Expiration Date"
                type="date"
                size="small"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                slotProps={{
                  htmlInput: { min: getTodayDateValue() },
                  inputLabel: { shrink: true },
                }}
                helperText="Accounts remain active through this date"
                disabled={loadingExpiration || savingExpiration}
                sx={{ minWidth: 260 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loadingExpiration || savingExpiration}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  bgcolor: "#ef3340",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {savingExpiration ? "Saving..." : "Save Expiration Date"}
              </Button>
              {loadingExpiration && (
                <CircularProgress size={24} sx={{ color: "#ef3340" }} />
              )}
            </Box>

            {expirationError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {expirationError}
              </Alert>
            )}
            {expirationNotice && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                {expirationNotice}
              </Alert>
            )}
          </Box>
        </Paper>

        {/* System Backup and Disaster Recovery Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
                flexShrink: 0,
              }}
            >
              <BackupIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                System Backup &amp; Disaster Recovery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate an encrypted full-system snapshot (database + uploads)
                or restore from an existing backup archive
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="outlined"
              onClick={openExportDialog}
              disabled={creatingBackup}
              startIcon={
                creatingBackup ? (
                  <CircularProgress size={16} />
                ) : (
                  <CloudDownloadOutlinedIcon />
                )
              }
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(15,23,42,0.2)",
                color: "text.primary",
                "&:hover": { borderColor: "#ef3340", color: "#ef3340" },
              }}
            >
              {creatingBackup
                ? "Preparing Archive..."
                : "Download System Backup (ZIP)"}
            </Button>

            <Button
              component="label"
              variant="outlined"
              color="error"
              disabled={importingBackup}
              startIcon={
                importingBackup ? (
                  <CircularProgress size={16} />
                ) : (
                  <UploadFileRoundedIcon />
                )
              }
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {importingBackup
                ? "Restoring Archive..."
                : "Import System Backup"}
              <input
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={handleBackupFileChange}
              />
            </Button>
          </Box>

          {backupError && (
            <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>
              {backupError}
            </Alert>
          )}
          {backupNotice && (
            <Alert severity="success" sx={{ mt: 2.5, borderRadius: 2 }}>
              {backupNotice}
            </Alert>
          )}
        </Paper>
      </Stack>

      {/* Backup Import / Export Confirmation Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          if (!creatingBackup && !importingBackup) {
            setImportDialogOpen(false);
            setBackupPassword("");
            setBackupAction("");
          }
        }}
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
          <BackupIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          {backupAction === "export"
            ? "Export System Backup"
            : "Confirm Backup Restoration"}
          <Button
            aria-label="Close"
            onClick={() => setImportDialogOpen(false)}
            disabled={creatingBackup || importingBackup}
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
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {backupAction === "export"
              ? "Confirm your admin master credentials to export a complete system snapshot containing active database collections and uploaded portfolios."
              : "Restoring an archive overwrites existing database state and restores uploaded media. Only proceed with trusted ArtMatch system backups."}
          </Typography>

          {backupFile && (
            <Chip
              label={`Selected File: ${backupFile.name}`}
              size="small"
              sx={{ mb: 2, fontWeight: 600 }}
            />
          )}

          <TextField
            autoFocus
            fullWidth
            required
            type="password"
            label="Admin Master Password"
            value={backupPassword}
            onChange={(e) => {
              setBackupPassword(e.target.value);
              setBackupError("");
            }}
            size="small"
            autoComplete="current-password"
          />

          {backupError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {backupError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setImportDialogOpen(false)}
            disabled={creatingBackup || importingBackup}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            color={backupAction === "export" ? "primary" : "error"}
            variant="contained"
            onClick={
              backupAction === "export"
                ? handleDownloadBackup
                : handleImportBackup
            }
            disabled={
              creatingBackup || importingBackup || !backupPassword.trim()
            }
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              ...(backupAction === "export"
                ? {
                    color: "#fff",
                    bgcolor: "#ef3340",
                    "&:hover": { bgcolor: "#d62835" },
                  }
                : {}),
            }}
          >
            {backupAction === "export"
              ? creatingBackup
                ? "Preparing..."
                : "Export Backup"
              : importingBackup
                ? "Restoring..."
                : "Replace & Restore"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
