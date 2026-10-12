import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const PROTECTED_ROUTE_SEGMENTS = [
  "dashboard",
  "workout",
  "exercises",
  "calendar",
  "progress",
  "settings",
  "routines",
] as const;

const AUTH_ROUTE_SEGMENTS = ["login", "register"] as const;

/**
 * Checks if a pathname belongs to a protected area based on exact first route segment.
 * E.g., '/dashboard' or '/dashboard/overview' matches, but '/dashboard-info' does not.
 */
export function isProtectedRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  return (PROTECTED_ROUTE_SEGMENTS as readonly string[]).includes(segments[0]);
}

/**
 * Checks if a pathname belongs to auth routes (login/register).
 */
export function isAuthRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  return (AUTH_ROUTE_SEGMENTS as readonly string[]).includes(segments[0]);
}

/**
 * Validates and sanitizes a redirect target to prevent open redirect vulnerabilities.
 * Ensures the target is strictly an internal, relative path.
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") {
    return "/dashboard";
  }

  // Must begin with a single slash and not double slashes (protocol-relative URLs)
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return "/dashboard";
  }

  // Must not contain explicit protocols (e.g. https://, javascript:)
  if (path.includes("://") || path.toLowerCase().includes("javascript:")) {
    return "/dashboard";
  }

  return path;
}

/**
 * Refreshes auth tokens and applies route protection rules.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    // IMPORTANT: getUser() cryptographically verifies the token on the server
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // In unconfigured local environments or offline networks, fail-secure to unauthenticated
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Protect internal application routes
  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login/register
  if (user && isAuthRoute(pathname)) {
    const target = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirectTo")
    );
    const redirectUrl = new URL(target, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
