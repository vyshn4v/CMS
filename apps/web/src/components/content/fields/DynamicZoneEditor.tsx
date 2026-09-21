import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { FieldDefinition, ComponentDto } from '@cms/shared-types';
import { safeParseSchema } from '../../../lib/utils';
import { DynamicFormField } from '../DynamicFormField';

interface DynamicZoneEditorProps {
  field: FieldDefinition;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}

export const DynamicZoneEditor: React.FC<DynamicZoneEditorProps> = ({
  field,
  value,
  onChange,
  disabled = false,
}) => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const allowedComponentIds = field.dynamiczone?.allowedComponentIds || [];
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Fetch all organization components
  const { data: allComponents = [], isLoading } = useQuery<ComponentDto[]>({
    queryKey: ['components', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/components`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Filter only allowed components for this dynamic zone
  const allowedComponents = allComponents.filter((c) =>
    allowedComponentIds.length === 0 || allowedComponentIds.includes(c.id),
  );

  const blocks: Record<string, any>[] = Array.isArray(value) ? value : [];

  const handleAddBlock = (component: ComponentDto) => {
    const newBlock: Record<string, any> = {
      __component: component.slug,
    };
    const cFields = safeParseSchema(component.schema).fields || [];
    cFields.forEach((f: any) => {
      if (f.defaultValue !== undefined) {
        newBlock[f.name] = f.defaultValue;
      }
    });
    onChange([...blocks, newBlock]);
    setIsAddMenuOpen(false);
  };

  const handleRemoveBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const updated = [...blocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    onChange(updated);
  };

  const handleFieldChange = (
    blockIndex: number,
    fieldName: string,
    fieldVal: any,
  ) => {
    const updated = [...blocks];
    updated[blockIndex] = {
      ...updated[blockIndex],
      [fieldName]: fieldVal,
    };
    onChange(updated);
  };

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
        Loading dynamic zone components...
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10">
      <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {field.label || 'Dynamic Zone'} ({blocks.length} blocks)
          </span>
        </div>

        {/* Add block dropdown toggle */}
        {!disabled && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Block
            </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Component
                </div>
                {allowedComponents.length === 0 ? (
                  <div className="p-2 text-xs text-slate-400">
                    No components configured for this zone.
                  </div>
                ) : (
                  allowedComponents.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddBlock(c)}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 transition"
                    >
                      <div className="truncate">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.slug}</div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block List */}
      {blocks.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-emerald-200 dark:border-emerald-800 rounded-xl">
          <p className="text-xs text-slate-500 mb-2">This dynamic zone has no blocks yet.</p>
          <span className="text-[11px] text-slate-400">
            Click &quot;Add Block&quot; to choose and compose sections.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, idx) => {
            const blockSlug = block.__component;
            const matchedComponent = allComponents.find((c) => c.slug === blockSlug);
            const compFields: FieldDefinition[] = safeParseSchema(matchedComponent?.schema).fields || [];

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                {/* Block header with controls */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {matchedComponent?.name || blockSlug || 'Custom Block'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({blockSlug})</span>
                  </div>

                  {!disabled && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, 'down')}
                        disabled={idx === blocks.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                        title="Remove Block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Render fields of this block's component */}
                {compFields.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No fields in this component schema.</p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {compFields.map((cField) => (
                      <DynamicFormField
                        key={cField.name}
                        field={cField}
                        value={block[cField.name]}
                        onChange={(val) => handleFieldChange(idx, cField.name, val)}
                        disabled={disabled}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
