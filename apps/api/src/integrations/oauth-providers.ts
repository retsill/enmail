// Config de cada proveedor OAuth soportado. Gmail y Outlook exponen IMAP/SMTP
// con autenticación XOAUTH2, así que reutilizamos ImapMailProvider en vez de
// escribir un cliente REST distinto por proveedor — solo cambia cómo se
// consigue el access token.
//
// Yahoo/AOL: su OAuth de correo es más restringido para apps de terceros; se
// deja la estructura lista pero no se activa hasta confirmar acceso.

export interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl: string;
  extraAuthParams?: Record<string, string>;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpTls: boolean;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://mail.google.com/ openid email profile',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpTls: true,
  },
  outlook: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope:
      'https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access openid email profile',
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapTls: true,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpTls: false,
  },
};

export function getOAuthProvider(slug: string): OAuthProviderConfig | undefined {
  return OAUTH_PROVIDERS[slug];
}
