const TOKEN_KEY = "webmail_token";
const USER_KEY = "webmail_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  authSource?: "LOCAL" | "MAIL_SERVER";
  avatarUrl?: string | null;
}

// Actualiza el usuario cacheado en localStorage (ej. tras cambiar nombre o
// avatar en Ajustes) sin tocar el token de sesión.
export function updateStoredUser(patch: Partial<AuthUser>): AuthUser | null {
  const current = getStoredUser();
  if (!current) return null;
  const next = { ...current, ...patch };
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  } catch {
    // no-op
  }
  return next;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage puede no estar disponible (ventana privada, etc.)
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // no-op
  }
}
