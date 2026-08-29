"use server";

import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { ARTWORK_BUCKET, isAllowedFile } from "@/lib/orders/files";

class UploadError extends Error {}

/**
 * Upload de arte feito na página do produto, antes de existir carrinho/pedido
 * — não exige login (carrinho de visitante também deve poder anexar arte).
 * Identificado por um token aleatório gerado no client; a segurança vem só
 * de o token ser um UUID imprevisível, igual ao padrão já usado pro
 * guest_token do carrinho.
 */
export async function createDraftUploadUrlAction(token: string, fileName: string, sizeBytes: number) {
  const validation = isAllowedFile(fileName, sizeBytes);
  if (!validation.ok) throw new UploadError(validation.error);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `draft/${token}/${randomUUID()}-${safeName}`;

  const service = createServiceClient();
  const { data, error } = await service.storage.from(ARTWORK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new UploadError("Não foi possível preparar o envio.");

  return { path: data.path, token: data.token };
}

export async function confirmDraftUploadAction(
  token: string,
  path: string,
  fileName: string,
  contentType: string,
  sizeBytes: number,
) {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("draft_artwork")
    .select("file_path")
    .eq("token", token)
    .maybeSingle();
  if (existing && existing.file_path !== path) {
    await service.storage.from(ARTWORK_BUCKET).remove([existing.file_path]);
  }

  const { error } = await service.from("draft_artwork").upsert({
    token,
    file_path: path,
    file_name: fileName,
    content_type: contentType,
    size_bytes: sizeBytes,
  });
  if (error) throw new UploadError("Não foi possível registrar o arquivo enviado.");
}

export async function removeDraftArtworkAction(token: string) {
  const service = createServiceClient();
  const { data: existing } = await service
    .from("draft_artwork")
    .select("file_path")
    .eq("token", token)
    .maybeSingle();
  if (!existing) return;

  await service.storage.from(ARTWORK_BUCKET).remove([existing.file_path]);
  await service.from("draft_artwork").delete().eq("token", token);
}
