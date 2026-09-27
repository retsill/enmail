// Contrato común para "cambiar la contraseña real de un buzón" contra la API
// del panel de hosting que lo administra (cPanel/Plesk/aaPanel). No hay
// protocolo estándar de IMAP/SMTP para esto — cada panel tiene su propia API,
// así que cada implementación traduce (email, password nueva) a lo que ese
// panel puntual necesita.
export interface MailboxPasswordProvider {
  // Verifica que las credenciales configuradas realmente funcionan contra
  // el panel, sin tocar ningún buzón — para el botón "Probar conexión" del
  // admin, así se detecta un dato mal cargado antes de que un usuario
  // dependa de esto para cambiar su password de verdad.
  testConnection(): Promise<void>;
  changePassword(email: string, newPassword: string): Promise<void>;
}

export interface MailboxPasswordConfig {
  baseUrl: string;
  username: string;
  secret: string;
  allowInsecureTls: boolean;
}
