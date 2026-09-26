import type { MailFolder } from "./api";
import type { TranslationKey } from "@/i18n/dictionaries";

const SPECIAL_USE_KEYS: Record<string, TranslationKey> = {
  "\\Inbox": "folder.inbox",
  "\\Sent": "folder.sent",
  "\\Drafts": "folder.drafts",
  "\\Trash": "folder.trash",
  "\\Junk": "folder.junk",
  "\\Archive": "folder.archive",
};

// El servidor IMAP devuelve el nombre real de la carpeta (casi siempre en
// inglés: "INBOX", "Sent", "Trash"...) sin importar el idioma del webmail.
// Traducimos solo las carpetas estándar reconocidas por specialUse; las
// carpetas propias del usuario (creadas en el webmail o en otro cliente de
// correo) se muestran tal cual, porque no tenemos forma de saber su idioma.
export function folderDisplayName(folder: Pick<MailFolder, "name" | "specialUse">, t: (key: TranslationKey) => string): string {
  const key = folder.specialUse ? SPECIAL_USE_KEYS[folder.specialUse] : undefined;
  return key ? t(key) : folder.name;
}
