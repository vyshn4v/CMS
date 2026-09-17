import React, { useState } from 'react';
import { Layers, Boxes, Plus, Trash2, RotateCcw } from 'lucide-react';
import { ComponentDto, ContentTypeDto, FieldDefinition } from '@cms/shared-types';
import { safeParseSchema } from '../../lib/utils';
import { DualModeEditor } from '../editors/DualModeEditor';
import { Button, Badge } from '../ui';

export interface DynamicZoneFieldCardProps {
  field: FieldDefinition;
  fieldsDraft: Record<string, any>;
  onFieldChange: (
    fieldName: string,
    blockSlug: string,
    subfieldName: string,
    value: string,
  ) => void;
  onAddCustomKey: (fieldName: string, blockSlug: string, keyName?: string) => void;
  onRemoveCustomKey: (fieldName: string, blockSlug: string, keyName: string) => void;
  onResetDefaults: (
    fieldName: string,
    blockSlug: string,
    defaults: Record<string, string>,
  ) => void;
  selectedSchema: ContentTypeDto | null;
  components: ComponentDto[];
}

export const DynamicZoneFieldCard: React.FC<DynamicZoneFieldCardProps> = ({
  field,
  fieldsDraft,
  onFieldChange,
  onAddCustomKey,
  onRemoveCustomKey,
  onResetDefaults,
  selectedSchema,
  components,
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [customKeyInputs, setCustomKeyInputs] = useState<Record<string, string>>({});

  const allowedDzIds: string[] =
    field.dynamiczone?.allowedComponentIds || (field as any).allowedComponentIds || [];
  const allowedComps = components.filter(
    (c) => allowedDzIds.includes(c.id) || allowedDzIds.includes(c.slug),
  );

  const getDzBlockSubfieldValue = (blockSlug: string, subfieldName: string): string => {
    const dz = fieldsDraft[field.name];
    if (typeof dz === 'object' && dz !== null && !Array.isArray(dz)) {
      const block = dz[blockSlug];
      if (typeof block === 'object' && block !== null && !Array.isArray(block)) {
        return typeof block[subfieldName] === 'string'
          ? block[subfieldName]
          : block[subfieldName] !== undefined
          ? String(block[subfieldName])
          : '';
      }
    }
    return '';
  };

  const handleAddKey = (blockSlug: string) => {
    const key = customKeyInputs[blockSlug]?.trim();
    if (!key) return;
    onAddCustomKey(field.name, blockSlug, key);
    setCustomKeyInputs((prev) => ({ ...prev, [blockSlug]: '' }));
  };

  const blocksToRender =
    activeTab === 'all' ? allowedComps : allowedComps.filter((c) => c.slug === activeTab);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">
            {field.label || field.name}
          </span>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60">
            key: "{field.name}" • dynamiczone
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Polymorphic __component discriminator mapping
        </span>
      </div>

      {/* Dynamic Zone Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-emerald-200">
              Dynamic Zone: {field.label || field.name}
            </span>
            <Badge variant="success" size="sm">
              {allowedComps.length > 0
                ? `${allowedComps.length} allowed ${allowedComps.length === 1 ? 'block' : 'blocks'}`
                : 'All blocks allowed'}
            </Badge>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-medium">
          Polymorphic blocks array outputs rendered items
        </span>
      </div>

      {/* Tabs */}
      {allowedComps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Blocks ({allowedComps.length})
          </button>
          {allowedComps.map((ac) => {
            const acSchema = safeParseSchema(ac.schema);
            const count = (acSchema.fields || []).length;
            const isSel = activeTab === ac.slug;
            return (
              <button
                key={ac.id || ac.slug}
                type="button"
                onClick={() => setActiveTab(ac.slug)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  isSel
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{ac.name}</span>
                <span className={`text-[10px] ${isSel ? 'text-emerald-100' : 'text-slate-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {allowedComps.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/40 text-center text-xs text-slate-400 border border-dashed border-slate-800">
            No components currently allowed in this Dynamic Zone. Configure allowed components in Schema Builder.
          </div>
        ) : (
          blocksToRender.map((ac) => {
            const acSchema = safeParseSchema(ac.schema);
            const acFields: FieldDefinition[] = acSchema.fields || [];

            const dzBlockObj =
              typeof fieldsDraft[field.name] === 'object' &&
              fieldsDraft[field.name] !== null &&
              !Array.isArray(fieldsDraft[field.name])
                ? typeof fieldsDraft[field.name][ac.slug] === 'object' &&
                  fieldsDraft[field.name][ac.slug] !== null
                  ? fieldsDraft[field.name][ac.slug]
                  : {}
                : {};

            const acFieldNames = new Set(acFields.map((f) => f.name));
            const extraBlockKeys = Object.keys(dzBlockObj).filter(
              (k) => !acFieldNames.has(k) && k !== '__dynamicZone',
            );
            const allBlockSubNames = Array.from(
              new Set([...acFields.map((f) => f.name), ...extraBlockKeys]),
            );

            return (
              <div
                key={ac.id || ac.slug}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3"
              >
                {/* Block Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">
                      Block: {ac.name}
                    </span>
                    <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      __component: "{ac.slug}"
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({acFields.length} {acFields.length === 1 ? 'field' : 'fields'})
                    </span>
                  </div>

                  {acFields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        const resetObj: Record<string, string> = {};
                        acFields.forEach((acf) => {
                          resetObj[acf.name] = `{{this.${acf.name}}}`;
                        });
                        onResetDefaults(field.name, ac.slug, resetObj);
                      }}
                      className="text-slate-400 hover:text-slate-200"
                      leftIcon={<RotateCcw className="w-3 h-3" />}
                    >
                      Reset Block
                    </Button>
                  )}
                </div>

                {/* Subfields list */}
                <div className="space-y-2.5">
                  {acFields.map((cField) => {
                    const isRich = cField.type === 'richtext';
                    const isJsonField = cField.type === 'json';

                    return (
                      <div
                        key={cField.name}
                        className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-200">
                              {cField.label || cField.name}
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              {cField.name} • {cField.type}
                            </span>
                          </div>

                          {allBlockSubNames.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-slate-400 mr-0.5">Insert:</span>
                              {allBlockSubNames.map((sName) => (
                                <button
                                  key={sName}
                                  type="button"
                                  onClick={() => {
                                    const cur = getDzBlockSubfieldValue(ac.slug, cField.name);
                                    const tag = `{{this.${sName}}}`;
                                    const updated = cur ? `${cur} ${tag}` : tag;
                                    onFieldChange(field.name, ac.slug, cField.name, updated);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition"
                                >
                                  <Plus className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{sName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {isRich ? (
                          <DualModeEditor
                            content={getDzBlockSubfieldValue(ac.slug, cField.name)}
                            onChange={(val) =>
                              onFieldChange(field.name, ac.slug, cField.name, val)
                            }
                            templateType="CUSTOM"
                            selectedSchema={selectedSchema}
                            components={components}
                            className="min-h-[160px]"
                          />
                        ) : isJsonField ? (
                          <textarea
                            rows={3}
                            value={getDzBlockSubfieldValue(ac.slug, cField.name)}
                            onChange={(e) =>
                              onFieldChange(field.name, ac.slug, cField.name, e.target.value)
                            }
                            placeholder={`e.g. {{{json this.${cField.name}}}}`}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={getDzBlockSubfieldValue(ac.slug, cField.name)}
                            onChange={(e) =>
                              onFieldChange(field.name, ac.slug, cField.name, e.target.value)
                            }
                            placeholder={`e.g. {{this.${cField.name}}}`}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Extra Custom Keys for Block */}
                  {extraBlockKeys.map((customKey) => (
                    <div
                      key={customKey}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200 font-mono">
                          {customKey}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onRemoveCustomKey(field.name, ac.slug, customKey)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          leftIcon={<Trash2 className="w-3 h-3" />}
                        >
                          Remove
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={getDzBlockSubfieldValue(ac.slug, customKey)}
                        onChange={(e) =>
                          onFieldChange(field.name, ac.slug, customKey, e.target.value)
                        }
                        placeholder={`e.g. {{this.first}} {{this.last}}`}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Footer: Add custom key */}
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                  <input
                    type="text"
                    placeholder={`Add custom key to ${ac.name}`}
                    value={customKeyInputs[ac.slug] || ''}
                    onChange={(e) =>
                      setCustomKeyInputs((prev) => ({ ...prev, [ac.slug]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKey(ac.slug);
                      }
                    }}
                    className="w-52 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleAddKey(ac.slug)}
                    leftIcon={<Plus className="w-3 h-3 text-emerald-400" />}
                  >
                    Add Key
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
