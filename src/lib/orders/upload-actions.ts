"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ARTWORK_BUCKET, isAllowedFile } from "@/lib/orders/files";

class UploadError extends Error {}

/** Confirma que o item de pedido pertence ao usuário logado; devolve o order_id. */
async function verifyOwnership(orderItemId: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UploadError("Você precisa estar logado.");

  const service = createServiceClient();
  const { data: item } = await service
    .from("order_items")
    .select("order_id, orders!inner(user_id)")
    .eq("id", orderItemId)
    .single();

  if (!item || (item.orders as unknown as { user_id: string | null }).user_id !== user.id) {
    throw new UploadError("Pedido não encontrado.");
  }

  return item.order_id;
}

export async function createUploadUrlAction(orderItemId: string, fileName: string, sizeBytes: number) {
  const orderId = await verifyOwnership(orderItemId);

  const validation = isAllowedFile(fileName, sizeBytes);
  if (!validation.ok) throw new UploadError(validation.error);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orderId}/${orderItemId}/${randomUUID()}-${safeName}`;

  const service = createServiceClient();
  const { data, error } = await service.storage.from(ARTWORK_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new UploadError("Não foi possível preparar o envio.");

  return { path: data.path, token: data.token };
}

export async function confirmFileUploadAction(
  orderItemId: string,
  path: string,
  fileName: string,
  contentType: string,
  sizeBytes: number,
) {
  await verifyOwnership(orderItemId);

  const service = createServiceClient();
  const { error } = await service.from("order_item_files").insert({
    order_item_id: orderItemId,
    file_path: path,
    file_name: fileName,
    content_type: contentType,
    size_bytes: sizeBytes,
  });
  if (error) throw new UploadError("Não foi possível registrar o arquivo enviado.");

  revalidatePath("/pedidos/[id]", "page");
}
