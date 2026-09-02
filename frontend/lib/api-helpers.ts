// CrimeIntel — API response helpers
// Thin, consistent HTTP responses for route handlers.

import { NextResponse } from "next/server";

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message = "Bad request"): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}