import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value?.trim();

  // Not logged in: bounce to the login page instead of rendering the dashboard
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Presence of a cookie is not enough (it can be stale): verify the token
  // against the backend before serving any dashboard page.
  try {
    const res = await fetch(`${API}/user`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const response = NextResponse.redirect(new URL("/", request.url));
      // Stale/invalid token: clear the cookies so the next visit is clean
      response.cookies.delete("token");
      response.cookies.delete("userRole");
      return response;
    }
  } catch {
    // Backend momentarily unreachable: don't lock logged-in users out,
    // the backend itself still 401s any real data request.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
