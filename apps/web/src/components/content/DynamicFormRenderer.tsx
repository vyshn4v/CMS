import React from 'react';
import { FieldDefinition } from '@cms/shared-types';
import { DynamicFormField } from './DynamicFormField';

interface DynamicFormRendererProps {
  fields: FieldDefinition[];
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/**
 * Dynamic form engine that inspects schema.fields and renders typed inputs.
 */
export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields = [],
  values = {},
  onChange,
  errors = {},
  disabled = false,
}) => {
  if (fields.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        No fields defined for this content type yet. Edit the schema in Schema Builder.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <DynamicFormField
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(val) => onChange(field.name, val)}
          error={errors[field.name]}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
