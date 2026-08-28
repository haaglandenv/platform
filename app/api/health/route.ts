import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "haaglandencup",
      environment: process.env.APP_ENVIRONMENT ?? "development",
      revision: process.env.APP_REVISION ?? "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
