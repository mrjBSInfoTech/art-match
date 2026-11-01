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
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { fetchAboutContent, saveAboutContent } from "../../api/aboutContentAPI";
import { fetchFooterContent, saveFooterContent } from "../../api/footerContentAPI";

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

function validateFooterContent(content) {
  if (!content.brandName.trim()) return "Enter a footer brand name.";
  if (!content.description.trim()) return "Enter a footer description.";
  if (!content.copyright.trim()) return "Enter footer copyright text.";
  if (content.columns.length > 6) return "A maximum of 6 link columns is allowed.";
  for (const column of content.columns) {
    if (!column.title.trim()) return "Every link column needs a title.";
    if (column.links.length > 20) return "A maximum of 20 links per column is allowed.";
    for (const link of column.links) {
      if (!link.label.trim()) return "Every footer link needs a label.";
      if (!isValidFooterUrl(link.url)) {
        return "Footer links must use a relative path or a valid HTTP(S) URL.";
      }
    }
  }
  if (content.socials.length > 10) return "A maximum of 10 social links is allowed.";
  for (const social of content.socials) {
    if (social.url && !isValidFooterUrl(social.url, true)) {
      return "Social links must use a valid HTTP(S) URL.";
    }
  }
  return "";
}

function isValidFooterUrl(value, externalOnly = false) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (!externalOnly && value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
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
  const [activeSection, setActiveSection] = useState("about-us");
  const [content, setContent] = useState(null);
  const [footerContent, setFooterContent] = useState(null);
  const [footerLoading, setFooterLoading] = useState(true);
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

  useEffect(() => {
    let active = true;
    fetchFooterContent()
      .then((data) => {
        if (active) setFooterContent(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setFooterLoading(false);
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

  const updateFooterField = (field, value) => {
    setFooterContent((current) => ({ ...current, [field]: value }));
  };

  const updateFooterColumn = (columnIndex, field, value) => {
    setFooterContent((current) => ({
      ...current,
      columns: current.columns.map((column, index) =>
        index === columnIndex ? { ...column, [field]: value } : column,
      ),
    }));
  };

  const updateFooterLink = (columnIndex, linkIndex, field, value) => {
    setFooterContent((current) => ({
      ...current,
      columns: current.columns.map((column, index) =>
        index === columnIndex
          ? {
              ...column,
              links: column.links.map((link, itemIndex) =>
                itemIndex === linkIndex ? { ...link, [field]: value } : link,
              ),
            }
          : column,
      ),
    }));
  };

  const updateFooterSocial = (socialIndex, field, value) => {
    setFooterContent((current) => ({
      ...current,
      socials: current.socials.map((social, index) =>
        index === socialIndex ? { ...social, [field]: value } : social,
      ),
    }));
  };

  const addFooterColumn = () => {
    setFooterContent((current) => ({
      ...current,
      columns: [...current.columns, { title: "", links: [] }],
    }));
  };

  const addFooterLink = (columnIndex) => {
    setFooterContent((current) => ({
      ...current,
      columns: current.columns.map((column, index) =>
        index === columnIndex
          ? { ...column, links: [...column.links, { label: "", url: "" }] }
          : column,
      ),
    }));
  };

  const removeFooterColumn = (columnIndex) => {
    setFooterContent((current) => ({
      ...current,
      columns: current.columns.filter((_, index) => index !== columnIndex),
    }));
  };

  const removeFooterLink = (columnIndex, linkIndex) => {
    setFooterContent((current) => ({
      ...current,
      columns: current.columns.map((column, index) =>
        index === columnIndex
          ? {
              ...column,
              links: column.links.filter((_, itemIndex) => itemIndex !== linkIndex),
            }
          : column,
      ),
    }));
  };

  const addFooterSocial = () => {
    setFooterContent((current) => ({
      ...current,
      socials: [...current.socials, { platform: "Instagram", url: "" }],
    }));
  };

  const removeFooterSocial = (socialIndex) => {
    setFooterContent((current) => ({
      ...current,
      socials: current.socials.filter((_, index) => index !== socialIndex),
    }));
  };

  const handleSave = async () => {
    if (activeSection === "footer") {
      const validationError = validateFooterContent(footerContent);
      if (validationError) {
        setError(validationError);
        setNotice("");
        return;
      }
    } else {
      setHasAttemptedSave(true);
      const validationErrors = validateAboutContent(content);
      if (Object.keys(validationErrors).length) {
        setError("Complete all required fields before saving. Goals, objectives, and academic offerings must each have at least one entry.");
        setNotice("");
        return;
      }
    }

    setError("");
    setNotice("");
    setConfirmationPassword("");
    setPasswordDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!confirmationPassword) {
      setError(`Enter your admin password to save ${activeSection === "footer" ? "Footer" : "About Us"} changes.`);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (activeSection === "footer") {
        const saved = await saveFooterContent(footerContent, confirmationPassword);
        setFooterContent(saved);
        setNotice("Footer content saved successfully.");
      } else {
        const saved = await saveAboutContent(content, confirmationPassword);
        setContent(saved);
        setNotice("About page content saved successfully.");
      }
      setConfirmationPassword("");
      setPasswordDialogOpen(false);
    } catch (saveError) {
      try {
        if (activeSection === "footer") {
          setFooterContent(await fetchFooterContent());
        } else {
          setContent(await fetchAboutContent());
        }
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
          <title>System Content</title>
        </Helmet>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          System Content
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
        <title>System Content</title>
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
            System Content
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.75, fontSize: 13 }}
          >
            Manage the content displayed on public-facing pages.
          </Typography>
        </Box>
      </Stack>

      <Tabs
        value={activeSection}
        onChange={(_event, value) => setActiveSection(value)}
        aria-label="System content"
        sx={{ mt: 2, mb: 2 }}
      >
        <Tab value="about-us" label="About Us" />
        <Tab value="footer" label="Footer" />
      </Tabs>

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
      {activeSection === "about-us" && !content ? null : activeSection === "about-us" ? (
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
      ) : footerLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
          <CircularProgress />
        </Box>
      ) : footerContent ? (
        <Stack spacing={2.5} sx={{ mt: 3 }}>
          <ContentSection title="Brand information">
            <Stack spacing={2}>
              <TextField
                required
                label="Brand name"
                value={footerContent.brandName}
                onChange={(event) => updateFooterField("brandName", event.target.value)}
                fullWidth
              />
              <TextField
                required
                label="Description"
                value={footerContent.description}
                onChange={(event) => updateFooterField("description", event.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
              <TextField
                required
                label="Copyright text"
                value={footerContent.copyright}
                onChange={(event) => updateFooterField("copyright", event.target.value)}
                helperText='Use {year} to insert the current year automatically.'
                fullWidth
              />
            </Stack>
          </ContentSection>

          <ContentSection
            title="Footer link columns"
            description="Edit the column headings and links shown in the footer."
            action={
              <Button
                startIcon={<AddRoundedIcon />}
                onClick={addFooterColumn}
                disabled={footerContent.columns.length >= 6}
              >
                Add column
              </Button>
            }
          >
            <Stack spacing={2}>
              {footerContent.columns.map((column, columnIndex) => (
                <Paper
                  key={`footer-column-${columnIndex}`}
                  variant="outlined"
                  sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <TextField
                        required
                        label="Column heading"
                        value={column.title}
                        onChange={(event) =>
                          updateFooterColumn(columnIndex, "title", event.target.value)
                        }
                        fullWidth
                      />
                      <IconButton
                        aria-label="Delete footer column"
                        color="error"
                        onClick={() => removeFooterColumn(columnIndex)}
                      >
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                    <Stack spacing={1.5}>
                      {column.links.map((link, linkIndex) => (
                        <Stack
                          key={`footer-link-${columnIndex}-${linkIndex}`}
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1.5}
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                        >
                          <TextField
                            required
                            label="Link label"
                            value={link.label}
                            onChange={(event) =>
                              updateFooterLink(
                                columnIndex,
                                linkIndex,
                                "label",
                                event.target.value,
                              )
                            }
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            required
                            label="Link URL"
                            value={link.url}
                            onChange={(event) =>
                              updateFooterLink(
                                columnIndex,
                                linkIndex,
                                "url",
                                event.target.value,
                              )
                            }
                            helperText="Use a site path like /buyer/about or an HTTP(S) URL."
                            sx={{ flex: 2 }}
                          />
                          <IconButton
                            aria-label="Delete footer link"
                            color="error"
                            onClick={() => removeFooterLink(columnIndex, linkIndex)}
                          >
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        </Stack>
                      ))}
                      {!column.links.length && (
                        <Typography variant="body2" color="text.secondary">
                          No links in this column.
                        </Typography>
                      )}
                    </Stack>
                    <Button
                      startIcon={<AddRoundedIcon />}
                      onClick={() => addFooterLink(columnIndex)}
                      disabled={column.links.length >= 20}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Add link
                    </Button>
                  </Stack>
                </Paper>
              ))}
              {!footerContent.columns.length && (
                <Typography variant="body2" color="text.secondary">
                  No link columns added.
                </Typography>
              )}
            </Stack>
          </ContentSection>

          <ContentSection
            title="Social links"
            description="Add social profiles to display as icons in the footer. Blank URLs show an unlinked icon."
            action={
              <Button
                startIcon={<AddRoundedIcon />}
                onClick={addFooterSocial}
                disabled={footerContent.socials.length >= 10}
              >
                Add social link
              </Button>
            }
          >
            <Stack spacing={1.5}>
              {footerContent.socials.map((social, socialIndex) => (
                <Stack
                  key={`footer-social-${socialIndex}`}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                >
                  <TextField
                    select
                    label="Platform"
                    value={social.platform}
                    onChange={(event) =>
                      updateFooterSocial(socialIndex, "platform", event.target.value)
                    }
                    sx={{ minWidth: { sm: 180 } }}
                  >
                    {["Twitter", "Facebook", "Instagram", "LinkedIn", "YouTube"].map(
                      (platform) => (
                        <MenuItem key={platform} value={platform}>
                          {platform}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                  <TextField
                    label="Profile URL"
                    value={social.url}
                    onChange={(event) =>
                      updateFooterSocial(socialIndex, "url", event.target.value)
                    }
                    helperText="Enter an HTTP(S) URL; leave blank to show the icon without a link."
                    fullWidth
                  />
                  <IconButton
                    aria-label="Delete social link"
                    color="error"
                    onClick={() => removeFooterSocial(socialIndex)}
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Stack>
              ))}
              {!footerContent.socials.length && (
                <Typography variant="body2" color="text.secondary">
                  No social links added.
                </Typography>
              )}
            </Stack>
          </ContentSection>
        </Stack>
      ) : null}
      {((content && activeSection === "about-us") ||
        (footerContent && activeSection === "footer")) && (
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
            Enter your admin password to save these {activeSection === "footer" ? "Footer" : "About Us"} changes.
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
