import React, { useState, useEffect } from 'react';
import {
  Type,
  AlignLeft,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  Mail,
  List,
  Image,
  Code,
  Link2,
  Boxes,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  FieldDefinition,
  FieldType,
  ContentTypeDto,
  ComponentDto,
  RelationConfig,
} from '@cms/shared-types';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FieldDefinition, index?: number | null) => void;
  initialField?: FieldDefinition | null;
  editingIndex?: number | null;
  readOnly?: boolean;
}

const FIELD_TYPES: Array<{
  type: FieldType;
  label: string;
  description: string;
  icon: any;
  color: string;
}> = [
  {
    type: 'text',
    label: 'Text',
    description: 'Small or long text like title, subtitle, or slug',
    icon: Type,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  {
    type: 'richtext',
    label: 'Rich Text',
    description: 'WYSIWYG formatted content, HTML articles, and copy',
    icon: AlignLeft,
    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Integers, decimals, counters, and prices',
    icon: Hash,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  {
    type: 'boolean',
    label: 'Boolean',
    description: 'Yes or no, true or false toggle switch',
    icon: ToggleLeft,
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email address with built-in format validation',
    icon: Mail,
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Calendar date picker (YYYY-MM-DD)',
    icon: Calendar,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    description: 'Full timestamp with hour, minute, and second',
    icon: Clock,
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  },
  {
    type: 'enum',
    label: 'Enumeration',
    description: 'Select dropdown from a predefined list of values',
    icon: List,
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  },
  {
    type: 'media',
    label: 'Media / URL',
    description: 'Link or media URL for images, files, or avatars',
    icon: Image,
    color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  },
  {
    type: 'json',
    label: 'JSON Object',
    description: 'Raw structured JSON data snippet',
    icon: Code,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    type: 'relation',
    label: 'Relation',
    description: 'Reference entries from another collection type (1:1, 1:N, N:N)',
    icon: Link2,
    color: 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  },
  {
    type: 'component',
    label: 'Component',
    description: 'Embed a reusable group of fields (single or repeatable)',
    icon: Boxes,
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  },
  {
    type: 'dynamiczone',
    label: 'Dynamic Zone',
    description: 'Composable region allowing multiple component blocks',
    icon: Layers,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
];

export const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialField,
  editingIndex,
  readOnly = false,
}) => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const [selectedType, setSelectedType] = useState<FieldType | null>(
    initialField?.type || null,
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'validations'>('basic');

  // Query schemas for relations
  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Query components for component & dynamiczone fields
  const { data: components = [] } = useQuery<ComponentDto[]>({
    queryKey: ['components', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/components`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Form states
  const [name, setName] = useState(initialField?.name || '');
  const [label, setLabel] = useState(initialField?.label || '');
  const [required, setRequired] = useState(initialField?.required || false);
  const [unique, setUnique] = useState(initialField?.unique || false);
  const [defaultValue, setDefaultValue] = useState(initialField?.defaultValue || '');
  const [enumOptions, setEnumOptions] = useState(
    initialField?.options ? initialField.options.join(', ') : '',
  );

  // Advanced Field States: Relation
  const [relationType, setRelationType] = useState<RelationConfig['type']>(
    initialField?.relation?.type || 'many-to-one',
  );
  const [targetContentTypeId, setTargetContentTypeId] = useState<string>(
    initialField?.relation?.targetContentTypeId || '',
  );
  const [displayField, setDisplayField] = useState<string>(
    initialField?.relation?.displayField || 'title',
  );

  // Advanced Field States: Component
  const [componentId, setComponentId] = useState<string>(
    initialField?.component?.componentId || '',
  );
  const [componentRepeatable, setComponentRepeatable] = useState<boolean>(
    initialField?.component?.repeatable || false,
  );

  // Advanced Field States: Dynamic Zone
  const [allowedComponentIds, setAllowedComponentIds] = useState<string[]>(
    initialField?.dynamiczone?.allowedComponentIds || [],
  );

  // Validation states
  const [minLength, setMinLength] = useState<number | ''>(
    initialField?.validations?.minLength ?? '',
  );
  const [maxLength, setMaxLength] = useState<number | ''>(
    initialField?.validations?.maxLength ?? '',
  );
  const [minVal, setMinVal] = useState<number | ''>(
    initialField?.validations?.min ?? '',
  );
  const [maxVal, setMaxVal] = useState<number | ''>(
    initialField?.validations?.max ?? '',
  );
  const [pattern, setPattern] = useState(initialField?.validations?.pattern || '');

  // Synchronize internal state whenever modal opens or initialField changes
  useEffect(() => {
    if (isOpen) {
      if (initialField) {
        setSelectedType(initialField.type || null);
        setName(initialField.name || '');
        setLabel(initialField.label || '');
        setRequired(initialField.required || false);
        setUnique(initialField.unique || false);
        setDefaultValue(
          initialField.defaultValue !== undefined && initialField.defaultValue !== null
            ? String(initialField.defaultValue)
            : '',
        );
        setEnumOptions(initialField.options ? initialField.options.join(', ') : '');
        setRelationType(initialField.relation?.type || 'many-to-one');
        setTargetContentTypeId(initialField.relation?.targetContentTypeId || '');
        setDisplayField(initialField.relation?.displayField || 'title');
        setComponentId(initialField.component?.componentId || '');
        setComponentRepeatable(initialField.component?.repeatable || false);
        setAllowedComponentIds(initialField.dynamiczone?.allowedComponentIds || []);
        setMinLength(
          initialField.validations?.minLength !== undefined ? initialField.validations.minLength : '',
        );
        setMaxLength(
          initialField.validations?.maxLength !== undefined ? initialField.validations.maxLength : '',
        );
        setMinVal(
          initialField.validations?.min !== undefined ? initialField.validations.min : '',
        );
        setMaxVal(
          initialField.validations?.max !== undefined ? initialField.validations.max : '',
        );
        setPattern(initialField.validations?.pattern || '');
      } else {
        setSelectedType(null);
        setName('');
        setLabel('');
        setRequired(false);
        setUnique(false);
        setDefaultValue('');
        setEnumOptions('');
        setRelationType('many-to-one');
        setTargetContentTypeId('');
        setDisplayField('title');
        setComponentId('');
        setComponentRepeatable(false);
        setAllowedComponentIds([]);
        setMinLength('');
        setMaxLength('');
        setMinVal('');
        setMaxVal('');
        setPattern('');
      }
      setActiveTab('basic');
    }
  }, [isOpen, initialField]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !name.trim()) return;

    const formattedName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const targetSchema = schemas.find((s) => s.id === targetContentTypeId);
    const targetComp = components.find((c) => c.id === componentId);

    const field: FieldDefinition = {
      name: formattedName,
      label: label.trim() || name.trim(),
      type: selectedType,
      required,
      unique,
      defaultValue: defaultValue || undefined,
      options:
        selectedType === 'enum'
          ? enumOptions
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      relation:
        selectedType === 'relation' && targetContentTypeId
          ? {
              type: relationType,
              targetContentTypeId,
              targetContentTypeSlug: targetSchema?.slug || '',
              displayField: displayField.trim() || 'title',
            }
          : undefined,
      component:
        selectedType === 'component' && componentId
          ? {
              componentId,
              componentSlug: targetComp?.slug || '',
              repeatable: componentRepeatable,
            }
          : undefined,
      dynamiczone:
        selectedType === 'dynamiczone'
          ? {
              allowedComponentIds,
            }
          : undefined,
      validations: {
        minLength: minLength !== '' ? Number(minLength) : undefined,
        maxLength: maxLength !== '' ? Number(maxLength) : undefined,
        min: minVal !== '' ? Number(minVal) : undefined,
        max: maxVal !== '' ? Number(maxVal) : undefined,
        pattern: pattern.trim() || undefined,
      },
    };

    onSave(field, editingIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{readOnly ? 'View Field Details' : initialField ? 'Edit Field' : 'Add New Field'}</span>
              {readOnly && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                  Read-Only
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {readOnly
                ? 'Field configuration and validation rules.'
                : 'Choose a data type and configure properties and validation rules.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Select Type if not chosen */}
        {!selectedType ? (
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELD_TYPES.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(f.type);
                      if (!label) setLabel(f.label);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-500 hover:shadow-sm transition group bg-white dark:bg-slate-900"
                  >
                    <div className={`p-2.5 rounded-lg ${f.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {f.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {f.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Step 2: Configure Field Settings */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {/* Type badge with change option */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Selected Type:</span>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md uppercase">
                  {selectedType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Change Type
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`pb-2 text-xs font-bold transition border-b-2 ${
                  activeTab === 'basic'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Basic Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('validations')}
                className={`pb-2 text-xs font-bold transition border-b-2 ${
                  activeTab === 'validations'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Validations & Rules
              </button>
            </div>

            {activeTab === 'basic' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Display Label
                    </label>
                    <input
                      type="text"
                      required
                      value={label}
                      onChange={(e) => {
                        setLabel(e.target.value);
                        if (!name) {
                          setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                        }
                      }}
                      placeholder="e.g. Post Title"
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      API Field Name (Key)
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                      }
                      placeholder="e.g. post_title"
                      className="mt-1 w-full font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {selectedType === 'enum' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Options (Comma-separated)
                    </label>
                    <input
                      type="text"
                      required
                      value={enumOptions}
                      onChange={(e) => setEnumOptions(e.target.value)}
                      placeholder="draft, published, archived"
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Separate allowed values by commas.
                    </p>
                  </div>
                )}

                {/* RELATION CONFIG */}
                {selectedType === 'relation' && (
                  <div className="p-4 rounded-xl border border-pink-200 dark:border-pink-900/40 bg-pink-50/30 dark:bg-pink-950/10 space-y-3">
                    <h4 className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Relation Settings
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Target Content Type
                        </label>
                        <select
                          value={targetContentTypeId}
                          onChange={(e) => setTargetContentTypeId(e.target.value)}
                          required
                          className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select target model...</option>
                          {schemas.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.slug})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Relation Cardinality
                        </label>
                        <select
                          value={relationType}
                          onChange={(e) => setRelationType(e.target.value as any)}
                          className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="many-to-one">Many-to-One (Has one target entry)</option>
                          <option value="one-to-one">One-to-One (Unique target entry)</option>
                          <option value="one-to-many">One-to-Many (Multiple target entries)</option>
                          <option value="many-to-many">Many-to-Many (Multiple shared entries)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Display Field
                      </label>
                      <input
                        type="text"
                        value={displayField}
                        onChange={(e) => setDisplayField(e.target.value)}
                        placeholder="title, name, slug (field shown in picker dropdowns)"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* COMPONENT CONFIG */}
                {selectedType === 'component' && (
                  <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/30 dark:bg-violet-950/10 space-y-3">
                    <h4 className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5" />
                      Component Settings
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Select Component
                      </label>
                      <select
                        value={componentId}
                        onChange={(e) => setComponentId(e.target.value)}
                        required
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Choose a component...</option>
                        {components.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={componentRepeatable}
                        onChange={(e) => setComponentRepeatable(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Repeatable Component
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Allows editors to add multiple items as an array
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* DYNAMIC ZONE CONFIG */}
                {selectedType === 'dynamiczone' && (
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Dynamic Zone Allowed Components
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select which components can be added as modular blocks within this dynamic zone:
                    </p>

                    {components.length === 0 ? (
                      <p className="text-xs text-amber-600">
                        No components defined yet. Please create components in the Component Library first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {components.map((c) => {
                          const isChecked = allowedComponentIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                                isChecked
                                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAllowedComponentIds([...allowedComponentIds, c.id]);
                                  } else {
                                    setAllowedComponentIds(
                                      allowedComponentIds.filter((id) => id !== c.id),
                                    );
                                  }
                                }}
                                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="truncate">
                                <div className="text-xs font-semibold">{c.name}</div>
                                <div className="text-[10px] text-slate-400">{c.category}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Default Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder="Initial default value"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Toggles */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Required field
                      </span>
                      <p className="text-[10px] text-slate-400">Cannot be saved empty</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={unique}
                      onChange={(e) => setUnique(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Unique field
                      </span>
                      <p className="text-[10px] text-slate-400">Must be unique across entries</p>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              /* Validations Tab */
              <div className="space-y-4">
                {(selectedType === 'text' || selectedType === 'richtext' || selectedType === 'email') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Minimum Length
                      </label>
                      <input
                        type="number"
                        value={minLength}
                        onChange={(e) =>
                          setMinLength(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 3"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Maximum Length
                      </label>
                      <input
                        type="number"
                        value={maxLength}
                        onChange={(e) =>
                          setMaxLength(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 200"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'number' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Minimum Value
                      </label>
                      <input
                        type="number"
                        value={minVal}
                        onChange={(e) =>
                          setMinVal(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 0"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Maximum Value
                      </label>
                      <input
                        type="number"
                        value={maxVal}
                        onChange={(e) =>
                          setMaxVal(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 99999"
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {(selectedType === 'text' || selectedType === 'email') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      RegEx Pattern
                    </label>
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      placeholder="^[a-z0-9-]+$"
                      className="mt-1 w-full font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enforce strict regular expression matching.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Field</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
