import { create } from "zustand";

export const useImageViewerStore = create((set) => ({
  isOpen: false,
  imageUrl: null,

  openImage: (url) =>
    set({
      isOpen: true,
      imageUrl: url,
    }),

  closeImage: () =>
    set({
      isOpen: false,
      imageUrl: null,
    }),
}));
