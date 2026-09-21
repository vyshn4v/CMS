import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Defensively unpacks JSON schema definitions whether stored as an object or JSON string.
 */
export function safeParseSchema<T = any>(rawSchema: any): T {
  if (!rawSchema) return { fields: [] } as unknown as T;
  if (typeof rawSchema === 'string') {
    try {
      const parsed = JSON.parse(rawSchema);
      return (typeof parsed === 'object' && parsed !== null ? parsed : { fields: [] }) as unknown as T;
    } catch {
      return { fields: [] } as unknown as T;
    }
  }
  return (typeof rawSchema === 'object' && rawSchema !== null ? rawSchema : { fields: [] }) as unknown as T;
}

