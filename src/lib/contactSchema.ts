import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().or(z.literal("")),
  sector: z.enum(["infrastructure", "energy", "buildings", "other"]),
  message: z.string().trim().min(10),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
