import { useChatStore } from '../store/useChatStore';
function ActiveTabSwitch() {
  
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex gap-2 px-2 md:px-4 py-2">
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition
          ${activeTab === "chats"
            ? "bg-cyan-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition
          ${activeTab === "contacts"
            ? "bg-cyan-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
      >
        Contacts
      </button>
    </div>
  );
}


export default ActiveTabSwitch;
