import { motion as Motion } from "framer-motion";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { IoCheckmarkDone } from "react-icons/io5";

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
        {msg.image && (
          <img
            src={msg.image}
            className="rounded-lg mb-1 max-h-60 object-cover"
          />
        )}

        {/* TEXT */}
        {msg.text && (
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

        {/* META ROW (WhatsApp style) */}
        <div className="mt-1 flex justify-end items-center gap-1 text-[10px] text-white/70">
          <span>{formatTime(msg.createdAt)}</span>

          {isMine && (
            <span
              className={`ml-1 text-base flex items-center justify-center rounded-full transition-all duration-200 ${
                msg.seenAt
                  ? "bg-teal-400/25 ring-1 ring-teal-300/50"
                  : "bg-white/10"
              }`}
            >
              <IoCheckmarkDone
                className={`${
                  msg.seenAt ? "text-teal-300" : "text-gray-300"
                } !text-opacity-100`}
              />
            </span>
          )}
        </div>
      </Motion.div>
    </div>
  );
}

export default MessageBubble;
