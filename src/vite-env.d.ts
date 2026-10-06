/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API (p. ej. https://api.midominio.com/api). Por defecto «/api» (proxy de Vite). */
  readonly VITE_API_URL?: string;
}
