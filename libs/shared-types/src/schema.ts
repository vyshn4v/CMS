/**
 * Content Type & Component Schema definitions.
 */

export type ContentTypeKind = 'COLLECTION' | 'SINGLE';

export type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'email'
  | 'enum'
  | 'media'
  | 'relation'
  | 'component'
  | 'dynamiczone';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  regexErrorMessage?: string;
}

export interface RelationConfig {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  targetContentTypeId: string;
  targetContentTypeSlug: string;
  displayField: string;
}

export interface ComponentConfig {
  componentId: string;
  componentSlug: string;
  repeatable?: boolean;
}

export interface DynamicZoneConfig {
  allowedComponentIds: string[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[]; // For 'enum'
  validations?: FieldValidation;
  relation?: RelationConfig;
  component?: ComponentConfig;
  dynamiczone?: DynamicZoneConfig;
}

export interface SchemaDefinition {
  fields: FieldDefinition[];
}

export interface ContentTypeDto {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string | null;
  kind: ContentTypeKind;
  schema: SchemaDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentDto {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  category: string;
  schema: SchemaDefinition;
  createdAt: string;
}
