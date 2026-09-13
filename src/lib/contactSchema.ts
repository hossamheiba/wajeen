/**
 * What the contact form may send, for all three kinds.
 *
 * One schema, used by the browser (through `zodResolver`) and by the route
 * handler. That has been the arrangement since the form was one kind, and it
 * is why a field cannot be validated in the UI and then dropped on the way
 * out — the bug the old vendor fields worked around by folding themselves
 * into the message.
 *
 * A discriminated union rather than one flat object with everything optional:
 * `kind` decides which fields exist, so "a career submission has four fields
 * and no message" is a property of the type, not a comment. Django repeats the
 * same rules in its serializer and again as CHECK constraints, because this
 * layer runs on the client and therefore proves nothing.
 */

import { z } from "zod";
import { CITY, SEND_TO, SERVICE_TYPE } from "@/lib/inquiryVocab";

/**
 * Honeypot. Hidden from real users, so it must arrive empty; a bot that fills
 * every field it finds gives itself away. Optional and unvalidated on purpose
 * — the route decides what to do with it, and a missing value (an older
 * client, or a request that simply omits it) is still valid.
 */
const honeypot = z.string().optional();

/**
 * The client's own reference for one attempt at sending. Generated once when
 * the form is submitted and reused by every retry of that same submission, so
 * a timeout followed by a retry lands on one inquiry instead of two. Django
 * holds it under a unique constraint and is the final judge.
 */
const idempotencyKey = z.string().uuid();

export const inquiryFormSchema = z
  .object({
    kind: z.enum(["contact", "vendor", "career"]),
    idempotencyKey,
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    // Required for every kind, by decision — it used to be optional.
    phone: z.string().trim().min(1),
    company: honeypot,
    // No `.default()` on any of these. A zod default makes the parsed *output*
    // required while the *input* stays optional, and react-hook-form resolves
    // one generic against both — so the two types stop matching and the
    // resolver no longer typechecks. The form supplies every value through
    // `defaultValues` instead, which is where a form's defaults belong.
    message: z.string().trim(),
    sendTo: z.string(),
    companyName: z.string().trim(),
    city: z.string(),
    serviceType: z.string(),
    isAramcoVendor: z.boolean(),
    aramcoVendorId: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const require = (path: string, ok: boolean) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message: "required" });
    };

    if (data.kind === "contact") {
      require("sendTo", SEND_TO.includes(data.sendTo as (typeof SEND_TO)[number]));
      require("message", data.message.length >= 10);
    }

    if (data.kind === "vendor") {
      require("companyName", data.companyName.length > 0);
      require("city", CITY.includes(data.city as (typeof CITY)[number]));
      require(
        "serviceType",
        SERVICE_TYPE.includes(data.serviceType as (typeof SERVICE_TYPE)[number]),
      );
      require("message", data.message.length >= 10);
      // The conditional field: required when ticked, ignored when not.
      if (data.isAramcoVendor) require("aramcoVendorId", data.aramcoVendorId.length > 0);
    }

    // `career` adds no rule here: its only extra field is the file, which
    // react-hook-form does not hold and zod cannot see.
  });

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

/**
 * The payload for one kind, with every field that does not belong to it
 * removed.
 *
 * Two things depend on this being a deliberate step rather than a spread of
 * the form state: a vendor id must not travel when the box is unticked (the
 * database refuses to store a placeholder, and sending one would be a lie
 * about what was collected), and a career submission must not carry a
 * message.
 */
export function payloadFor(values: InquiryFormValues) {
  const base = {
    idempotency_key: values.idempotencyKey,
    kind: values.kind,
    name: values.name,
    email: values.email,
    phone: values.phone,
  };

  if (values.kind === "contact") {
    return { ...base, send_to: values.sendTo, message: values.message };
  }

  if (values.kind === "vendor") {
    return {
      ...base,
      company_name: values.companyName,
      city: values.city,
      service_type: values.serviceType,
      is_aramco_vendor: values.isAramcoVendor,
      ...(values.isAramcoVendor ? { aramco_vendor_id: values.aramcoVendorId } : {}),
      message: values.message,
    };
  }

  return base;
}
