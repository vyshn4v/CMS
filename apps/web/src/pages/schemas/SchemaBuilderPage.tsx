import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Save,
  ArrowLeft,
  Edit2,
  Trash2,
  AlertCircle,
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
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { AddFieldModal } from '../../components/schema-builder/AddFieldModal';
import { FieldDefinition, ContentTypeKind } from '@cms/shared-types';

const FIELD_ICONS: Record<string, any> = {
  text: Type,
  richtext: AlignLeft,
  number: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  datetime: Clock,
  email: Mail,
  enum: List,
  media: Image,
  json: Code,
};

export const SchemaBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const isEditing = Boolean(id && id !== 'new');
  const defaultKind = (searchParams.get('kind') as ContentTypeKind) || 'COLLECTION';

  // Schema state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<ContentTypeKind>(defaultKind);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Field modal state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Query existing schema if editing
  const { data: existingSchema, isLoading } = useQuery({
    queryKey: ['schema', orgId, id],
    queryFn: async () => {
      if (!isEditing || !orgId) return null;
      const res = await api.get(`/orgs/${orgId}/schemas/${id}`);
      return res.data.data;
    },
    enabled: isEditing && !!orgId,
  });

  useEffect(() => {
    if (existingSchema) {
      setName(existingSchema.name || '');
      setSlug(existingSchema.slug || '');
      setDescription(existingSchema.description || '');
      setKind(existingSchema.kind || 'COLLECTION');
      const rawSchema =
        typeof existingSchema.schema === 'string'
          ? (() => {
              try {
                return JSON.parse(existingSchema.schema);
              } catch {
                return {};
              }
            })()
          : existingSchema.schema || {};

      setFields(rawSchema.fields || []);
    }
  }, [existingSchema]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !name.trim()) return;

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        kind,
        schema: { fields },
      };

      if (isEditing) {
        await api.patch(`/orgs/${orgId}/schemas/${id}`, payload);
      } else {
        await api.post(`/orgs/${orgId}/schemas`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', orgId] });
      navigate('/schemas');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save schema');
    },
  });

  const handleAddField = (field: FieldDefinition) => {
    if (editingFieldIndex !== null) {
      const updated = [...fields];
      updated[editingFieldIndex] = field;
      setFields(updated);
      setEditingFieldIndex(null);
    } else {
      setFields([...fields, field]);
    }
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const openEditField = (index: number) => {
    setEditingFieldIndex(index);
    setIsFieldModalOpen(true);
  };

  if (isEditing && isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading schema details...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/schemas')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? `Edit ${name || 'Content Type'}` : 'Create New Content Type'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Build the structure and validation rules for this content model.
            </p>
            {isEditing && id && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  schemaId: {id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  title="Copy schemaId for Generation & Render APIs"
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-0.5"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/schemas')}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending || !name.trim()}
            onClick={() => saveMutation.mutate()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Schema'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* General Settings Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          General Configurations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEditing && !slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }
              }}
              placeholder="e.g. Article"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                URL Slug
              </label>
              <span className="text-[10px] text-slate-400">
                (API uses <code className="font-mono text-indigo-500">schemaId</code>)
              </span>
            </div>
            <input
              type="text"
              required
              disabled={isEditing}
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              placeholder="e.g. articles"
              className="mt-1 w-full font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used for dashboard routes. Generation/Render APIs consume <span className="font-mono font-medium text-slate-600 dark:text-slate-300">schemaId</span> to avoid conflicts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type Kind
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ContentTypeKind)}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="COLLECTION">Collection Type (Multiple Entries)</option>
              <option value="SINGLE">Single Type (One Static Entry)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of what this model holds..."
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Fields Definition Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Fields Structure ({fields.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define the attributes for this model.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingFieldIndex(null);
              setIsFieldModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add another field</span>
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <Layers className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No fields added yet
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click below to choose a field type like Text, Rich Text, Number, or Date.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingFieldIndex(null);
                setIsFieldModalOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {fields.map((field, idx) => {
              const Icon = FIELD_ICONS[field.type] || Type;
              return (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {field.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          ({field.name})
                        </span>
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">
                          {field.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {field.required && (
                          <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded">
                            Required
                          </span>
                        )}
                        {field.unique && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 rounded">
                            Unique
                          </span>
                        )}
                        {field.defaultValue !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            Default: {String(field.defaultValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditField(idx)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isFieldModalOpen && (
        <AddFieldModal
          key={editingFieldIndex !== null ? `edit-${editingFieldIndex}-${fields[editingFieldIndex]?.name}` : 'new-field'}
          isOpen={isFieldModalOpen}
          onClose={() => {
            setIsFieldModalOpen(false);
            setEditingFieldIndex(null);
          }}
          onSave={handleAddField}
          initialField={editingFieldIndex !== null ? fields[editingFieldIndex] : null}
        />
      )}
    </div>
  );
};
