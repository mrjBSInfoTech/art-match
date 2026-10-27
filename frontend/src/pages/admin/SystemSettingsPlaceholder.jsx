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
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();
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
        <title>{title}</title>
      </Helmet>
      <Box>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
      </Box>
      {title === "Mechanicals" && (
        <Stack
          spacing={2.5}
          sx={{
            mt: 3,
            "& .MuiPaper-root": {
              borderRadius: 4,
              borderColor: "divider",
              background: (currentTheme) =>
                currentTheme.palette.mode === "dark"
                  ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
              boxShadow: (currentTheme) =>
                currentTheme.palette.mode === "dark"
                  ? "0 22px 48px rgba(2, 6, 23, 0.28)"
                  : "0 18px 36px rgba(15, 23, 42, 0.08)",
            },
          }}
        >
          <ThemeModeSetting />
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
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
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
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
