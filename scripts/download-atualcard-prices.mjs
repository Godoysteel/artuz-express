import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = "https://oferta.atualcard.com.br";
const priceListUrl = `${baseUrl}/tabela-de-precos`;
const outputDir = resolve("data/supplier/atualcard");
const requestHeaders = {
  "user-agent": "Mozilla/5.0 ArtuzExpressCatalogSync/1.0",
};

const pageResponse = await fetch(priceListUrl, { headers: requestHeaders });

if (!pageResponse.ok) {
  throw new Error(
    `Falha ao abrir tabela da Atual Card: ${pageResponse.status}`,
  );
}

const pageHtml = await pageResponse.text();
const optionPattern =
  /<option[^>]+value=["']([^"']*precos_lista[^"']+\.xls)["'][^>]*>([^<]+)<\/option>/gi;
const files = [];

for (const match of pageHtml.matchAll(optionPattern)) {
  const path = match[1];
  const name = match[2].replace(/&amp;/g, "&").trim();
  const fileName = decodeURIComponent(path.split("/").at(-1));

  if (!files.some((file) => file.path === path)) {
    files.push({ name, path, fileName });
  }
}

if (!files.some((file) => file.path.endsWith("precos_lista.xls"))) {
  files.push({
    name: "Todos os produtos",
    path: "/arquivos/precos/precos_lista.xls",
    fileName: "precos_lista.xls",
  });
}

await mkdir(outputDir, { recursive: true });
const downloadedFiles = [];
const unavailableFiles = [];

for (const file of files) {
  const response = await fetch(new URL(file.path, baseUrl), {
    headers: requestHeaders,
  });

  if (!response.ok) {
    unavailableFiles.push({ ...file, status: response.status });
    console.warn(`${file.name}: indisponível (${response.status})`);
    continue;
  }

  const outputPath = resolve(outputDir, file.fileName);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  downloadedFiles.push(file);
  console.log(`${file.name}: ${outputPath}`);
}

await writeFile(
  resolve(outputDir, "manifest.json"),
  JSON.stringify(
    {
      source: priceListUrl,
      downloadedAt: new Date().toISOString(),
      files: downloadedFiles,
      unavailableFiles,
    },
    null,
    2,
  ),
);

console.log(
  `${downloadedFiles.length} tabelas baixadas; ${unavailableFiles.length} indisponíveis.`,
);
