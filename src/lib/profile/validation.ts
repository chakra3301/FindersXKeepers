import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { isShippingCountryCode } from "./countries";

export const DISPLAY_CURRENCIES = ["JPY", ...SUPPORTED_CURRENCIES] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const updateProfileSchema = z.object({
  shippingCountry: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v.toUpperCase()))
    .refine((v) => v === null || isShippingCountryCode(v), {
      message: "Choose a supported shipping country.",
    }),
  currencyPref: z.enum(DISPLAY_CURRENCIES, {
    message: "Choose a supported display currency.",
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
