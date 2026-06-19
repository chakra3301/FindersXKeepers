import { z } from "zod";
import { isShippingCountryCode } from "@/lib/profile/countries";

const required = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

export const addressSchema = z.object({
  recipientName: required("Recipient name"),
  line1: required("Address line 1"),
  line2: optional,
  city: required("City"),
  region: optional,
  postalCode: required("Postal code"),
  country: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => isShippingCountryCode(v), {
      message: "Choose a supported shipping country.",
    }),
  phone: optional,
});

export type AddressInput = z.infer<typeof addressSchema>;
