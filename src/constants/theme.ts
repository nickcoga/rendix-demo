export const COLORS = {
  // Brand
  primary: '#001F3F',       // Deep Navy
  primaryDark: '#00142A',
  primaryLight: '#0A2E5C',
  accent: '#00E5FF',        // Electric Cyan
  accentDark: '#00B4D8',
  accentLight: '#E0F7FA',

  // Neutrals
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBorder: '#E2E8F0',
  divider: '#EDE8E8',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',

  // Status Colors
  success: '#10B981',       // Green / Saldo a favor
  successLight: '#ECFDF5',
  warning: '#F59E0B',       // Amber / Alerta tributaria
  warningLight: '#FFFBEB',
  danger: '#EF4444',        // Red / Excedente o gasto alto
  dangerLight: '#FEF2F2',

  // Badges de Origen del Dato
  aiBadgeBg: '#FEF3C7',
  aiBadgeText: '#92400E',
  aiBadgeBorder: '#FDE68A',

  editedBadgeBg: '#E0F2FE',
  editedBadgeText: '#0369A1',
  editedBadgeBorder: '#BAE6FD',

  emptyBadgeBg: '#F1F5F9',
  emptyBadgeText: '#64748B',
  emptyBadgeBorder: '#E2E8F0',
};

export const CATEGORIES = [
  'Alimentación',
  'Hospedaje',
  'Transporte',
  'Combustible/Peajes',
  'Materiales/Útiles',
  'Otros',
] as const;

export const DOCUMENT_TYPES = [
  'FACTURA',
  'BOLETA',
  'TICKET',
  'OTRO',
] as const;

export const DEFAULT_PROXY_URL = 'https://rendix-demo.vercel.app/api/extract';
export const PROXY_STORAGE_KEY = 'rendix_proxy_url';
