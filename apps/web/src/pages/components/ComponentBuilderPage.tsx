import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
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
  Link2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { AddFieldModal } from '../../components/schema-builder/AddFieldModal';
import { FieldDefinition } from '@cms/shared-types';

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
  relation: Link2,
};

export const ComponentBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  const isEditing = Boolean(id && id !== 'new');

  // Component state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('default');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field modal state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Fetch component if editing
  const { data: existingComponent, isLoading } = useQuery({
    queryKey: ['component', orgId, id],
    queryFn: async () => {
      if (!isEditing || !orgId) return null;
      const res = await api.get(`/orgs/${orgId}/components/${id}`);
      return res.data.data;
    },
    enabled: isEditing && !!orgId,
  });

  useEffect(() => {
    if (existingComponent) {
      setName(existingComponent.name);
      setSlug(existingComponent.slug);
      setCategory(existingComponent.category || 'default');
      setFields(existingComponent.schema?.fields || []);
    }
  }, [existingComponent]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) return;
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        category: category.trim() || 'default',
        schema: { fields },
      };

      if (isEditing) {
        return api.patch(`/orgs/${orgId}/components/${id}`, payload);
      } else {
        return api.post(`/orgs/${orgId}/components`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components', orgId] });
      navigate('/components');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save component');
    },
  });

  const handleAddField = (fieldDef: FieldDefinition) => {
    if (editingFieldIndex !== null) {
      const updated = [...fields];
      updated[editingFieldIndex] = fieldDef;
      setFields(updated);
      setEditingFieldIndex(null);
    } else {
      setFields([...fields, fieldDef]);
    }
    setIsFieldModalOpen(false);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setFields((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= fields.length - 1) return;
    setFields((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setFields((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, movedItem);
      return next;
    });
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2"></div>
        <p className="text-xs">Loading component schema...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/components')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Components
        </button>

        <button
          onClick={() => {
            if (!name.trim()) {
              setErrorMessage('Component name is required');
              return;
            }
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Component' : 'Create Component'}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Meta Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Boxes className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Component Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Component Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SEO Metadata, Hero Banner"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEditing) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, ''),
                  );
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              API Slug
            </label>
            <input
              type="text"
              placeholder="e.g. seo-metadata"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isEditing}
              className="w-full font-mono px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              type="text"
              placeholder="e.g. default, layout, marketing"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Field Schema Builder Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Component Fields ({fields.length})
            </h3>
            <p className="text-xs text-slate-400">
              Define the schema fields embedded whenever this component is referenced.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingFieldIndex(null);
              setIsFieldModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-500 mb-3">No fields added to this component yet.</p>
            <button
              onClick={() => {
                setEditingFieldIndex(null);
                setIsFieldModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Field
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const Icon = FIELD_ICONS[field.type] || Type;
              const isFirst = idx === 0;
              const isLast = idx === fields.length - 1;
              const isDragging = draggedIndex === idx;

              return (
                <div
                  key={`${field.name}-${idx}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition ${
                    isDragging
                      ? 'opacity-40 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag Grip & Position Number */}
                    <div
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing select-none"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                      <span className="font-mono text-[10px] text-slate-400 w-4 text-center">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {field.label || field.name}
                        </span>
                        {field.required && (
                          <span className="text-[10px] font-semibold text-red-500">Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{field.name}</span>
                        <span>•</span>
                        <span className="capitalize">{field.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      title="Move Up"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      title="Move Down"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:border-slate-800 mx-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setEditingFieldIndex(idx);
                        setIsFieldModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition"
                      title="Edit field"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition"
                      title="Delete field"
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

      {/* FIELD MODAL */}
      <AddFieldModal
        isOpen={isFieldModalOpen}
        onClose={() => {
          setIsFieldModalOpen(false);
          setEditingFieldIndex(null);
        }}
        onSave={handleAddField}
        initialField={editingFieldIndex !== null ? fields[editingFieldIndex] : null}
      />
    </div>
  );
};
