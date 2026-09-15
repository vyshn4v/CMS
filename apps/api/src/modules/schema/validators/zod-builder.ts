import { z } from 'zod';
import { FieldDefinition, SchemaDefinition } from '@cms/shared-types';

/**
 * Dynamically builds a Zod validator object from a ContentType's stored JSONB schema.
 */
export function buildZodSchema(schemaDef: SchemaDefinition): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const fields = schemaDef?.fields || [];

  for (const field of fields) {
    let validator: z.ZodTypeAny;

    switch (field.type) {
      case 'text': {
        let strVal = z.string();
        if (field.validations?.minLength != null) {
          strVal = strVal.min(
            field.validations.minLength,
            `Must be at least ${field.validations.minLength} characters`,
          );
        }
        if (field.validations?.maxLength != null) {
          strVal = strVal.max(
            field.validations.maxLength,
            `Must be at most ${field.validations.maxLength} characters`,
          );
        }
        if (field.validations?.pattern) {
          strVal = strVal.regex(
            new RegExp(field.validations.pattern),
            field.validations.regexErrorMessage || 'Invalid format',
          );
        }
        validator = strVal;
        break;
      }

      case 'richtext':
        validator = z.string();
        break;

      case 'email': {
        let emailVal = z.string().email('Must be a valid email address');
        validator = emailVal;
        break;
      }

      case 'number': {
        let numVal = z.coerce.number();
        if (field.validations?.min != null) {
          numVal = numVal.min(field.validations.min, `Must be at least ${field.validations.min}`);
        }
        if (field.validations?.max != null) {
          numVal = numVal.max(field.validations.max, `Must be at most ${field.validations.max}`);
        }
        validator = numVal;
        break;
      }

      case 'boolean':
        validator = z.coerce.boolean();
        break;

      case 'date':
      case 'datetime':
        validator = z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          'Must be a valid ISO date/time string',
        );
        break;

      case 'enum': {
        const options = field.options && field.options.length > 0 ? field.options : ['default'];
        validator = z.enum(options as [string, ...string[]]);
        break;
      }

      case 'media':
        validator = z.string();
        break;

      case 'json':
        validator = z.any();
        break;

      case 'relation':
        validator =
          field.relation?.type === 'many-to-many' || field.relation?.type === 'one-to-many'
            ? z.array(z.string())
            : z.string();
        break;

      case 'component':
        validator = z.record(z.any());
        break;

      case 'dynamiczone':
        validator = z.array(z.record(z.any()));
        break;

      default:
        validator = z.any();
    }

    if (!field.required) {
      validator = validator.optional().nullable();
    }

    shape[field.name] = validator;
  }

  return z.object(shape);
}

/**
 * Helper to validate entry payload against a schema definition.
 */
export function validateEntryData(
  schemaDef: SchemaDefinition,
  data: Record<string, any>,
): { isValid: boolean; errors?: Array<{ field: string; message: string }>; data?: any } {
  const zodSchema = buildZodSchema(schemaDef);
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { isValid: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { isValid: false, errors };
}
