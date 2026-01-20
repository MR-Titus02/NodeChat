import { useEffect } from "react";
import { useImageViewerStore } from "../store/useImageViewerStore";

function ImageViewer() {
  const { isOpen, imageUrl, closeImage } = useImageViewerStore();
    
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeImage();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-black/60 backdrop-blur-sm z-10">
        <a
          href={imageUrl}
          download
          target="_blank"
          rel="noreferrer"
          className="text-white text-xl"
        >
          ⬇️
        </a>
        <button
          onClick={closeImage}
          className="text-white text-xl"
        >
          ✕
        </button>
      </div>

      {/* IMAGE CONTAINER */}
      <div className="absolute inset-0 pt-14 pb-6 flex items-center justify-center">
        <img
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
        />
      </div>
    </div>
  );
}

export default ImageViewer;
