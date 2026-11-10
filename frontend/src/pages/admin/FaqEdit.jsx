import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import { fetchFaqs, saveFaqs } from "../../api/admin/systemSettingsAPI";

const emptyFaq = () => ({ question: "", answer: "" });

export default function FaqEdit() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchFaqs();
      setFaqs(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load FAQs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const updateFaq = (index, field, value) => {
    setFaqs((current) =>
      current.map((faq, faqIndex) =>
        faqIndex === index ? { ...faq, [field]: value } : faq,
      ),
    );
  };

  const addFaq = () => {
    setFaqs((current) => [...current, emptyFaq()]);
  };

  const removeFaq = (index) => {
    setFaqs((current) => current.filter((_, faqIndex) => faqIndex !== index));
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    setError("");
    setNotice("");

    const incomplete = faqs.some(
      (faq) => !faq.question.trim() || !faq.answer.trim(),
    );
    if (incomplete) {
      setError("Every FAQ needs both a question and an answer before saving.");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveFaqs(
        faqs.map(({ question, answer }) => ({ question, answer })),
      );
      setFaqs(saved);
      setNotice("FAQs saved. They are now visible on the buyer Help & Support page.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLoadingPanel
        title="FAQ Edit"
        subtitle="Manage the frequently asked questions displayed on the buyer Help & Support page."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (error && faqs.length === 0) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>FAQ Edit</title>
        </Helmet>
        <ConnectionErrorPanel
          title="FAQ Settings Unavailable"
          message={error}
          onRetry={loadFaqs}
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
        backgroundColor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>FAQ Edit</title>
      </Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
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
            FAQ Edit
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
            Add frequently asked questions and their answers. Buyers see these
            on the Help &amp; Support page.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddRoundedIcon />}
          onClick={addFaq}
          sx={{ textTransform: "none", alignSelf: { xs: "stretch", sm: "center" } }}
        >
          Add question
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {notice}
        </Alert>
      )}

      <Stack spacing={2.5} sx={{ mt: 3 }}>
        {faqs.map((faq, index) => (
          <Paper
            key={`faq-${index}`}
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 4,
              borderColor: "divider",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 22px 48px rgba(2, 6, 23, 0.28)"
                  : "0 18px 36px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  flexShrink: 0,
                  backgroundColor: "rgba(233, 72, 72, 0.09)",
                  color: "error.main",
                }}
              >
                <HelpOutlineRoundedIcon fontSize="small" />
              </Box>
              <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  required
                  fullWidth
                  label={`Question ${index + 1}`}
                  value={faq.question}
                  onChange={(event) =>
                    updateFaq(index, "question", event.target.value)
                  }
                  error={hasAttemptedSave && !faq.question.trim()}
                  helperText={
                    hasAttemptedSave && !faq.question.trim()
                      ? "Question is required."
                      : ""
                  }
                  slotProps={{ htmlInput: { maxLength: 255 } }}
                />
                <TextField
                  required
                  fullWidth
                  multiline
                  minRows={3}
                  label={`Answer ${index + 1}`}
                  value={faq.answer}
                  onChange={(event) =>
                    updateFaq(index, "answer", event.target.value)
                  }
                  error={hasAttemptedSave && !faq.answer.trim()}
                  helperText={
                    hasAttemptedSave && !faq.answer.trim()
                      ? "Answer is required."
                      : ""
                  }
                />
              </Stack>
              <IconButton
                aria-label={`Delete question ${index + 1}`}
                color="error"
                onClick={() => removeFaq(index)}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Stack>
          </Paper>
        ))}
        {!faqs.length && (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, textAlign: "center" }}
          >
            <Typography variant="body2" color="text.secondary">
              No frequently asked questions yet. Click “Add question” to create
              the first one.
            </Typography>
          </Paper>
        )}
      </Stack>

      <Button
        variant="contained"
        color="error"
        size="large"
        startIcon={
          saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />
        }
        onClick={handleSave}
        disabled={saving}
        sx={{
          position: "fixed",
          color: "#fff",
          right: { xs: 16, sm: 28 },
          bottom: { xs: 16, sm: 28 },
          zIndex: (theme) => theme.zIndex.snackbar + 1,
          px: 3,
          py: 1.5,
          borderRadius: 2,
        }}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Box>
  );
}
