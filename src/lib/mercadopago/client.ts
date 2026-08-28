import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado. Defina a variável de ambiente com suas credenciais (sandbox ou produção) do Mercado Pago.",
    );
  }
  return token;
}

export function getPreferenceClient() {
  const config = new MercadoPagoConfig({ accessToken: getAccessToken() });
  return new Preference(config);
}

export function getPaymentClient() {
  const config = new MercadoPagoConfig({ accessToken: getAccessToken() });
  return new Payment(config);
}
