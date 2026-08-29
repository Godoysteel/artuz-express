export const WHATSAPP_NUMBER = "5547991987805";
export const WHATSAPP_DISPLAY = "(47) 99198-7805";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
