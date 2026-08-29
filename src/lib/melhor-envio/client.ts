import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const BASE_URL = "https://melhorenvio.com.br";
const APP_USER_AGENT = "Artuz Express (telmaartuz@gmail.com)";

// De onde os pedidos são despachados — mesmo CEP usado em todas as cotações.
export const ORIGIN_POSTAL_CODE = "89205800";

function getClientCredentials() {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "MELHOR_ENVIO_CLIENT_ID / MELHOR_ENVIO_CLIENT_SECRET não configurados.",
    );
  }
  return { clientId, clientSecret };
}

function getRedirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/api/integrations/melhor-envio/callback`;
}

export function getAuthorizeUrl(state: string): string {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
    scope: "shipping-calculate shipping-companies",
  });
  return `${BASE_URL}/oauth/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": APP_USER_AGENT,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Falha ao obter token do Melhor Envio (${response.status}): ${detail}`);
  }
  return response.json();
}

async function persistTokens(tokens: TokenResponse) {
  const service = createServiceClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await service.from("melhor_envio_tokens").upsert({
    id: true,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret } = getClientCredentials();
  const tokens = await requestToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(),
    code,
  });
  await persistTokens(tokens);
}

async function refreshTokens(refreshToken: string) {
  const { clientId, clientSecret } = getClientCredentials();
  const tokens = await requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  await persistTokens(tokens);
  return tokens.access_token;
}

/**
 * Retorna um access_token válido, renovando via refresh_token quando estiver
 * perto de expirar. Lança erro se a autorização inicial (fluxo OAuth manual,
 * uma vez só) ainda não foi feita.
 */
export async function getValidAccessToken(): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service.from("melhor_envio_tokens").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Melhor Envio ainda não foi autorizado. Acesse /api/integrations/melhor-envio/authorize para conectar a conta.",
    );
  }

  const expiresInMs = new Date(data.expires_at).getTime() - Date.now();
  // Renova com folga de 1 dia antes de expirar de verdade.
  if (expiresInMs < 24 * 60 * 60 * 1000) {
    return refreshTokens(data.refresh_token);
  }
  return data.access_token;
}

export type ShippingQuoteItem = {
  weightGrams: number;
  quantity: number;
  boxWidthCm: number;
  boxHeightCm: number;
  boxLengthCm: number;
};

export type ShippingOption = {
  serviceId: number;
  serviceName: string;
  companyName: string;
  priceCents: number;
  deliveryDays: number | null;
};

/**
 * Cota frete somando todos os itens do carrinho numa única caixa (maior
 * dimensão de cada eixo, peso total). É uma aproximação — o ideal seria uma
 * caixa por item, mas a maioria dos pedidos da Artuz é de poucos itens
 * relativamente pequenos, então uma caixa só tende a superestimar (nunca
 * subestimar) o frete real.
 */
export async function calculateShipping(
  destinationPostalCode: string,
  items: ShippingQuoteItem[],
): Promise<ShippingOption[]> {
  if (items.length === 0) return [];

  const totalWeightKg = items.reduce((sum, i) => sum + (i.weightGrams * i.quantity) / 1000, 0);
  const width = Math.max(...items.map((i) => i.boxWidthCm));
  const height = items.reduce((sum, i) => sum + i.boxHeightCm * i.quantity, 0);
  const length = Math.max(...items.map((i) => i.boxLengthCm));

  const accessToken = await getValidAccessToken();
  const response = await fetch(`${BASE_URL}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": APP_USER_AGENT,
    },
    body: JSON.stringify({
      from: { postal_code: ORIGIN_POSTAL_CODE },
      to: { postal_code: destinationPostalCode.replace(/\D/g, "") },
      volumes: [
        {
          width: Math.max(11, Math.round(width)),
          height: Math.max(2, Math.round(height)),
          length: Math.max(11, Math.round(length)),
          weight: Math.max(0.1, Number(totalWeightKg.toFixed(3))),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Falha ao cotar frete no Melhor Envio (${response.status}): ${detail}`);
  }

  const results: unknown = await response.json();
  if (!Array.isArray(results)) return [];

  return results
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !("error" in r))
    .map((r) => ({
      serviceId: Number(r.id),
      serviceName: String(r.name ?? ""),
      companyName: String((r.company as { name?: string } | undefined)?.name ?? ""),
      priceCents: Math.round(Number(r.price) * 100),
      deliveryDays: r.delivery_time != null ? Number(r.delivery_time) : null,
    }))
    .filter((r) => Number.isFinite(r.priceCents) && r.priceCents > 0);
}
