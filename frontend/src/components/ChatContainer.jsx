import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

/* 👇 Helper: detect emoji-only messages (1–3 emojis) */
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

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    getMessagesByUserId,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader />

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => {
              const isMine =
                String(msg.senderId) === String(authUser._id);

              const isEmojiOnly = isEmojiOnlyMessage(msg.text);

              return (
                <div
                  key={msg._id}
                  className={`chat ${
                    isMine ? "chat-end" : "chat-start"
                  }`}
                >
                  <div
                    className={`chat-bubble ${
                      isMine
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    } ${
                      isEmojiOnly ? "px-4 py-3" : ""
                    }`}
                  >
                    {msg.image && (
                      <img
                        src={msg.image}
                        className="rounded-lg h-48 object-cover"
                      />
                    )}

                    {msg.text && (
                      <p
                        className={
                          isEmojiOnly
                            ? "text-5xl leading-tight text-center"
                            : "mt-2 text-base"
                        }
                      >
                        {msg.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput />
      </div>
    </div>
  );
}

export default ChatContainer;
