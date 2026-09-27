import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/signup", "/auth"];
const MFA = ["/mfa"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse("Portal not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.", { status: 500 });
  }

  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const path = request.nextUrl.pathname;
  const { data: { user } } = await sb.auth.getUser();
  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user) {
    if (PUBLIC.some((p) => path.startsWith(p)) || path.startsWith("/auth")) return response;
    return redirect("/login");
  }

  // Signed in: enforce 2FA for everyone.
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  const onMfa = MFA.some((p) => path.startsWith(p));
  if (aal?.nextLevel !== "aal2") {
    // No authenticator enrolled yet
    return path.startsWith("/mfa/enroll") ? response : redirect("/mfa/enroll");
  }
  if (aal.currentLevel !== "aal2") {
    if (path.startsWith("/mfa/verify")) return response;
    const next = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirect(`/mfa/verify${next}`);
  }
  if (onMfa || path.startsWith("/login") || path.startsWith("/signup")) return redirect("/");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
