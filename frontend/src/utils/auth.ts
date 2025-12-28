export type CurrentUser = {
  id?: number;
  username?: string;
  role?: string | null;
  fullName?: string;
  personInfo?: any;
};

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function getCurrentUser(): CurrentUser | null {
  // 1) Try localStorage 'user'
  try {
    const u = safeJsonParse<CurrentUser>(localStorage.getItem("user"));
    if (u && typeof u === "object") return u;
  } catch {
    // swallow
  }

  // 2) Try decode JWT payload from accessToken
  try {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payload = parts[1];
        // atob handles base64 in browser; replace URL-safe chars
        const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
          atob(b64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
        const parsed = safeJsonParse<any>(json);
        if (parsed) {
          return {
            id: parsed.userId || parsed.id,
            username: parsed.username,
            role: parsed.role || null,
            fullName: parsed.fullName,
          };
        }
      }
    }
  } catch {
    // swallow
  }

  return null;
}



