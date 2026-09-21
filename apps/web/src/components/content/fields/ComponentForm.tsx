import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { FieldDefinition, ComponentDto } from '@cms/shared-types';
import { safeParseSchema } from '../../../lib/utils';
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
  const componentId = componentConfig?.componentId || (field as any).componentId;
  const componentSlug = componentConfig?.componentSlug || (field as any).componentSlug;
  const targetKey = componentId || componentSlug;

  // Track collapsed items for repeatable component
  const [collapsedItems, setCollapsedItems] = useState<Record<number, boolean>>({});

  // Fetch component definition by ID or slug
  const { data: componentById, isLoading: isLoadingSingle } = useQuery<ComponentDto>({
    queryKey: ['component', orgId, targetKey],
    queryFn: async () => {
      if (!orgId || !targetKey) return null as any;
      const res = await api.get(`/orgs/${orgId}/components/${targetKey}`);
      return res.data.data || res.data;
    },
    enabled: !!orgId && !!targetKey,
  });

  // Fallback: Fetch all organization components to guarantee match by slug or id
  const { data: allComponents = [], isLoading: isLoadingAll } = useQuery<ComponentDto[]>({
    queryKey: ['components', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/components`);
      return res.data.data || res.data || [];
    },
    enabled: !!orgId && !componentById,
  });

  const component =
    componentById ||
    allComponents.find(
      (c) =>
        c.id === targetKey ||
        c.slug === targetKey ||
        (componentSlug && c.slug === componentSlug) ||
        (componentId && c.id === componentId),
    );

  const isLoading = (isLoadingSingle && !component) || (isLoadingAll && !component);

  const parsedSchema = safeParseSchema(component?.schema);
  const componentFields: FieldDefinition[] = parsedSchema.fields || [];

  const toggleCollapse = (idx: number) => {
    setCollapsedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse flex items-center gap-2">
        <Boxes className="h-4 w-4 text-slate-400" />
        <span>Loading component schema...</span>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="p-3.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2">
        <Boxes className="h-4 w-4 text-amber-500 shrink-0" />
        <div>
          <span className="font-semibold">Component not linked or not found.</span>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            Component key: <span className="font-mono">{targetKey || field.name}</span>. Please verify your schema builder configuration.
          </p>
        </div>
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
      // Ensure the newly added item starts expanded
      setCollapsedItems((prev) => ({ ...prev, [items.length]: false }));
    };

    const handleRemoveItem = (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    };

    const handleDuplicateItem = (index: number) => {
      const itemToDuplicate = items[index];
      if (!itemToDuplicate) return;
      const clone = { ...itemToDuplicate };
      const updated = [...items.slice(0, index + 1), clone, ...items.slice(index + 1)];
      onChange(updated);
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return;
      const updated = [...items];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIdx, 0, moved);
      onChange(updated);
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
      <div className="space-y-3 p-4 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/20 dark:bg-violet-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {field.label || component.name}
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
              <span className="ml-1 text-[10px] text-slate-400 font-mono">
                (/{component.slug})
              </span>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add an entry
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-violet-200 dark:border-violet-800/80 bg-white/50 dark:bg-slate-900/40 text-xs text-slate-500 space-y-2">
            <p>No {field.label || component.name} entries added yet.</p>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-100/70 dark:bg-violet-900/40 rounded-lg hover:bg-violet-200/70 transition"
              >
                <Plus className="h-3 w-3" />
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const isCollapsed = Boolean(collapsedItems[idx]);
              // Find first descriptive field to show as title
              const firstTextField = componentFields.find((f) => f.type === 'text' || f.type === 'email');
              const displayTitle =
                firstTextField && item[firstTextField.name]
                  ? String(item[firstTextField.name])
                  : item.title || item.name || item.meta_title || `${component.name} #${idx + 1}`;

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition"
                >
                  {/* Item Accordion Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(idx)}
                      className="flex items-center gap-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-violet-600 transition truncate max-w-md"
                    >
                      <span className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{displayTitle}</span>
                      {isCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Item Controls: Move Up, Move Down, Duplicate, Delete */}
                    {!disabled && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, 'up')}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === items.length - 1}
                          onClick={() => handleMoveItem(idx, 'down')}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-violet-600 transition"
                          title="Duplicate Item"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                          title="Remove Item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Item Subfields Body */}
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">
                      {componentFields.length > 0 ? (
                        componentFields.map((cField) => (
                          <DynamicFormField
                            key={cField.name}
                            field={cField}
                            value={item[cField.name]}
                            onChange={(val) => handleItemFieldChange(idx, cField.name, val)}
                            disabled={disabled}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No fields configured inside this component yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!disabled && (
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-dashed border-violet-300 dark:border-violet-700/80 hover:border-violet-500 bg-white/60 dark:bg-slate-900/60 rounded-xl text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another entry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- SINGLE COMPONENT VARIANT ---
  const singleItem: Record<string, any> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};

  const handleSingleFieldChange = (fieldName: string, fieldVal: any) => {
    onChange({
      ...singleItem,
      __component: component.slug,
      [fieldName]: fieldVal,
    });
  };

  return (
    <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/20 dark:bg-violet-950/10 space-y-4">
      <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {field.label || component.name}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
            Single Component
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            (/{component.slug})
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {componentFields.length} {componentFields.length === 1 ? 'field' : 'fields'}
        </span>
      </div>

      <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {componentFields.length > 0 ? (
          componentFields.map((cField) => (
            <DynamicFormField
              key={cField.name}
              field={cField}
              value={singleItem[cField.name]}
              onChange={(val) => handleSingleFieldChange(cField.name, val)}
              disabled={disabled}
            />
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">
            No fields configured inside this component yet.
          </p>
        )}
      </div>
    </div>
  );
};
