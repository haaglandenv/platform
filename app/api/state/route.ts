import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { publicProjection, scopedProjection } from "@/lib/projections";
import { readState } from "@/lib/store";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const roles: Role[] = ["leadership", "association", "team", "referee", "supporter"];

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const rawRole = jar.get("hv-demo-role")?.value as Role | undefined;
  const role = rawRole && roles.includes(rawRole) ? rawRole : "supporter";
  const state = await readState();
  const surface = request.nextUrl.searchParams.get("surface");
  const data = surface === "operations" ? scopedProjection(state, role) : publicProjection(state);
  return NextResponse.json(
    { role, data },
    { headers: { "Cache-Control": "no-store, private", Vary: "Cookie" } },
  );
}
