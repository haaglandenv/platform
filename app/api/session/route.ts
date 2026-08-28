import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  role: z.enum(["leadership", "association", "team", "referee", "supporter"]),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige demo-rol." }, { status: 400 });
  const response = NextResponse.json({ ok: true, role: parsed.data.role });
  response.cookies.set("hv-demo-role", parsed.data.role, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
