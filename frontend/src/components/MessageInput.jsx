import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (isSoundEnabled) playRandomKeyStrokeSound();
    sendMessage({ text: text.trim(), image: imagePreview });

    setText("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/95 px-2 py-2 flex-shrink-0">
      {/* Image preview */}
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="relative w-fit">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center"
            >
              <XIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={handleSendMessage}
        className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-hidden"
      >
        {/* TEXT INPUT */}
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (isSoundEnabled) playRandomKeyStrokeSound();
          }}
          placeholder="Type your message..."
          className="
            flex-1
            bg-slate-800/60
            border border-slate-700/50
            rounded-lg
            px-3
            py-2
            text-[16px]     /* 🔥 prevents mobile zoom */
            text-white
            focus:outline-none
          "
        />

        {/* IMAGE PICKER */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-lg p-2 bg-slate-800/60 hover:bg-slate-700"
        >
          <ImageIcon className="w-5 h-5 text-slate-300" />
        </button>

        {/* SEND BUTTON */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="
            flex-shrink-0
            rounded-lg
            bg-gradient-to-r
            from-cyan-500
            to-cyan-600
            px-4
            py-2
            text-white
            disabled:opacity-50
          "
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
