import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "lucide-react";

function ProfilePreviewModal({ isOpen, onClose, image, name }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={image}
              alt="Profile"
              className="max-w-[90vw] max-h-[75vh] rounded-lg object-cover"
            />

            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-1"
            >
              <XIcon size={18} />
            </button>

            <p className="text-center text-slate-200 mt-3 text-sm">
              {name}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProfilePreviewModal;
