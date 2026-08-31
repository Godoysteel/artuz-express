"use client";

import Image from "next/image";
import { useState } from "react";
import { PackageOpen } from "lucide-react";
import { shouldContainImage } from "@/lib/product/image-display";

export function ImageGallery({
  images,
  productName,
}: {
  images: { url: string; alt: string | null }[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
        {active ? (
          <Image
            src={active.url}
            alt={active.alt ?? productName}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={shouldContainImage(active.url) ? "object-contain bg-[#ebebeb]" : "object-cover"}
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 text-brand/40">
            <PackageOpen className="h-24 w-24" />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition ${
                index === activeIndex ? "border-brand" : "border-transparent hover:border-slate-300"
              }`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.alt ?? productName}
                fill
                sizes="120px"
                className={shouldContainImage(image.url) ? "object-contain bg-[#ebebeb]" : "object-cover"}
              />
            </button>
          ))}
        </div>
      )}

      {active && <p className="mt-2 text-xs text-slate-400">*Imagem meramente ilustrativa.</p>}
    </div>
  );
}
