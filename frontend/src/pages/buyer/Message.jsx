import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Avatar,
  Badge,
  Box,
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

// Icons
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CircleIcon from "@mui/icons-material/Circle";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Sample conversations with image data
const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    buyerName: "Maria Santos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    lastMessage: "Is this artwork still available?",
    time: "10:42 AM",
    unread: 1,
    online: true,
    messages: [
      { id: 1, sender: "buyer", text: "Hello! I am interested in this painting.", time: "10:30 AM" },
      { 
        id: 2, 
        sender: "buyer", 
        text: "Is this artwork still available?", 
        image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500", 
        time: "10:42 AM" 
      },
    ],
  },
  {
    id: 2,
    buyerName: "Juan Dela Cruz",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    lastMessage: "Thank you! Here is the framed reference.",
    time: "Yesterday",
    unread: 0,
    online: false,
    messages: [
      { id: 1, sender: "buyer", text: "Hi, do you offer custom framing?", time: "Yesterday 2:15 PM" },
      { id: 2, sender: "seller", text: "Yes! Here are some sample frames we use:", time: "Yesterday 2:20 PM" },
      { 
        id: 3, 
        sender: "seller", 
        image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500", 
        time: "Yesterday 2:21 PM" 
      },
      { id: 4, sender: "buyer", text: "Thank you! Here is the framed reference.", time: "Yesterday 2:25 PM" },
    ],
  },
];

export default function Messages() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedBuyerId, setSelectedBuyerId] = useState(isMobile ? null : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  
  const fileInputRef = useRef(null);

  const activeChat = conversations.find((c) => c.id === selectedBuyerId);

  const handleSelectChat = (id) => {
    setSelectedBuyerId(id);
    setConversations((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat))
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAttachedImage(imageUrl);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = () => {
    if ((!inputMessage.trim() && !attachedImage) || !activeChat) return;

    const newMessage = {
      id: Date.now(),
      sender: "seller",
      text: inputMessage.trim() || undefined,
      image: attachedImage || undefined,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((chat) => {
        if (chat.id === selectedBuyerId) {
          return {
            ...chat,
            lastMessage: attachedImage ? "📷 Photo" : newMessage.text,
            time: "Just now",
            messages: [...chat.messages, newMessage],
          };
        }
        return chat;
      })
    );

    setInputMessage("");
    handleRemoveImage();
  };

  const filteredConversations = conversations.filter((c) =>
    c.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ height: { xs: "calc(100vh - 80px)", md: "calc(100vh - 120px)" }, display: "flex", flexDirection: "column" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Messages</title>
      </Helmet>

      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2, display: { xs: "none", md: "block" } }}>
        Messages
      </Typography>

      {/* Main Container */}
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
        {/* Left Side: Buyers List (Hidden on mobile when a chat is open) */}
        {(!isMobile || !selectedBuyerId) && (
          <Box
            sx={{
              width: { xs: "100%", md: 360 },
              borderRight: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search Header */}
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Box>

            {/* List */}
            <List sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
              {filteredConversations.map((chat) => {
                const isSelected = chat.id === selectedBuyerId;
                return (
                  <Box key={chat.id}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => handleSelectChat(chat.id)}
                      sx={{ py: 1.5, px: 2 }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          variant="dot"
                          color={chat.online ? "success" : "default"}
                        >
                          <Avatar src={chat.avatar} alt={chat.buyerName} />
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={chat.unread ? 700 : 600}>
                              {chat.buyerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {chat.time}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                            <Typography
                              variant="body2"
                              color={chat.unread ? "text.primary" : "text.secondary"}
                              fontWeight={chat.unread ? 700 : 400}
                              noWrap
                              sx={{ maxWidth: 180 }}
                            >
                              {chat.lastMessage}
                            </Typography>
                            {chat.unread > 0 && (
                              <CircleIcon color="primary" sx={{ fontSize: 10 }} />
                            )}
                          </Stack>
                        }
                      />
                    </ListItemButton>
                    <Divider component="li" />
                  </Box>
                );
              })}
            </List>
          </Box>
        )}

        {/* Right Side: Messenger Area */}
        {(!isMobile || selectedBuyerId) && activeChat ? (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", width: "100%" }}>
            {/* Active Buyer Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                {isMobile && (
                  <IconButton size="small" onClick={() => setSelectedBuyerId(null)}>
                    <ArrowBackIcon />
                  </IconButton>
                )}
                <Avatar src={activeChat.avatar} alt={activeChat.buyerName} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {activeChat.buyerName}
                  </Typography>
                  <Typography variant="caption" color={activeChat.online ? "success.main" : "text.secondary"}>
                    {activeChat.online ? "Online" : "Offline"}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small">
                <MoreVertIcon />
              </IconButton>
            </Stack>

            {/* Message History */}
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
              {activeChat.messages.map((msg) => {
                const isSeller = msg.sender === "seller";
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      alignSelf: isSeller ? "flex-end" : "flex-start",
                      maxWidth: { xs: "85%", sm: "70%" },
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: msg.image ? 1 : 1.5,
                        px: msg.image ? 1 : 2,
                        borderRadius: 2.5,
                        borderBottomRightRadius: isSeller ? 4 : 20,
                        borderBottomLeftRadius: isSeller ? 20 : 4,
                        bgcolor: isSeller ? "primary.main" : "background.paper",
                        color: isSeller ? "#fff" : "text.primary",
                        border: isSeller ? "none" : "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {msg.image && (
                        <Box
                          component="img"
                          src={msg.image}
                          alt="Attachment"
                          sx={{
                            width: "100%",
                            maxHeight: 250,
                            objectFit: "cover",
                            borderRadius: 2,
                            mb: msg.text ? 1 : 0,
                            display: "block",
                          }}
                        />
                      )}
                      {msg.text && (
                        <Typography variant="body2" sx={{ lineHeight: 1.4, px: msg.image ? 1 : 0 }}>
                          {msg.text}
                        </Typography>
                      )}
                    </Paper>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        textAlign: isSeller ? "right" : "left",
                        fontSize: "0.7rem",
                      }}
                    >
                      {msg.time}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Preview Selected Attachment */}
            {attachedImage && (
              <Box
                sx={{
                  px: 2,
                  pt: 1.5,
                  display: "flex",
                  alignItems: "center",
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box
                    component="img"
                    src={attachedImage}
                    alt="Preview"
                    sx={{ width: 60, height: 60, borderRadius: 2, objectFit: "cover" }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      bgcolor: "error.main",
                      color: "#fff",
                      "&:hover": { bgcolor: "error.dark" },
                      p: 0.3,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Input Footer */}
            <Box sx={{ p: 2, borderTop: attachedImage ? "none" : "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Image Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <IconButton color="gray" onClick={() => fileInputRef.current?.click()}>
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
                  disabled={!inputMessage.trim() && !attachedImage}
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
            </Box>
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