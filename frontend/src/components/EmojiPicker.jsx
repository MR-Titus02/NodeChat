import { useEffect, useRef } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

function EmojiPicker({ onSelect, onClose }) {
  const pickerRef = useRef(null);

  // close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="rounded-xl shadow-xl border border-slate-700 bg-slate-900"
    >
      <Picker
        data={data}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        onEmojiSelect={(emoji) => onSelect(emoji.native)}
      />
    </div>
  );
}

export default EmojiPicker;
