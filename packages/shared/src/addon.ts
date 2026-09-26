// Estructura mínima para el sistema de add-ons/licencias.
// El flujo real de validación contra dev.xcodevs.com se define más adelante
// (pendiente de referencia de otro proyecto ya publicado ahí).

export type AddonSlug = 'gmail' | 'outlook' | 'yahoo';

export type AddonStatus = 'AVAILABLE' | 'INSTALLED' | 'LOCKED';

export interface AddonManifest {
  slug: AddonSlug;
  name: string;
  description?: string;
}

export interface LicenseValidationResult {
  isValid: boolean;
  expiresAt?: Date;
  plan?: string;
}

// Cliente que hablará con dev.xcodevs.com — placeholder hasta tener el
// flujo real de referencia.
export interface LicenseValidator {
  validate(licenseKey: string, domain: string): Promise<LicenseValidationResult>;
}
