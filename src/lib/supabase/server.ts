import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripBom, SB_URL, SB_ANON } from "./sanitize";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SB_URL,
    SB_ANON,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ ...c, value: stripBom(c.value) }));
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, stripBom(value), options)
            );
          } catch {}
        },
      },
    }
  );
}
