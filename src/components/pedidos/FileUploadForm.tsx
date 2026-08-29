"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARTWORK_BUCKET, ALLOWED_EXTENSIONS, isAllowedFile } from "@/lib/orders/files";
import { createUploadUrlAction, confirmFileUploadAction } from "@/lib/orders/upload-actions";

export function FileUploadForm({ orderItemId }: { orderItemId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    const validation = isAllowedFile(file.name, file.size);
    if (!validation.ok) {
      setError(validation.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const { path, token } = await createUploadUrlAction(orderItemId, file.name, file.size);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;

      await confirmFileUploadAction(orderItemId, path, file.name, file.type, file.size);
      setSuccess(true);
    } catch {
      setError("Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand">
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
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {success && <p className="mt-1 text-xs text-emerald-600">Arquivo enviado!</p>}
    </div>
  );
}
