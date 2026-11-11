import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import BlockIcon from "@mui/icons-material/Block";
import GavelIcon from "@mui/icons-material/Gavel";
import StudentInfo from "./StudentInfo";
import AccessReason from "../Access/AccessReason";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { startSupportConversation } from "../../../api/admin/supportChatAPI";
import {
  addAccountStrike,
  setAccountBan,
} from "../../../api/admin/accountAccessAPI";

export default function StudentCard({
  students = [],
  onEdit,
  onDelete,
  onReactivate,
  onAccessChange,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [accessAction, setAccessAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [startingChat, setStartingChat] = useState(false);

  const role = (localStorage.getItem("admin_role") || "").toLowerCase();
  const canEdit =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_edit") === "1");

  const getId = (student) => student?.student_id ?? student?.id;
  const getName = (student) =>
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Unnamed student";

  const handleMenuOpen = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const submitAccessAction = async (reason) => {
    try {
      setOperationError("");
      const studentId = getId(selectedStudent);
      if (accessAction === "strike") {
        await addAccountStrike("seller", studentId, reason);
      } else {
        await setAccountBan(
          "seller",
          studentId,
          accessAction === "ban",
          reason,
        );
      }
      setAccessAction("");
      await onAccessChange?.();
    } catch (error) {
      setOperationError(error.message || "Unable to update seller access.");
    }
  };

  const openSupportChat = async () => {
    try {
      setOperationError("");
      setStartingChat(true);
      const conversation = await startSupportConversation(
        "seller",
        getId(selectedStudent),
      );
      navigate(`/admin/chat-support?conversation=${conversation.conversation_id}`);
      handleMenuClose();
    } catch (error) {
      setOperationError(error.message || "Unable to open seller conversation.");
    } finally {
      setStartingChat(false);
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
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
          alignItems: "stretch",
        }}
      >
        {students.map((student) => {
          const id = getId(student);
          const image = student.profile_image || student.image;

          return (
            <Card
              key={id}
              sx={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 270,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: "none",
                backgroundColor: theme.palette.background.paper,
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
                  height: 170,
                  position: "relative",
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                  image={
                    /^https?:\/\//i.test(image || "") ? image : image
                      ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`
                      : "http://localhost:5000/uploads/seller/profile.jpg"
                  }
                  alt={getName(student)}
                  onError={(event) => {
                    event.target.onerror = null;
                    event.target.src =
                      "http://localhost:5000/uploads/seller/profile.jpg";
                  }}
                />
              </Box>

              <CardContent
                sx={{
                  p: 1.5,
                  "&:last-child": { pb: 1.5 },
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
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        fontSize: 14,
                      }}
                      noWrap
                    >
                      {getName(student)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        mt: 0.25,
                        fontSize: 11,
                      }}
                    >
                      {student.student_number || "No student number"}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.75 }}>
                      {student.strikes > 0 && (
                        <Chip
                          size="small"
                          label={`${student.strikes} / 3 strikes`}
                          color="warning"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      )}
                      {student.is_banned && (
                        <Chip
                          size="small"
                          label="Banned"
                          color="error"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      )}
                    </Box>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, student)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
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
                    py: 0.7,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    color: theme.palette.text.primary,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 1.5,
                    "& .MuiButton-startIcon": {
                      color: theme.palette.error.main,
                    },
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
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={openSupportChat} disabled={startingChat}>
                    <ChatBubbleOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                    {startingChat ? "Opening chat..." : "Chat"}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      onEdit?.(selectedStudent);
                      handleMenuClose();
                    }}
                    sx={{ color: "success.main" }}
                  >
                    <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                  </MenuItem>
                  {student.account_status === "expired" && (
                    <MenuItem
                      onClick={() => {
                        onReactivate?.(selectedStudent);
                        handleMenuClose();
                      }}
                      sx={{ color: "success.main" }}
                    >
                      <ReplayIcon sx={{ mr: 1, fontSize: 20 }} />
                      Reactivate
                    </MenuItem>
                  )}
                  {canEdit && !selectedStudent?.is_banned && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction("strike");
                        handleMenuClose();
                      }}
                      sx={{ color: "warning.main" }}
                    >
                      <GavelIcon sx={{ mr: 1, fontSize: 20 }} />
                      Add strike
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction(
                          selectedStudent?.is_banned ? "unban" : "ban",
                        );
                        handleMenuClose();
                      }}
                      sx={{
                        color: selectedStudent?.is_banned
                          ? "success.main"
                          : "error.main",
                      }}
                    >
                      <BlockIcon sx={{ mr: 1, fontSize: 20 }} />
                      {selectedStudent?.is_banned
                        ? "Unban account"
                        : "Ban account"}
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={() => {
                      onDelete?.(id);
                      handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                  </MenuItem>
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
    </Box>
  );
}
