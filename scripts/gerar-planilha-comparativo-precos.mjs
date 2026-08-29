// Gera uma planilha comparando o preço/quantidade mínima que a Artuz Express
// vende cada produto com o preço/quantidade equivalente do fornecedor
// (Atual Card), lado a lado, para facilitar revisão manual de preços.
//
// Uso:
//   node --env-file=.env.local scripts/gerar-planilha-comparativo-precos.mjs [caminho-saida.xlsx]

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const outPath = process.argv[2] ?? "comparativo-precos-artuz-atualcard.xlsx";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAll(table, select, filterFn) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const categories = await fetchAll("categories", "id, name").then((rows) =>
  new Map(rows.map((r) => [r.id, r.name])),
);

const products = await fetchAll("products", "id, name, category_id", (q) => q.eq("is_active", true));

const variants = await fetchAll(
  "product_variants",
  "product_id, quantity, price_cents, attributes",
  (q) => q.eq("is_active", true),
);

const variantsByProduct = new Map();
for (const v of variants) {
  const list = variantsByProduct.get(v.product_id) ?? [];
  list.push(v);
  variantsByProduct.set(v.product_id, list);
}

const rows = [];
for (const p of products) {
  const productVariants = variantsByProduct.get(p.id) ?? [];
  if (productVariants.length === 0) continue;
  const cheapest = [...productVariants].sort((a, b) => a.price_cents - b.price_cents)[0];
  const attrs = cheapest.attributes ?? {};
  const supplierCostCents = attrs.supplier_cost_cents != null ? Number(attrs.supplier_cost_cents) : null;
  const markupPercent = attrs.markup_percent != null ? Number(attrs.markup_percent) : null;

  rows.push({
    Categoria: categories.get(p.category_id) ?? "",
    Produto: p.name,
    "Qtd mínima (Artuz)": cheapest.quantity,
    "Preço Artuz (R$)": Number((cheapest.price_cents / 100).toFixed(2)),
    "Qtd mínima (Atual Card)": supplierCostCents != null ? cheapest.quantity : "",
    "Preço Atual Card (R$)": supplierCostCents != null ? Number((supplierCostCents / 100).toFixed(2)) : "",
    "Markup (%)": markupPercent ?? "",
    Especificação: attrs.specification ?? "",
  });
}

rows.sort((a, b) => a.Categoria.localeCompare(b.Categoria) || a.Produto.localeCompare(b.Produto));

const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet["!cols"] = [
  { wch: 24 }, // Categoria
  { wch: 46 }, // Produto
  { wch: 16 }, // Qtd mínima Artuz
  { wch: 16 }, // Preço Artuz
  { wch: 18 }, // Qtd mínima Atual Card
  { wch: 18 }, // Preço Atual Card
  { wch: 10 }, // Markup
  { wch: 50 }, // Especificação
];
worksheet["!autofilter"] = { ref: worksheet["!ref"] };
worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Comparativo de preços");
XLSX.writeFile(workbook, outPath);

console.log(`${rows.length} produtos exportados para ${outPath}`);
