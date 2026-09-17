import React, { useState } from 'react';
import { Boxes, Plus, Trash2, RotateCcw } from 'lucide-react';
import { ComponentDto, ContentTypeDto, FieldDefinition } from '@cms/shared-types';
import { safeParseSchema } from '../../lib/utils';
import { DualModeEditor } from '../editors/DualModeEditor';
import { Button, Badge } from '../ui';

export interface ComponentFieldCardProps {
  field: FieldDefinition;
  compDef: ComponentDto | null;
  fieldsDraft: Record<string, any>;
  onFieldChange: (fieldName: string, subfieldName: string, value: string) => void;
  onAddCustomKey: (fieldName: string, keyName?: string) => void;
  onRemoveCustomKey: (fieldName: string, keyName: string) => void;
  onResetDefaults: (fieldName: string, defaults: Record<string, string>) => void;
  selectedSchema: ContentTypeDto | null;
  components: ComponentDto[];
}

export const ComponentFieldCard: React.FC<ComponentFieldCardProps> = ({
  field,
  compDef,
  fieldsDraft,
  onFieldChange,
  onAddCustomKey,
  onRemoveCustomKey,
  onResetDefaults,
  selectedSchema,
  components,
}) => {
  const [customKeyInput, setCustomKeyInput] = useState('');
  const isRepeatable = Boolean(field.component?.repeatable);

  const parsedCompSchema = safeParseSchema(compDef?.schema);
  const compFields: FieldDefinition[] = parsedCompSchema.fields || [];

  const compDraftObj =
    typeof fieldsDraft[field.name] === 'object' &&
    fieldsDraft[field.name] !== null &&
    !Array.isArray(fieldsDraft[field.name])
      ? fieldsDraft[field.name]
      : {};

  const compFieldNames = new Set(compFields.map((cf) => cf.name));
  const extraCustomKeys = Object.keys(compDraftObj).filter((k) => !compFieldNames.has(k));
  const allCompSubNames = Array.from(
    new Set([...compFields.map((cf) => cf.name), ...extraCustomKeys]),
  );

  const getSubfieldValue = (subfieldName: string): string => {
    const val = compDraftObj[subfieldName];
    return typeof val === 'string' ? val : val !== undefined ? String(val) : '';
  };

  const handleAddKey = () => {
    if (!customKeyInput.trim()) return;
    onAddCustomKey(field.name, customKeyInput.trim());
    setCustomKeyInput('');
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-sm">
      {/* Field Label Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {field.label || field.name}
          </span>
          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            key: "{field.name}" • component
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Supports &#123;&#123;this.property&#125;&#125; syntax
        </span>
      </div>

      {/* Component Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/70 dark:border-violet-900/40 text-xs">
        <div className="flex items-center gap-2.5">
          <Boxes className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-violet-950 dark:text-violet-200">
              Component: {compDef ? compDef.name : field.label || field.name}
            </span>
            {compDef?.slug && (
              <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded">
                {compDef.slug}
              </span>
            )}
            <Badge variant="purple" size="sm">
              {isRepeatable ? 'Repeatable Array' : 'Single Object'}
            </Badge>
          </div>
        </div>

        <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
          {isRepeatable
            ? 'JSON array input maps to rendered array'
            : 'JSON object input maps to rendered object'}
        </span>
      </div>

      {/* Subfields List */}
      <div className="space-y-3">
        {compFields.length === 0 && extraCustomKeys.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">
              No subfields defined for component <strong>{compDef?.name || field.name}</strong>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {['title', 'name', 'url', 'value'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => onAddCustomKey(field.name, sug)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-800 text-[11px] font-mono text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>+ {sug}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Standard Schema Subfields */}
            {compFields.map((cField) => {
              const isRich = cField.type === 'richtext';
              const isJsonField = cField.type === 'json';

              return (
                <div
                  key={cField.name}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 space-y-2 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {cField.label || cField.name}
                      </span>
                      <span className="text-[10px] font-mono bg-violet-100/70 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">
                        {cField.name} • {cField.type}
                      </span>
                    </div>

                    {allCompSubNames.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-0.5">Insert:</span>
                        {allCompSubNames.map((sName) => (
                          <button
                            key={sName}
                            type="button"
                            onClick={() => {
                              const cur = getSubfieldValue(cField.name);
                              const tag = `{{this.${sName}}}`;
                              const updated = cur ? `${cur} ${tag}` : tag;
                              onFieldChange(field.name, cField.name, updated);
                            }}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 transition"
                          >
                            <Plus className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400" />
                            <span>{sName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isRich ? (
                    <DualModeEditor
                      content={getSubfieldValue(cField.name)}
                      onChange={(val) => onFieldChange(field.name, cField.name, val)}
                      templateType="CUSTOM"
                      selectedSchema={selectedSchema}
                      components={components}
                      className="min-h-[160px]"
                    />
                  ) : isJsonField ? (
                    <textarea
                      rows={3}
                      value={getSubfieldValue(cField.name)}
                      onChange={(e) => onFieldChange(field.name, cField.name, e.target.value)}
                      placeholder={`e.g. {{{json this.${cField.name}}}}`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={getSubfieldValue(cField.name)}
                      onChange={(e) => onFieldChange(field.name, cField.name, e.target.value)}
                      placeholder={`e.g. {{this.${cField.name}}}`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  )}
                </div>
              );
            })}

            {/* Custom / Computed Keys */}
            {extraCustomKeys.map((customKey) => (
              <div
                key={customKey}
                className="rounded-xl border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/30 dark:bg-violet-950/20 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {customKey}
                    </span>
                    <Badge variant="purple" size="sm">
                      custom key
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onRemoveCustomKey(field.name, customKey)}
                    className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    leftIcon={<Trash2 className="w-3 h-3" />}
                  >
                    Remove
                  </Button>
                </div>
                <input
                  type="text"
                  value={getSubfieldValue(customKey)}
                  onChange={(e) => onFieldChange(field.name, customKey, e.target.value)}
                  placeholder={`e.g. {{this.first}} {{this.last}}`}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer Controls: Add Custom Key & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add custom key (e.g. fullName)"
            value={customKeyInput}
            onChange={(e) => setCustomKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKey();
              }
            }}
            className="w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
          <Button
            variant="secondary"
            size="xs"
            onClick={handleAddKey}
            leftIcon={<Plus className="w-3 h-3 text-violet-500 dark:text-violet-400" />}
          >
            Add Key
          </Button>
        </div>

        {compFields.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              const resetObj: Record<string, string> = {};
              compFields.forEach((cf) => {
                resetObj[cf.name] = `{{this.${cf.name}}}`;
              });
              onResetDefaults(field.name, resetObj);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Defaults
          </Button>
        )}
      </div>
    </div>
  );
};
