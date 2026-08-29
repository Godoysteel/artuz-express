"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARTWORK_BUCKET, ALLOWED_EXTENSIONS, isAllowedFile } from "@/lib/orders/files";
import {
  createDraftUploadUrlAction,
  confirmDraftUploadAction,
  removeDraftArtworkAction,
} from "@/lib/orders/draft-upload-actions";

export function ArtworkUpload({
  token,
  disabled,
  fileName,
  onFileChange,
}: {
  token: string;
  disabled: boolean;
  fileName: string | null;
  onFileChange: (fileName: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const validation = isAllowedFile(file.name, file.size);
    if (!validation.ok) {
      setError(validation.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const { path, token: uploadToken } = await createDraftUploadUrlAction(token, file.name, file.size);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .uploadToSignedUrl(path, uploadToken, file);
      if (uploadError) throw uploadError;

      await confirmDraftUploadAction(token, path, file.name, file.type, file.size);
      onFileChange(file.name);
    } catch {
      setError("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    onFileChange(null);
    await removeDraftArtworkAction(token);
  }

  if (disabled) return null;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-medium text-ink">Arte do pedido</p>
      {fileName ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-emerald-600">{fileName}</p>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            Remover
          </button>
        </div>
      ) : (
        <>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand">
            {isUploading ? "Enviando..." : "Enviar arquivo de arte"}
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs text-slate-400">
            {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} — até 25 MB
          </p>
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
