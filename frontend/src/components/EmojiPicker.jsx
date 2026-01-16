import { useEffect, useRef } from "react";
import Picker from "emoji-picker-react";

export default function EmojiPickerPopover({ onSelect, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={pickerRef} className="absolute bottom-full mb-2 right-0 z-50">
      <Picker
        onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
        disableAutoFocus={true}
        native
      />
    </div>
  );
}
