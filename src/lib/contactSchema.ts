import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().or(z.literal("")),
  sector: z.enum(["infrastructure", "energy", "buildings", "other"]),
  message: z.string().trim().min(10),
  /**
   * Honeypot. Hidden from real users, so it must arrive empty; a bot that
   * fills every field it finds gives itself away. Optional and unvalidated on
   * purpose — the API decides what to do with it, and a missing value (an
   * older client, or a request that simply omits it) is still valid.
   */
  company: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
