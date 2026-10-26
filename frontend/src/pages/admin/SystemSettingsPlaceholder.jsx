import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import { Helmet } from "react-helmet-async";
import ThemeModeSetting from "../../components/settings/ThemeModeSetting";
import {
  fetchAccountExpirationDate,
  saveAccountExpirationDate,
} from "../../api/admin/systemSettingsAPI";

const getTodayDateValue = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

export default function SystemSettingsPlaceholder({ title }) {
  const [expirationDate, setExpirationDate] = useState("");
  const [loadingExpiration, setLoadingExpiration] = useState(true);
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState("");
  const [expirationNotice, setExpirationNotice] = useState("");

  useEffect(() => {
    if (title !== "Mechanicals") return undefined;

    let active = true;
    fetchAccountExpirationDate()
      .then(({ date }) => {
        if (active) setExpirationDate(date);
      })
      .catch((error) => {
        if (active) setExpirationError(error.message);
      })
      .finally(() => {
        if (active) setLoadingExpiration(false);
      });
    return () => {
      active = false;
    };
  }, [title]);

  const handleSaveExpiration = async (event) => {
    event.preventDefault();
    if (!expirationDate) {
      setExpirationError("Choose an expiration date.");
      setExpirationNotice("");
      return;
    }

    setSavingExpiration(true);
    setExpirationError("");
    setExpirationNotice("");
    try {
      const result = await saveAccountExpirationDate(expirationDate);
      setExpirationDate(result.date);
      setExpirationNotice(
        `Expiration date saved. ${result.updatedAccounts} existing account(s) updated. All student/seller accounts remain active through ${result.date}.`,
      );
    } catch (error) {
      setExpirationError(error.message);
    } finally {
      setSavingExpiration(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, width: "100%", boxSizing: "border-box" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{title}</title>
      </Helmet>
      <Typography variant="h3" fontWeight={800}>
        {title}
      </Typography>
      {title === "Mechanicals" && (
        <Stack spacing={3} sx={{ mt: 3 }}>
          <ThemeModeSetting />
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Stack
              component="form"
              onSubmit={handleSaveExpiration}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Reactivation Time Frame
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set the shared expiration date for student/seller accounts.
                  Saving applies it to existing accounts and future registrations.
                </Typography>
              </Box>
              <TextField
                label="Expiration date"
                type="date"
                value={expirationDate}
                onChange={(event) => setExpirationDate(event.target.value)}
                slotProps={{
                  htmlInput: {
                    min: getTodayDateValue(),
                  },
                  inputLabel: { shrink: true },
                }}
                helperText="Accounts remain active through this date"
                disabled={loadingExpiration || savingExpiration}
                sx={{ width: { xs: "100%", sm: 220 } }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loadingExpiration || savingExpiration}
                sx={{ textTransform: "none" }}
              >
                {savingExpiration ? "Saving..." : "Save"}
              </Button>
              {loadingExpiration && <CircularProgress size={24} />}
            </Stack>
            {expirationError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {expirationError}
              </Alert>
            )}
            {expirationNotice && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {expirationNotice}
              </Alert>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
            >
              <BackupIcon color="action" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" fontWeight={700}>
                  Backup
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Backup and restore options will be available here.
                </Typography>
              </Box>
              <Button variant="outlined" disabled sx={{ textTransform: "none" }}>
                Backup
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
