import { z } from "zod";

export const MIN_CONDITIONS = [
  "new",
  "like_new",
  "good",
  "acceptable",
  "any",
] as const;

export const RUSH_TIERS = ["standard", "priority", "express"] as const;

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .or(z.literal(""))
  .optional();

export const createRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give your request a clear title (at least 3 characters).")
    .max(140, "Keep the title under 140 characters."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  referenceUrl: optionalUrl,
  referenceImageUrl: optionalUrl,
  minCondition: z.enum(MIN_CONDITIONS),
  mustHaves: z.array(z.string().trim().min(1)).max(20),
  niceToHaves: z.array(z.string().trim().min(1)).max(20),
  budgetCapJpy: z
    .number()
    .int()
    .min(0, "Budget can't be negative.")
    .max(100_000_000)
    .nullable(),
  rushTier: z.enum(RUSH_TIERS),
  deadlineAt: z.string().trim().min(1).nullable().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
