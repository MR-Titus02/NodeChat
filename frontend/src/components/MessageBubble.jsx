import { motion as Motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

/* Detect emoji-only messages (1–3 emojis) */
const isEmojiOnlyMessage = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const emojiRegex =
    /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;

  const emojis = trimmed.match(
    /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu
  );

  return emojiRegex.test(trimmed) && emojis && emojis.length <= 3;
};

function MessageBubble({ msg }) {
  const { authUser } = useAuthStore();
  const { setReplyToMessage } = useChatStore();

  const isMine = String(msg.senderId) === String(authUser._id);
  const isEmojiOnly = isEmojiOnlyMessage(msg.text);
  const isSingleEmoji = isEmojiOnly && msg.text?.trim().length <= 2;

  return (
    <div className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
      <Motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          const swipeDistance = info.offset.x;

          // 👉 swipe right on OTHER user's message
          if (!isMine && swipeDistance > 80) {
            setReplyToMessage(msg);
          }

          // 👉 swipe left on YOUR message
          if (isMine && swipeDistance < -80) {
            setReplyToMessage(msg);
          }
        }}
        className={`
          chat-bubble
          ${isMine ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"}
          ${isEmojiOnly ? "px-4 py-3" : ""}
        `}
      >
        {/* REPLIED MESSAGE PREVIEW */}
        {msg.replyTo && (
          <div className="mb-2 px-2 py-1 rounded bg-black/20 border-l-4 border-cyan-400 text-xs text-slate-300">
            <span className="block font-semibold text-cyan-300">
              Replying to
            </span>
            <span className="truncate block">
              {msg.replyTo.text || "📷 Image"}
            </span>
          </div>
        )}

        {msg.image && (
          <img
            src={msg.image}
            className="rounded-lg h-48 object-cover"
          />
        )}

        {msg.text && (
          <p
            className={
              isSingleEmoji
                ? "text-6xl md:text-8xl leading-none text-center"
                : "mt-2 text-base"
            }
          >
            {msg.text}
          </p>
        )}
      </Motion.div>
    </div>
  );
}

export default MessageBubble;
