import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/contactSchema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // NOTE: no email/CRM provider is wired up yet — this only logs server-side.
  // Connect this to a real provider (e.g. Resend, SendGrid, or the future CRM) before launch.
  console.log("[contact] new submission:", parsed.data);

  return NextResponse.json({ ok: true });
}
