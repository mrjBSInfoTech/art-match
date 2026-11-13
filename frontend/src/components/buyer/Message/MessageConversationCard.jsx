import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import ChatConversationItem from "../../chat/ChatConversationItem";

export default function MessageConversationCard({
  chat,
  isSelected,
  avatarSrc,
  timeLabel,
  preview,
  onSelect,
}) {
  const chips = chat.is_support
    ? [{ label: "Support", color: "error", variant: "outlined" }]
    : [];

  return (
    <ChatConversationItem
      name={chat.other_name || "Seller"}
      avatarSrc={avatarSrc}
      avatarIcon={chat.is_support ? <SupportAgentOutlinedIcon fontSize="small" /> : null}
      avatarFallback="S"
      timeLabel={timeLabel}
      preview={preview}
      unreadCount={chat.unread_count}
      selected={isSelected}
      chips={chips}
      onSelect={onSelect}
    />
  );
}
