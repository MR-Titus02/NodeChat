import { useMemo, useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { XIcon } from "lucide-react";
import { useCurrentTime } from "../hooks/useCurrentTime";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";


function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, lastSeenMap, typingUsers } = useAuthStore();

  const now = useCurrentTime();
  const userId = String(selectedUser._id);

  const isOnline = useMemo(
    () => onlineUsers.map(String).includes(userId),
    [onlineUsers, userId]
  );

  const lastSeen = useMemo(
    () => lastSeenMap?.[userId] || selectedUser.lastSeen,
    [lastSeenMap, userId, selectedUser.lastSeen]
  );

const isTyping = useMemo(() => typingUsers?.[userId] ?? false, [typingUsers, userId]);

  const statusText = useMemo(() => {
    if (isTyping) return "Typing...";
    if (isOnline) return "Online";
    if (!lastSeen) return "Offline";

    const diff = now - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "Last seen just now";
    if (mins < 60) return `Last seen ${mins} min ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last seen ${hours} hours ago`;

    return `Last seen ${new Date(lastSeen).toLocaleDateString()}`;
  }, [isTyping, isOnline, lastSeen, now]);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") setSelectedUser(null);
      if (e.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  // ✅ State for modal preview

  const profileImg = selectedUser.profilePic || "/avatar.png";

  return (
    <>
      <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-4 md:px-6 py-2 md:py-4 max-h-[84px] flex-shrink-0 relative">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className={`avatar ${isOnline ? "online" : "offline"}`}>
            <div
              className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden cursor-pointer"
              onClick={() => setIsPreviewOpen(true)} // ✅ open modal on click
            >
              <img
                src={profileImg}
                alt={selectedUser.fullName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <h3 className="text-slate-200 font-medium text-sm md:text-base truncate">
              {selectedUser.fullName}
            </h3>
            <p className="text-slate-400 text-xs md:text-sm truncate">
              {statusText}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden absolute top-2 right-2 bg-slate-800/70 hover:bg-slate-700 text-slate-200 rounded-full p-2 flex items-center justify-center"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ✅ Modal Preview */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.img
              src={profileImg}
              alt={selectedUser.fullName}
              className="max-w-[90vw] max-h-[75vh] rounded-lg object-cover cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()} // prevent closing modal on image click
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatHeader;
