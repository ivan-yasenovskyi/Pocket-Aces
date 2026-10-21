"use client";

import { useRef, useState } from "react";
import { useT } from "@/i18n/locale";
import { links, type PhotoRef } from "@/lib/api";

export function Gallery({ title, photos }: { title: string; photos: PhotoRef[] }) {
  const t = useT().gallery;
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<PhotoRef | null>(null);

  function show(photo: PhotoRef) {
    setOpen(photo);
    dialog.current?.showModal();
  }

  return (
    <section aria-labelledby="gallery-title">
      <h2 id="gallery-title" className="font-display text-[44px] leading-[0.9] font-black text-navy uppercase">
        {title}
      </h2>
      <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => show(photo)}
              className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl bg-[#d3ecf9]"
              aria-label={`${t.photo} ${i + 1}`}
            >
              <img
                src={links.photo(photo.id)}
                alt=""
                loading="lazy"
                width={photo.width}
                height={photo.height}
                className="size-full object-cover transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto max-h-[92vh] max-w-[92vw] overflow-visible bg-transparent p-0 backdrop:bg-ink/85"
      >
        {open && (
          <>
            <img
              src={links.photo(open.id)}
              alt=""
              width={open.width}
              height={open.height}
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="absolute -top-3 -right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white text-xl font-bold text-ink shadow-lg"
              aria-label={t.close}
            >
              ×
            </button>
          </>
        )}
      </dialog>
    </section>
  );
}
