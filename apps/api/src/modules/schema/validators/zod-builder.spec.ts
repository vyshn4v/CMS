import { validateEntryData, buildZodSchema } from './zod-builder';
import { SchemaDefinition } from '@cms/shared-types';

describe('Zod Dynamic Schema Builder', () => {
  const sampleSchema: SchemaDefinition = {
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        validations: {
          minLength: 3,
          maxLength: 50,
        },
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: false,
      },
      {
        name: 'age',
        label: 'Age',
        type: 'number',
        required: true,
        validations: {
          min: 18,
          max: 120,
        },
      },
      {
        name: 'status',
        label: 'Status',
        type: 'enum',
        options: ['draft', 'published', 'archived'],
      },
    ],
  };

  it('should validate valid data matching schema', () => {
    const validData = {
      title: 'Valid Title Here',
      email: 'user@example.com',
      age: 25,
      status: 'published',
    };

    const result = validateEntryData(sampleSchema, validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it('should reject payload missing required fields', () => {
    const invalidData = {
      email: 'user@example.com',
      // missing title and age
    };

    const result = validateEntryData(sampleSchema, invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const fieldsWithErrors = result.errors.map((e) => e.field);
    expect(fieldsWithErrors).toContain('title');
    expect(fieldsWithErrors).toContain('age');
  });

  it('should enforce min/max validations', () => {
    const invalidData = {
      title: 'Hi', // too short (< 3)
      age: 15,     // too young (< 18)
    };

    const result = validateEntryData(sampleSchema, invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    expect(result.errors.some((e) => e.field === 'age')).toBe(true);
  });

  it('should reject invalid email formats', () => {
    const invalidData = {
      title: 'Valid Title',
      age: 21,
      email: 'not-an-email',
    };

    const result = validateEntryData(sampleSchema, invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('should reject enum values not in allowed options', () => {
    const invalidData = {
      title: 'Valid Title',
      age: 21,
      status: 'unknown_status',
    };

    const result = validateEntryData(sampleSchema, invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'status')).toBe(true);
  });
});
