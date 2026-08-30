import { z } from "zod";
import { isValidCpf } from "@/lib/format";

export const checkoutFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  cep: z.string().min(9, "CEP inválido"),
  logradouro: z.string().min(3, "Endereço obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  uf: z
    .string()
    .length(2, "UF inválida")
    .transform((v) => v.toUpperCase()),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
