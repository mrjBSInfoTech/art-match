import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CircleIcon from "@mui/icons-material/Circle";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import {
  fetchSellerConversations,
  fetchSellerMessages,
  fetchSellerNotifications,
  startSellerConversation,
  sendSellerMessage,
} from "../../api/seller/messageAPI";

const formatMessageTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function Messages() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const activeChat = useMemo(
    () => conversations.find((chat) => chat.conversation_id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );
  const activeNotification = notifications.find(
    (notification) => notification.notification_id === selectedNotificationId,
  );

  useEffect(() => {
    const loadConversations = async (initialLoad = false) => {
      try {
        if (initialLoad) {
          setLoading(true);
          setError("");
        }
        const data = await fetchSellerConversations();
        setConversations(data || []);
        if (data && data.length > 0 && !selectedConversationId && !selectedNotificationId) {
          setSelectedConversationId(data[0].conversation_id);
        }
      } catch (err) {
        setError(err.message || "Unable to load conversations");
      } finally {
        if (initialLoad) setLoading(false);
      }
    };

    loadConversations(true);
    const intervalId = window.setInterval(() => loadConversations(), 3000);

    return () => window.clearInterval(intervalId);
  }, [selectedConversationId, selectedNotificationId]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setNotifications((await fetchSellerNotifications()) || []);
      } catch (err) {
        setError(err.message || "Unable to load account notices");
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const data = await fetchSellerMessages(selectedConversationId);
        setMessages((data || []).map((msg) => ({
          id: msg.message_id,
          sender: msg.sender_type,
          text: msg.message_data || "",
          image: msg.image || null,
          time: formatMessageTime(msg.date_created),
        })));
      } catch (err) {
        setError(err.message || "Unable to load messages");
      }
    };

    loadMessages();
    const intervalId = window.setInterval(loadMessages, 3000);

    return () => window.clearInterval(intervalId);
  }, [selectedConversationId]);

  const filteredConversations = conversations.filter((chat) =>
    (chat.other_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(chat.other_id || "").includes(searchQuery.trim()),
  );

  const searchedBuyerId = searchQuery.trim();
  const canStartConversation = /^\d+$/.test(searchedBuyerId) &&
    !conversations.some((chat) => String(chat.other_id) === searchedBuyerId);

  const handleStartConversation = async () => {
    try {
      setError("");
      const result = await startSellerConversation(searchedBuyerId);
      const updated = await fetchSellerConversations();
      setConversations(updated || []);
      setSelectedConversationId(result.conversation_id);
    } catch (err) {
      setError(err.message || "Unable to start conversation");
    }
  };

  const handleSelectChat = (conversationId) => {
    setSelectedConversationId(conversationId);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAttachedPreview(imageUrl);
      setAttachedFile(file);
    }
  };

  const handleRemoveImage = () => {
    if (attachedPreview) {
      URL.revokeObjectURL(attachedPreview);
    }
    setAttachedPreview(null);
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || !activeChat) return;

    const formData = new FormData();
    formData.append("message", inputMessage.trim());
    if (attachedFile) {
      formData.append("image", attachedFile);
    }

    try {
      const sent = await sendSellerMessage(activeChat.other_id, formData);
      setMessages((prev) => [
        ...prev,
        {
          id: sent.message_id,
          sender: sent.sender_type,
          text: sent.message_data || "",
          image: sent.image || null,
          time: formatMessageTime(new Date().toISOString()),
        },
      ]);
      setInputMessage("");
      handleRemoveImage();
      const updated = await fetchSellerConversations();
      setConversations(updated || []);
    } catch (err) {
      setError(err.message || "Unable to send message");
    }
  };

  return (
    <Box sx={{ height: { xs: "calc(100vh - 80px)", md: "calc(100vh - 120px)" }, display: "flex", flexDirection: "column", p: { xs: 2, md: 3 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Messages</title>
      </Helmet>

      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2, display: { xs: "none", md: "block" } }}>
        Messages
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          display: "flex",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: { xs: 0, md: 3 },
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        {(!isMobile || (!selectedConversationId && !selectedNotificationId)) && (
          <Box
            sx={{
              width: { xs: "100%", md: 360 },
              borderRight: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canStartConversation) {
                    handleStartConversation();
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              {canStartConversation && (
                <Button fullWidth size="small" sx={{ mt: 1 }} onClick={handleStartConversation}>
                  Message buyer #{searchedBuyerId}
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ p: 3, color: "text.secondary" }}>Loading conversations…</Box>
            ) : (
              <List sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
                {notifications.map((notification) => (
                  <Box key={notification.notification_id}>
                    <ListItemButton
                      selected={notification.notification_id === selectedNotificationId}
                      onClick={() => {
                        setSelectedNotificationId(notification.notification_id);
                        setSelectedConversationId(null);
                      }}
                      sx={{ py: 1.5, px: 2 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: notification.notification_type === "ban" ? "error.main" : "warning.main" }}>!</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="subtitle2" fontWeight={600}>Account notice</Typography>}
                        secondary={<Typography variant="body2" color="text.secondary" noWrap>{notification.message}</Typography>}
                      />
                    </ListItemButton>
                    <Divider component="li" />
                  </Box>
                ))}
                {filteredConversations.length === 0 ? (
                  <Box sx={{ p: 3, color: "text.secondary" }}>No conversations yet.</Box>
                ) : (
                  filteredConversations.map((chat) => {
                    const isSelected = chat.conversation_id === selectedConversationId;
                    return (
                      <Box key={chat.conversation_id}>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => {
                            handleSelectChat(chat.conversation_id);
                            setSelectedNotificationId(null);
                          }}
                          sx={{ py: 1.5, px: 2 }}
                        >
                          <ListItemAvatar>
                            <Badge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }} variant="dot" color="success">
                              <Avatar src={chat.other_avatar || ""} alt={chat.other_name || "Buyer"} />
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {chat.other_name || "Buyer"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {chat.last_message_time ? formatMessageTime(chat.last_message_time) : ""}
                                </Typography>
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                                  {chat.last_message || "No messages yet"}
                                </Typography>
                                <CircleIcon color="primary" sx={{ fontSize: 10 }} />
                              </Stack>
                            }
                          />
                        </ListItemButton>
                        <Divider component="li" />
                      </Box>
                    );
                  })
                )}
              </List>
            )}
          </Box>
        )}

        {(!isMobile || selectedConversationId || selectedNotificationId) && (activeChat || activeNotification) ? (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", width: "100%" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {isMobile && (
                  <IconButton size="small" onClick={() => { setSelectedConversationId(null); setSelectedNotificationId(null); }}>
                    <ArrowBackIcon />
                  </IconButton>
                )}
                <Avatar src={activeChat?.other_avatar || ""} alt={activeChat?.other_name || "Account notice"} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {activeNotification ? "Account notice" : activeChat?.other_name || "Buyer"}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {activeNotification ? "From ArtMatch administration" : "Online"}
                  </Typography>
                </Box>
              </Stack>
              {!activeNotification && <IconButton size="small"><MoreVertIcon /></IconButton>}
            </Stack>

            <Box
              sx={{
                flexGrow: 1,
                p: { xs: 2, md: 2.5 },
                overflowY: "auto",
                bgcolor: theme.palette.mode === "dark" ? "background.default" : "#f8f9fa",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              {activeNotification ? (
                <Box sx={{ alignSelf: "flex-start", maxWidth: { xs: "85%", sm: "70%" } }}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{activeNotification.message}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "0.7rem" }}>
                    {formatMessageTime(activeNotification.created_at)}
                  </Typography>
                </Box>
              ) : messages.length === 0 ? (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Start the conversation.
                </Typography>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === "seller";
                  return (
                    <Box key={msg.id} sx={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: { xs: "85%", sm: "70%" } }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: msg.image ? 1 : 1.5,
                          px: msg.image ? 1 : 2,
                          borderRadius: 2.5,
                          borderBottomRightRadius: isMine ? 4 : 20,
                          borderBottomLeftRadius: isMine ? 20 : 4,
                          bgcolor: isMine ? "primary.main" : "background.paper",
                          color: isMine ? "#fff" : "text.primary",
                          border: isMine ? "none" : "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {msg.image && (
                          <Box component="img" src={msg.image} alt="Attachment" sx={{ width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 2, mb: msg.text ? 1 : 0, display: "block" }} />
                        )}
                        {msg.text && <Typography variant="body2" sx={{ lineHeight: 1.4, px: msg.image ? 1 : 0 }}>{msg.text}</Typography>}
                      </Paper>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textAlign: isMine ? "right" : "left", fontSize: "0.7rem" }}>
                        {msg.time}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>

            {activeChat && attachedPreview && (
              <Box sx={{ px: 2, pt: 1.5, display: "flex", alignItems: "center", borderTop: "1px solid", borderColor: "divider" }}>
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box component="img" src={attachedPreview} alt="Preview" sx={{ width: 60, height: 60, borderRadius: 2, objectFit: "cover" }} />
                  <IconButton size="small" onClick={handleRemoveImage} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", "&:hover": { bgcolor: "error.dark" }, p: 0.3 }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>
            )}

            {activeChat ? <Box sx={{ p: 2, borderTop: attachedPreview ? "none" : "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageChange} />
                <IconButton onClick={() => fileInputRef.current?.click()}>
                  <AttachFileIcon />
                </IconButton>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                />

                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() && !attachedFile}
                  sx={{
                    bgcolor: "primary.main",
                    color: "#fff",
                    "&:hover": { bgcolor: "primary.dark" },
                    "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box> : <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                You can&apos;t reply to this user.
              </Typography>
            </Box>}
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "grid" }, placeItems: "center" }}>
            <Typography color="text.secondary">Select a conversation to start chatting</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
