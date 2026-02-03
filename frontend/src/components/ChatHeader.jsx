import { useMemo, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { XIcon } from "lucide-react";
import { useCurrentTime } from "../hooks/useCurrentTime";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, lastSeenMap } = useAuthStore();

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

  const statusText = useMemo(() => {
    if (isOnline) return "Online";
    if (!lastSeen) return "Offline";

    const diff = now - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "Last seen just now";
    if (mins < 60) return `Last seen ${mins} min ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last seen ${hours} hours ago`;

    return `Last seen ${new Date(lastSeen).toLocaleDateString()}`;
  }, [isOnline, lastSeen, now]);

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 px-4 md:px-6 py-2 md:py-4 max-h-[84px] flex-shrink-0 relative">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
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
  );
}

export default ChatHeader;
