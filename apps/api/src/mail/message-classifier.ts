import type { MailMessageDTO } from '@webmail/shared';

// Categoriza mensajes al estilo de las pestañas de Gmail (Principal, Social,
// Promociones, Notificaciones, Foros). Gmail usa un clasificador ML entrenado
// con señales que no tenemos acceso; esto es una heurística simple por
// dominio/remitente/asunto — útil para organizar, no pretende ser exacta.

const SOCIAL_DOMAINS = [
  'facebookmail.com',
  'facebook.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'pinterest.com',
  'tiktok.com',
  'snapchat.com',
];

const FORUM_HINTS = ['groups.google.com', 'googlegroups.com', 'discourse', 'forum.'];

const PROMO_LOCAL_HINTS = ['newsletter', 'promo', 'offers', 'marketing', 'deals', 'campaign'];
const PROMO_DOMAIN_HINTS = [
  'hubspotemail.net',
  'mailchimp.com',
  'sendgrid.net',
  'constantcontact.com',
  'klaviyomail.com',
  'acumba.com',
  'sparkpostmail.com',
];

const UPDATE_LOCAL_HINTS = [
  'noreply',
  'no-reply',
  'notification',
  'notifications',
  'wordpress',
  'support',
  'alert',
  'alerts',
  'security',
  'billing',
  'invoice',
];

export type MailMessageCategory = 'PRIMARY' | 'SOCIAL' | 'PROMOTIONS' | 'UPDATES' | 'FORUMS';

export function classifyMessage(message: Pick<MailMessageDTO, 'fromAddress' | 'subject'>): MailMessageCategory {
  const from = (message.fromAddress ?? '').toLowerCase();
  const subject = (message.subject ?? '').toLowerCase();
  const [local, domain = ''] = from.split('@');

  if (SOCIAL_DOMAINS.some((d) => domain.endsWith(d))) return 'SOCIAL';
  if (FORUM_HINTS.some((h) => domain.includes(h))) return 'FORUMS';
  if (
    PROMO_LOCAL_HINTS.some((h) => local.includes(h)) ||
    PROMO_DOMAIN_HINTS.some((h) => domain.endsWith(h)) ||
    /\b(sale|off|discount|% ?off|deal|coupon)\b/.test(subject)
  ) {
    return 'PROMOTIONS';
  }
  if (UPDATE_LOCAL_HINTS.some((h) => local.includes(h))) return 'UPDATES';

  return 'PRIMARY';
}
