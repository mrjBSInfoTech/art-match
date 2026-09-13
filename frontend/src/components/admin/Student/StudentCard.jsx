import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StudentInfo from "./StudentInfo";
import AccessReason from "../Access/AccessReason";
import {
  addAccountStrike,
  setAccountBan,
} from "../../../api/admin/accountAccessAPI";

const fields = [
  ["first_name", "First name"],
  ["middle_name", "Middle name"],
  ["last_name", "Last name"],
  ["student_number", "Student number"],
  ["email", "Email"],
  ["phone_number", "Phone number"],
  ["course", "Course"],
  ["year_level", "Year level"],
  ["address", "Address"],
];

export default function StudentCard({
  students = [],
  onSave,
  onDelete,
  onAccessChange,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accessAction, setAccessAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const role = (localStorage.getItem("admin_role") || "").toLowerCase();
  const canEdit =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_edit") === "1");
  const canDelete =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_delete") === "1");
  const getId = (student) => student?.student_id ?? student?.id;
  const getName = (student) =>
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Unnamed student";

  const openEdit = (student) => {
    setSelectedStudent(student);
    setFormData(
      Object.fromEntries(fields.map(([key]) => [key, student[key] || ""])),
    );
    setDialogMode("edit");
    setAnchorEl(null);
  };

  const save = async () => {
    try {
      setSaving(true);
      setOperationError("");
      await onSave(getId(selectedStudent), formData);
      setDialogMode(null);
      setSelectedStudent(null);
    } catch (error) {
      setOperationError(error.message || "Unable to update student.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      setDeleting(true);
      setOperationError("");
      await onDelete(getId(deleteTarget));
      setDeleteTarget(null);
    } catch (error) {
      setOperationError(error.message || "Unable to delete student.");
    } finally {
      setDeleting(false);
    }
  };

  const submitAccessAction = async (reason) => {
    try {
      setOperationError("");
      if (accessAction === "strike")
        await addAccountStrike("seller", getId(selectedStudent), reason);
      else
        await setAccountBan(
          "seller",
          getId(selectedStudent),
          accessAction === "ban",
          reason,
        );
      setAccessAction("");
      await onAccessChange?.();
    } catch (error) {
      setOperationError(error.message || "Unable to update student access.");
    }
  };

  return (
    <Box>
      {operationError && (
        <Alert
          severity="error"
          onClose={() => setOperationError("")}
          sx={{ mb: 2 }}
        >
          {operationError}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(auto-fill, minmax(160px, 180px))",
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {students.map((student) => {
          const id = getId(student);
          const status = String(
            student.register_status || "pending",
          ).toLowerCase();
          return (
            <Card
              key={id}
              sx={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                boxShadow: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": {
                  borderColor: "text.secondary",
                  boxShadow: "0 5px 14px rgba(15, 23, 42, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 66,
                  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{ width: 52, height: 52, objectFit: "cover", borderRadius: 1.5 }}
                  image={
                    student.image
                      ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(student.image)}`
                      : "http://localhost:5000/uploads/profile.jpg"
                  }
                  alt={getName(student)}
                  onError={(event) => {
                    event.target.onerror = null;
                    event.target.src = "http://localhost:5000/uploads/profile.jpg";
                  }}
                />
              </Box>
              <CardContent
                sx={{
                  p: 1.25,
                  "&:last-child": { pb: 1.25 },
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 0.75,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: 12 }}
                      noWrap
                    >
                      {getName(student)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block", mt: 0.25 }}
                    >
                      {student.student_number || "No student number"}
                    </Typography>
                    <Chip
                      size="small"
                      label={status}
                      color={
                        status === "verified" || status === "approved"
                          ? "success"
                          : "primary"
                      }
                      sx={{
                        mt: 0.5,
                        height: 18,
                        textTransform: "capitalize",
                        fontSize: 9,
                        fontWeight: 700,
                        borderRadius: 1,
                        backgroundColor:
                          status === "verified" || status === "approved"
                            ? theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.16)" : "#dcfce7"
                            : theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.16)" : "#fef3c7",
                        color:
                          status === "verified" || status === "approved"
                            ? "#15803d"
                            : "#b45309",
                      }}
                    />
                  </Box>
                  {(canEdit || canDelete) && (
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        setAnchorEl(event.currentTarget);
                        setSelectedStudent(student);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setSelectedStudent(student);
                    setOpenInfoDialog(true);
                  }}
                  sx={{
                    mt: "auto",
                    py: 0.45,
                    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    color: theme.palette.text.primary,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                    fontSize: 10,
                    "& .MuiButton-startIcon": { color: theme.palette.error.main },
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      borderColor: theme.palette.text.secondary,
                      boxShadow: "none",
                    },
                  }}
                >
                  View Details
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && getId(selectedStudent) === id}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {canEdit && (
                    <MenuItem
                      onClick={() => openEdit(selectedStudent)}
                      sx={{ color: "success.main" }}
                    >
                      <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                      Edit
                    </MenuItem>
                  )}
                  {canDelete && (
                    <MenuItem
                      onClick={() => {
                        setDeleteTarget(selectedStudent);
                        setAnchorEl(null);
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                      Delete
                    </MenuItem>
                  )}
                  {canEdit && !selectedStudent?.is_banned && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction("strike");
                        setAnchorEl(null);
                      }}
                      sx={{ color: "warning.main" }}
                    >
                      Add strike
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction(
                          selectedStudent?.is_banned ? "unban" : "ban",
                        );
                        setAnchorEl(null);
                      }}
                      sx={{
                        color: selectedStudent?.is_banned
                          ? "success.main"
                          : "error.main",
                      }}
                    >
                      {selectedStudent?.is_banned
                        ? "Unban account"
                        : "Ban account"}
                    </MenuItem>
                  )}
                </Menu>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <StudentInfo
        open={openInfoDialog}
        handleClose={() => setOpenInfoDialog(false)}
        selectedStudent={selectedStudent}
      />
      <Dialog
        open={dialogMode === "edit"}
        onClose={() => setDialogMode(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit student</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {fields.map(([key, label]) => (
              <TextField
                key={key}
                label={label}
                value={formData[key] || ""}
                onChange={(event) =>
                  setFormData({ ...formData, [key]: event.target.value })
                }
                fullWidth
                size="small"
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogMode(null)}>Close</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
      <AccessReason
        open={Boolean(accessAction)}
        handleClose={() => setAccessAction("")}
        selectedAccount={
          selectedStudent && {
            ...selectedStudent,
            role: "seller",
            account_id: getId(selectedStudent),
            username: selectedStudent.student_number,
          }
        }
        action={accessAction}
        submitAction={submitAccessAction}
      />
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete student?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently remove {getName(deleteTarget)}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
