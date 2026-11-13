import ChatMessageBubble from "../../chat/ChatMessageBubble";
import CertificateMessage from "./CertificateMessage.jsx";

export default function MessageCard({
  message: msg,
  onViewMedia,
  onRecover,
  recoveryLabel = "Recover messages",
}) {
  const isCertificateLink =
    msg.image && msg.mediaType === "application/vnd.artmatch.certificate-link";

  return (
    <ChatMessageBubble
      isMine={msg.sender === "buyer"}
      senderName={msg.senderName}
      text={msg.text}
      image={msg.image}
      mediaType={msg.mediaType}
      fileName={msg.fileName}
      time={msg.time}
      attachmentError={msg.attachmentError}
      canRecover={msg.canRecover}
      recoveryUnavailable={msg.recoveryUnavailable}
      recoveryLabel={recoveryLabel}
      onRecover={onRecover}
      onViewMedia={onViewMedia}
      customAttachment={
        isCertificateLink ? <CertificateMessage message={msg} /> : null
      }
    />
  );
}
