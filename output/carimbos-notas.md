# Carimbos — atualização local

Referência: https://www.atualcard.com.br/carimbos/9844 (30/08/2026).

- Seis entradas, na ordem Nykon, Trodat, Chancela, Roupas, Madeira e Acessórios.
- Quatro famílias existentes preservadas. Chancela e roupas mantêm acesso direto aos produtos e suas variações.
- Cinco capas ilustrativas geradas com o imagegen integrado, usando fotografias da Atual Card como referência física e a paleta Artuz no cenário.
- Fotografias do fornecedor associadas a 19 produtos; fontes individuais em `carimbos-referencias.json`.
- Kit para roupas mantém a imagem anterior: a página `/carimbo-roupas/9856` não apresentou fotografia utilizável nesta consulta.
- A Atual Card utiliza a mesma fotografia nos Trodat 5211 e 5212; mantido esse comportamento. O produto madeira agrupado conserva a referência 7x2 cm; outras medidas continuam selecionáveis nas variações.
- Capas são ilustrações de famílias, não fotografias técnicas nem indicação de kit incluído. Os detalhes de produto usam as imagens originais do fornecedor.
- Nenhuma alteração de preço, estoque, produto ou banco de dados. Sem publicação.

## Prompt das cinco capas

Edit the supplied product reference into a premium square ecommerce category cover for Artuz Express. Keep EXACTLY the depicted stamp hardware: same physical shapes, quantity, manufacturer markings, plastic/metal/wood materials and original device colors. No redesign or invented parts. Arrange this same equipment on a warm light gray tabletop with soft studio shadows, all objects fully visible within safe generous margins. Use only subtle background stationery accents in petrol blue #073D48, coral #EF7469, mustard #DBA51C and ivory; avoid clutter and props suggesting included accessories. Clean photorealistic product photography, 1:1 square. No overlay titles, prices, watermarks, frames or other text. Preserve manufacturer markings on actual hardware. This is a product accuracy task, not a stylistic reinterpretation of the devices.

Arquivos finais: `public/produtos/carimbos/capa-{nykon,trodat,chancela,madeira,acessorios}-v2.png`.
