import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { fetchAboutContent, saveAboutContent } from "../../api/aboutContentAPI";

const requiredTextFields = [
  "collegeName",
  "tagline",
  "introduction",
  "vision",
  "mission",
  "history",
];

function validateAboutContent(content) {
  const errors = {};
  for (const field of requiredTextFields) {
    if (!content[field]?.trim()) errors[field] = "This field is required.";
  }
  for (const field of ["goals", "objectives"]) {
    if (!content[field].length) errors[field] = `Add at least one ${field.slice(0, -1)}.`;
    content[field].forEach((value, index) => {
      if (!value.trim()) errors[`${field}.${index}`] = "This entry is required.";
    });
  }
  if (!content.offerings.length) errors.offerings = "Add at least one academic offering.";
  content.offerings.forEach((offering, index) => {
    if (!offering.title.trim()) errors[`offerings.${index}.title`] = "Offering name is required.";
    if (!offering.description.trim()) errors[`offerings.${index}.description`] = "Description is required.";
  });
  content.contacts.forEach((contact, index) => {
    if (!contact.label.trim()) errors[`contacts.${index}.label`] = "Contact label is required.";
    if (!contact.value.trim()) errors[`contacts.${index}.value`] = "Contact details are required.";
  });
  return errors;
}

function ContentSection({ title, description, children, action }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        p: { xs: 2, sm: 2.5, md: 3 },
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

export default function SystemSetting() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [confirmationPassword, setConfirmationPassword] = useState("");

  useEffect(() => {
    let active = true;
    fetchAboutContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setContent((current) => ({ ...current, [field]: value }));
  };

  const updateListItem = (field, index, key, value) => {
    setContent((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index
          ? typeof item === "string"
            ? value
            : { ...item, [key]: value }
          : item,
      ),
    }));
  };

  const addListItem = (field) => {
    setContent((current) => ({
      ...current,
      [field]: [
        ...current[field],
        field === "goals" || field === "objectives"
          ? ""
          : field === "offerings"
            ? { title: "", description: "" }
            : { label: "", value: "" },
      ],
    }));
  };

  const removeListItem = (field, index) => {
    setContent((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    const validationErrors = validateAboutContent(content);
    if (Object.keys(validationErrors).length) {
      setError("Complete all required fields before saving. Goals, objectives, and academic offerings must each have at least one entry.");
      setNotice("");
      return;
    }

    setError("");
    setNotice("");
    setConfirmationPassword("");
    setPasswordDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!confirmationPassword) {
      setError("Enter your admin password to save About Us changes.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAboutContent(content, confirmationPassword);
      setContent(saved);
      setNotice("About page content saved successfully.");
      setConfirmationPassword("");
      setPasswordDialogOpen(false);
    } catch (saveError) {
      try {
        setContent(await fetchAboutContent());
        setError(saveError.message);
      } catch (reloadError) {
        setError(`${saveError.message} Could not reload saved content: ${reloadError.message}`);
      }
      setConfirmationPassword("");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          minHeight: "100vh",
          backgroundColor: (theme) => theme.palette.background.default,
          color: (theme) => theme.palette.text.primary,
        }}
      >
        <Helmet titleTemplate="%s - ArtMatch">
          <title>About Us</title>
        </Helmet>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          About Us Content
        </Typography>
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 300 }}>
          <CircularProgress />
        </Box>
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
        <title>About Us</title>
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
            About Us Content
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.75, fontSize: 13 }}
          >
            Edit the information shown on the public About Us page.
          </Typography>
        </Box>
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
      {!content ? null : (
        <Stack spacing={2.5} sx={{ mt: 3 }}>
          <ContentSection title="Institution profile">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, lg: 6 }}>
                  <TextField required label="College name" value={content.collegeName} onChange={(event) => updateField("collegeName", event.target.value)} error={hasAttemptedSave && !content.collegeName.trim()} helperText={hasAttemptedSave && !content.collegeName.trim() ? "This field is required." : ""} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                  <TextField required label="Tagline" value={content.tagline} onChange={(event) => updateField("tagline", event.target.value)} error={hasAttemptedSave && !content.tagline.trim()} helperText={hasAttemptedSave && !content.tagline.trim() ? "This field is required." : ""} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                  <TextField required label="Introduction" value={content.introduction} onChange={(event) => updateField("introduction", event.target.value)} error={hasAttemptedSave && !content.introduction.trim()} helperText={hasAttemptedSave && !content.introduction.trim() ? "This field is required." : ""} fullWidth multiline minRows={4} />
              </Grid>
            </Grid>
          </ContentSection>

          <ContentSection title="Vision & mission">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <TextField required label="Vision" value={content.vision} onChange={(event) => updateField("vision", event.target.value)} error={hasAttemptedSave && !content.vision.trim()} helperText={hasAttemptedSave && !content.vision.trim() ? "This field is required." : ""} fullWidth multiline minRows={4} />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <TextField required label="Mission" value={content.mission} onChange={(event) => updateField("mission", event.target.value)} error={hasAttemptedSave && !content.mission.trim()} helperText={hasAttemptedSave && !content.mission.trim() ? "This field is required." : ""} fullWidth multiline minRows={4} />
              </Grid>
            </Grid>
          </ContentSection>

          {["goals", "objectives"].map((field) => (
            <ContentSection
              key={field}
              title={field === "goals" ? "Goals" : "Objectives"}
              description={`Add, edit, or remove ${field}.`}
              action={<Button startIcon={<AddRoundedIcon />} onClick={() => addListItem(field)}>Add {field === "goals" ? "goal" : "objective"}</Button>}
            >
              <Stack spacing={2}>
                {content[field].map((item, index) => (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" key={`${field}-${index}`} sx={{ width: "100%" }}>
                    <TextField
                      label={`${field === "goals" ? "Goal" : "Objective"} ${index + 1}`}
                      value={item}
                      onChange={(event) => updateListItem(field, index, "", event.target.value)}
                      required
                      error={hasAttemptedSave && !item.trim()}
                      helperText={hasAttemptedSave && !item.trim() ? "This entry is required." : ""}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                    <IconButton aria-label={`Delete ${field.slice(0, -1)}`} color="error" disabled={content[field].length <= 1} onClick={() => removeListItem(field, index)}>
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>
                ))}
                {!content[field].length && <Typography variant="body2" color="text.secondary">No {field} added.</Typography>}
              </Stack>
            </ContentSection>
          ))}

          <ContentSection title="Brief history or background">
            <TextField required label="History / background" value={content.history} onChange={(event) => updateField("history", event.target.value)} error={hasAttemptedSave && !content.history.trim()} helperText={hasAttemptedSave && !content.history.trim() ? "This field is required." : ""} fullWidth multiline minRows={8} />
          </ContentSection>

          <ContentSection
            title="Academic offerings"
            description="Manage each program and its description."
            action={<Button startIcon={<AddRoundedIcon />} onClick={() => addListItem("offerings")}>Add offering</Button>}
          >
            <Grid container spacing={2}>
              {content.offerings.map((offering, index) => (
                <Grid size={{ xs: 12, xl: 6 }} key={`offering-${index}`}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      height: "100%",
                      borderRadius: 3,
                      borderColor: "divider",
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.84))"
                          : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Stack spacing={2} sx={{ flex: 1 }}>
                        <TextField required label="Offering name" value={offering.title} onChange={(event) => updateListItem("offerings", index, "title", event.target.value)} error={hasAttemptedSave && !offering.title.trim()} helperText={hasAttemptedSave && !offering.title.trim() ? "Offering name is required." : ""} fullWidth />
                        <TextField required label="Description" value={offering.description} onChange={(event) => updateListItem("offerings", index, "description", event.target.value)} error={hasAttemptedSave && !offering.description.trim()} helperText={hasAttemptedSave && !offering.description.trim() ? "Description is required." : ""} fullWidth multiline minRows={2} />
                      </Stack>
                      <IconButton aria-label="Delete offering" color="error" disabled={content.offerings.length <= 1} onClick={() => removeListItem("offerings", index)}><DeleteOutlineRoundedIcon /></IconButton>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
              {!content.offerings.length && <Grid size={{ xs: 12 }}><Typography variant="body2" color="text.secondary">No academic offerings added.</Typography></Grid>}
            </Grid>
          </ContentSection>

          <ContentSection
            title="Contact details"
            description="Manage the contact label and information shown to visitors."
            action={<Button startIcon={<AddRoundedIcon />} onClick={() => addListItem("contacts")}>Add contact</Button>}
          >
            <Stack spacing={2}>
              {content.contacts.map((contact, index) => (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-start" }} key={`contact-${index}`}>
                  <TextField required label="Label" value={contact.label} onChange={(event) => updateListItem("contacts", index, "label", event.target.value)} error={hasAttemptedSave && !contact.label.trim()} helperText={hasAttemptedSave && !contact.label.trim() ? "Contact label is required." : ""} sx={{ flex: 1 }} />
                  <TextField required label="Details" value={contact.value} onChange={(event) => updateListItem("contacts", index, "value", event.target.value)} error={hasAttemptedSave && !contact.value.trim()} helperText={hasAttemptedSave && !contact.value.trim() ? "Contact details are required." : ""} sx={{ flex: 2 }} />
                  <IconButton aria-label="Delete contact detail" color="error" onClick={() => removeListItem("contacts", index)}><DeleteOutlineRoundedIcon /></IconButton>
                </Stack>
              ))}
              {!content.contacts.length && <Typography variant="body2" color="text.secondary">No contact details added.</Typography>}
            </Stack>
          </ContentSection>
        </Stack>
      )}
      {content && (
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
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
      )}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {SystemSetting
          if (!saving) {
            setPasswordDialogOpen(false);
            setConfirmationPassword("");
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm your password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your admin password to save these About Us changes.
          </DialogContentText>
          <TextField
            autoFocus
            required
            fullWidth
            type="password"
            label="Admin password"
            value={confirmationPassword}
            onChange={(event) => setConfirmationPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && confirmationPassword && !saving) {
                handleConfirmSave();
              }
            }}
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setPasswordDialogOpen(false);
              setConfirmationPassword("");
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSave}
            disabled={!confirmationPassword || saving}
          >
            {saving ? "Saving…" : "Confirm & save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
