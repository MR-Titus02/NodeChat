import { motion as Motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useImageViewerStore } from "../store/useImageViewerStore";

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

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
  const { openImage } = useImageViewerStore();

  const isMine = String(msg.senderId) === String(authUser._id);
  const isEmojiOnly = isEmojiOnlyMessage(msg.text);
  const isSingleEmoji = isEmojiOnly && msg.text?.trim().length <= 2;

  const imageSrc = msg.image; // ✅ CORRECT FIELD

  return (
    <div className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
      <Motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          const swipeDistance = info.offset.x;
          if (!isMine && swipeDistance > 80) setReplyToMessage(msg);
          if (isMine && swipeDistance < -80) setReplyToMessage(msg);
        }}
        className={`
          chat-bubble
          max-w-[85%] sm:max-w-[70%]
          px-3 py-2
          flex flex-col
          ${isMine ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"}
        `}
      >
        {/* REPLY PREVIEW */}
        {msg.replyTo && (
          <div className="mb-1 px-2 py-1 rounded bg-black/20 border-l-4 border-cyan-400 text-xs text-slate-300">
            <span className="block font-semibold text-cyan-300">
              Replying to
            </span>
            <span className="truncate block">
              {msg.replyTo.text || "📷 Image"}
            </span>
          </div>
        )}

        {/* IMAGE */}
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            onClick={() => openImage(imageSrc)}
            className="block cursor-pointer rounded-lg max-w-[220px] max-h-[300px] object-cover mb-1 hover:opacity-90"
          />
        )}

        {/* TEXT */}
        {msg.text && msg.text.trim() !== "" && (
          <p
            className={
              isSingleEmoji
                ? "text-6xl leading-none text-center"
                : "text-sm leading-relaxed break-words"
            }
          >
            {msg.text}
          </p>
        )}

        {/* META ROW */}
        <div className="mt-1 flex justify-end items-center gap-1 text-[10px] text-white/70">
          <span>{formatTime(msg.createdAt)}</span>

          {isMine && (
            <span
              className={`leading-none ${
                msg.seenAt ? "text-blue-500" : "text-white/50"
              }`}
            >
              ✔✔
            </span>
          )}
        </div>
      </Motion.div>
    </div>
  );
}

export default MessageBubble;
