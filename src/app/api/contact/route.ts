import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/contactSchema";
import { sendContactEmail } from "@/lib/mailer";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // Rate limit before parsing: a flood should cost as little as possible.
  const limited = rateLimit(clientKey(request));
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, errors: {} },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { company, ...submission } = parsed.data;

  // Honeypot tripped. Answer exactly as a success would, so the bot learns
  // nothing about why nothing happened — and send nothing.
  if (company && company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  try {
    await sendContactEmail(submission);
  } catch (error) {
    // Log the failure *reason* only. The submission itself is personal data
    // and never reaches the logs; the client gets a bare flag, with no
    // provider detail that could leak configuration.
    console.error(
      "[contact] delivery failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
