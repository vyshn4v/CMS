import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { FieldDefinition, ComponentDto } from '@cms/shared-types';
import { DynamicFormField } from '../DynamicFormField';

interface ComponentFormProps {
  field: FieldDefinition;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}

export const ComponentForm: React.FC<ComponentFormProps> = ({
  field,
  value,
  onChange,
  disabled = false,
}) => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const componentConfig = field.component;
  const isRepeatable = Boolean(componentConfig?.repeatable);
  const componentId = componentConfig?.componentId;

  // Fetch component definition
  const { data: component, isLoading } = useQuery<ComponentDto>({
    queryKey: ['component', orgId, componentId],
    queryFn: async () => {
      if (!orgId || !componentId) return null;
      const res = await api.get(`/orgs/${orgId}/components/${componentId}`);
      return res.data.data;
    },
    enabled: !!orgId && !!componentId,
  });

  const componentFields = component?.schema?.fields || [];

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
        Loading component schema...
      </div>
    );
  }

  if (!component) {
    return (
      <div className="p-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        Component not found. Please verify component configuration.
      </div>
    );
  }

  // --- REPEATABLE COMPONENT VARIANT ---
  if (isRepeatable) {
    const items: Record<string, any>[] = Array.isArray(value) ? value : [];

    const handleAddItem = () => {
      const defaultItem: Record<string, any> = { __component: component.slug };
      componentFields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          defaultItem[f.name] = f.defaultValue;
        }
      });
      onChange([...items, defaultItem]);
    };

    const handleRemoveItem = (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    };

    const handleItemFieldChange = (index: number, fieldName: string, fieldVal: any) => {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        __component: component.slug,
        [fieldName]: fieldVal,
      };
      onChange(updated);
    };

    return (
      <div className="space-y-3 p-3.5 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/20 dark:bg-violet-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {field.label || component.name} ({items.length} items)
            </span>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-[11px] font-semibold transition"
            >
              <Plus className="h-3 w-3" />
              Add Item
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-4 text-center rounded-lg border border-dashed border-violet-200 dark:border-violet-800 text-xs text-slate-400">
            No items added yet. Click &quot;Add Item&quot; to insert an entry.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
                    #{idx + 1} {component.name}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {componentFields.map((cField) => (
                    <DynamicFormField
                      key={cField.name}
                      field={cField}
                      value={item[cField.name]}
                      onChange={(val) => handleItemFieldChange(idx, cField.name, val)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- SINGLE COMPONENT VARIANT ---
  const singleItem: Record<string, any> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : { __component: component.slug };

  const handleSingleFieldChange = (fieldName: string, fieldVal: any) => {
    onChange({
      ...singleItem,
      __component: component.slug,
      [fieldName]: fieldVal,
    });
  };

  return (
    <div className="p-3.5 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/20 dark:bg-violet-950/10 space-y-3">
      <div className="flex items-center gap-2 border-b border-violet-100 dark:border-violet-900/40 pb-2">
        <Boxes className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {component.name}
        </span>
      </div>

      <div className="space-y-3">
        {componentFields.map((cField) => (
          <DynamicFormField
            key={cField.name}
            field={cField}
            value={singleItem[cField.name]}
            onChange={(val) => handleSingleFieldChange(cField.name, val)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
