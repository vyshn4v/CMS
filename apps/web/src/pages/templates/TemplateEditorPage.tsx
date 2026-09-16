import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { DualModeEditor } from '../../components/editors/DualModeEditor';
import { TemplatePreviewPane } from '../../components/editors/TemplatePreviewPane';
import {
  ArrowLeft,
  Save,
  Globe,
  Archive,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Columns2,
  PanelLeft,
  PanelRight,
  Layers,
  Boxes,
  Plus,
} from 'lucide-react';
import {
  TemplateDto,
  TemplateType,
  ContentTypeDto,
  ComponentDto,
  FieldDefinition,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@cms/shared-types';
import { safeParseSchema } from '../../lib/utils';

export const TemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('CUSTOM');
  const [contentTypeId, setContentTypeId] = useState<string>('');
  const [fieldsDraft, setFieldsDraft] = useState<Record<string, any>>({});
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');

  // Custom key inputs for adding extra computed keys to components
  const [newSubfieldInputs, setNewSubfieldInputs] = useState<Record<string, string>>({});

  // UI State
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [copiedSchemaId, setCopiedSchemaId] = useState(false);

  // Fetch all schemas (models) for the active org
  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Fetch all components for subfield exploration and component assistance
  const { data: components = [] } = useQuery<ComponentDto[]>({
    queryKey: ['components', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/components`);
      return res.data.data || res.data || [];
    },
    enabled: !!orgId,
  });

  // Fetch existing template if editing
  const { data: template, isLoading: isTemplateLoading } = useQuery<TemplateDto>({
    queryKey: ['template', orgId, id],
    queryFn: async () => {
      if (!orgId || !id || id === 'new') return null as any;
      const res = await api.get(`/orgs/${orgId}/templates/${id}`);
      return res.data.data || res.data;
    },
    enabled: isEditing && !!orgId,
  });

  // Populate form state when template data is fetched
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setType(template.type || 'CUSTOM');
      setContentTypeId(template.contentTypeId || '');
      setSubjectDraft(template.subjectDraft || '');
      setBodyDraft(template.bodyDraft || '');
      if (template.fieldsDraft && typeof template.fieldsDraft === 'object') {
        setFieldsDraft(template.fieldsDraft as Record<string, any>);
      } else {
        setFieldsDraft({});
      }
    } else if (!isEditing) {
      setName('New Output Template');
      setType('CUSTOM');
      setFieldsDraft({});
      setSubjectDraft('');
      setBodyDraft('');
    }
  }, [template, isEditing]);

  const selectedSchema = schemas.find((s) => s.id === contentTypeId) || null;
  const isPublished = template?.status === 'PUBLISHED';

  // Ensure fieldsDraft strictly contains ONLY the fields defined for the selected Model
  useEffect(() => {
    if (selectedSchema?.schema) {
      const rawSchema = safeParseSchema(selectedSchema.schema);
      const modelFields: FieldDefinition[] = rawSchema.fields || [];

      if (modelFields.length > 0) {
        setFieldsDraft((prev) => {
          const next: Record<string, any> = {};
          const existingSaved =
            template?.contentTypeId === selectedSchema.id && template?.fieldsDraft
              ? (template.fieldsDraft as Record<string, any>)
              : {};

          modelFields.forEach((f: any) => {
            if (f.type === 'component') {
              const targetId = f.component?.componentId || (f as any).componentId;
              const targetSlug = f.component?.componentSlug || (f as any).componentSlug;
              const cDef = components.find(
                (c) =>
                  (targetId && (c.id === targetId || c.slug === targetId)) ||
                  (targetSlug && (c.slug === targetSlug || c.id === targetSlug)),
              );
              const cFields: FieldDefinition[] = safeParseSchema(cDef?.schema).fields || [];
              const defaultSubObj: Record<string, string> = {};
              cFields.forEach((cf: any) => {
                defaultSubObj[cf.name] = `{{this.${cf.name}}}`;
              });

              const prevVal = prev[f.name] !== undefined ? prev[f.name] : existingSaved[f.name];
              if (prevVal && typeof prevVal === 'object' && !Array.isArray(prevVal)) {
                next[f.name] = { ...defaultSubObj, ...prevVal };
              } else if (typeof prevVal === 'string' && prevVal.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(prevVal);
                  next[f.name] = { ...defaultSubObj, ...parsed };
                } catch {
                  next[f.name] = defaultSubObj;
                }
              } else {
                next[f.name] = defaultSubObj;
              }
            } else {
              if (prev[f.name] !== undefined) {
                next[f.name] = prev[f.name];
              } else if (existingSaved[f.name] !== undefined) {
                next[f.name] = existingSaved[f.name];
              } else {
                // Starter expression
                if (f.name === 'sub' || f.name === 'subject') {
                  next[f.name] = '{{title}}';
                } else if (f.name === 'body' || f.name === 'html' || f.name === 'content') {
                  next[f.name] = '<h2>{{title}}</h2>\n<p>{{content}}</p>';
                } else {
                  next[f.name] = `{{${f.name}}}`;
                }
              }
            }
          });

          // Strictly return only modelFields keys - no extra or orphan fields!
          return next;
        });
      } else {
        setFieldsDraft({});
      }
    } else {
      setFieldsDraft({});
    }
  }, [selectedSchema, template, components]);

  // Get component subfield template value
  const getComponentSubfieldValue = (compFieldName: string, subfieldName: string): string => {
    const current = fieldsDraft[compFieldName];
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      return typeof current[subfieldName] === 'string'
        ? current[subfieldName]
        : current[subfieldName] !== undefined
        ? String(current[subfieldName])
        : '';
    }
    return '';
  };

  // Handle component subfield template change
  const handleComponentSubfieldChange = (
    compFieldName: string,
    subfieldName: string,
    value: string,
  ) => {
    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      current[subfieldName] = value;
      return {
        ...prev,
        [compFieldName]: current,
      };
    });
  };

  // Add a custom output key to a component
  const handleAddCustomSubfieldKey = (compFieldName: string, keyNameOverride?: string) => {
    const rawKey = (keyNameOverride || newSubfieldInputs[compFieldName] || '').trim();
    if (!rawKey) return;
    const cleanKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanKey) return;

    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      if (current[cleanKey] === undefined) {
        current[cleanKey] = `{{this.${cleanKey}}}`;
      }
      return {
        ...prev,
        [compFieldName]: current,
      };
    });

    setNewSubfieldInputs((prev) => ({ ...prev, [compFieldName]: '' }));
  };

  // Remove a custom output key from a component
  const handleRemoveCustomSubfieldKey = (compFieldName: string, subfieldName: string) => {
    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      delete current[subfieldName];
      return {
        ...prev,
        [compFieldName]: current,
      };
    });
  };

  // Save Mutation (handles both Draft and Save & Publish)
  const saveMutation = useMutation({
    mutationFn: async (shouldPublish: boolean = false) => {
      if (!name.trim()) {
        throw new Error('Template name is required');
      }
      if (!contentTypeId) {
        throw new Error('Please select a Model to continue configuring this template');
      }

      const bodyToSave =
        (typeof fieldsDraft.body === 'string' ? fieldsDraft.body : '') ||
        (typeof fieldsDraft.html === 'string' ? fieldsDraft.html : '') ||
        bodyDraft ||
        (typeof Object.values(fieldsDraft)[0] === 'string' ? Object.values(fieldsDraft)[0] : '') ||
        '';
      const subjectToSave =
        (typeof fieldsDraft.subject === 'string' ? fieldsDraft.subject : '') ||
        (typeof fieldsDraft.sub === 'string' ? fieldsDraft.sub : '') ||
        subjectDraft ||
        null;

      if (isEditing) {
        if (shouldPublish) {
          const res = await api.post(`/orgs/${orgId}/templates/${id}/publish`, {
            name: name.trim(),
            fieldsDraft,
            bodyDraft: bodyToSave,
            subjectDraft: subjectToSave,
          });
          return res.data.data || res.data;
        } else {
          const effectiveType: TemplateType = 'CUSTOM';

          const payload: UpdateTemplateInput = {
            name: name.trim(),
            type: effectiveType,
            contentTypeId: contentTypeId || null,
            fieldsDraft,
            bodyDraft: bodyToSave,
            subjectDraft: subjectToSave,
          };
          const res = await api.patch(`/orgs/${orgId}/templates/${id}`, payload);
          return res.data.data || res.data;
        }
      } else {
        const effectiveType: TemplateType = 'CUSTOM';

        const payload: CreateTemplateInput = {
          name: name.trim(),
          type: effectiveType,
          contentTypeId: contentTypeId || null,
          fieldsDraft,
          bodyDraft: bodyToSave,
          subjectDraft: subjectToSave,
          publish: shouldPublish,
        };
        const res = await api.post(`/orgs/${orgId}/templates`, payload);
        return res.data.data || res.data;
      }
    },
    onSuccess: (savedTemplate: TemplateDto) => {
      setGeneralError(null);
      if (savedTemplate) {
        queryClient.setQueryData(['template', orgId, savedTemplate.id], savedTemplate);
      }
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['template', orgId, id] });

      if (!isEditing && savedTemplate?.id) {
        navigate(`/templates/${savedTemplate.id}`);
      }
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      setGeneralError(
        responseData?.error?.message || responseData?.message || err.message || 'Failed to save template',
      );
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === 'new') return;
      const res = await api.post(`/orgs/${orgId}/templates/${id}/unpublish`);
      return res.data.data || res.data;
    },
    onSuccess: (updatedTemplate) => {
      if (updatedTemplate) {
        queryClient.setQueryData(['template', orgId, id], updatedTemplate);
      }
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['template', orgId, id] });
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      setGeneralError(
        responseData?.error?.message || responseData?.message || 'Failed to unpublish template',
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === 'new') return;
      await api.delete(`/orgs/${orgId}/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      navigate('/templates');
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      setGeneralError(responseData?.error?.message || responseData?.message || 'Failed to delete template');
    },
  });

  const handleCopySchemaId = () => {
    if (selectedSchema?.id) {
      navigator.clipboard.writeText(selectedSchema.id);
      setCopiedSchemaId(true);
      setTimeout(() => setCopiedSchemaId(false), 2000);
    }
  };

  if (isEditing && isTemplateLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-xs text-slate-400">
        Loading template editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top App Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/templates"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template Name..."
                className="font-bold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
              />
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                {isPublished ? 'PUBLISHED' : 'DRAFT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isEditing ? `ID: ${id}` : 'Creating new template'}
            </p>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-3">
          {/* Split / Editor / Preview View Toggles */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'editor'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Editor only"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Split View"
            >
              <Columns2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Preview only"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Delete Action */}
          {isEditing && (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Delete template "${name}" permanently?`)) {
                  deleteMutation.mutate();
                }
              }}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete Template"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Unpublish Action */}
          {isEditing && isPublished && (
            <button
              type="button"
              disabled={unpublishMutation.isPending || saveMutation.isPending}
              onClick={() => unpublishMutation.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 px-3 py-1.5 text-xs font-semibold transition"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}</span>
            </button>
          )}

          {/* Save Draft Action */}
          <button
            type="button"
            disabled={!contentTypeId || saveMutation.isPending || unpublishMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
            title={!contentTypeId ? 'Please select a Model to continue' : 'Save template draft'}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition"
          >
            <Save className="h-3.5 w-3.5" />
            <span>
              {saveMutation.isPending && !saveMutation.variables ? 'Saving...' : 'Save Draft'}
            </span>
          </button>

          {/* Publish Action */}
          <button
            type="button"
            disabled={!contentTypeId || saveMutation.isPending || unpublishMutation.isPending}
            onClick={() => saveMutation.mutate(true)}
            title={!contentTypeId ? 'Please select a Model to continue' : 'Publish template'}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>
              {saveMutation.isPending && saveMutation.variables
                ? 'Publishing...'
                : isPublished
                ? 'Update & Publish'
                : 'Publish'}
            </span>
          </button>
        </div>
      </div>

      {/* Metadata Configuration Bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-6 py-2.5 shrink-0 text-xs">
        {/* Target Output Model Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Target Output Model:</span>
          <select
            value={contentTypeId}
            onChange={(e) => setContentTypeId(e.target.value)}
            className={`rounded-lg border px-3 py-1 font-semibold focus:outline-none transition ${
              !contentTypeId
                ? 'border-amber-400 bg-amber-50/50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            <option value="">-- Please select a Model --</option>
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (/{s.slug})
              </option>
            ))}
          </select>

          {/* Model Fields Count Badge */}
          {selectedSchema && (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
              {((selectedSchema.schema as any)?.fields || []).length} {((selectedSchema.schema as any)?.fields || []).length === 1 ? 'field' : 'fields'} configured
            </span>
          )}

          {/* schemaId 1-click clipboard copy badge */}
          {selectedSchema && (
            <button
              type="button"
              onClick={handleCopySchemaId}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
              title="Click to copy schemaId for API requests"
            >
              {copiedSchemaId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>schemaId: {selectedSchema.id.slice(0, 8)}...</span>
            </button>
          )}
        </div>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Error: </span>
            <span>{generalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-xs text-red-500 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex gap-6">
          {/* Left / Center: Editor */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div
              className={`flex flex-col h-full overflow-y-auto space-y-4 ${
                viewMode === 'split' ? 'w-1/2' : 'w-full'
              }`}
            >
              {/* If an Associated Model is selected, render an editor for EACH configured field in that Model */}
              {selectedSchema ? (
                <div className="space-y-4">
                  {/* Model Header Info */}
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            Target Output Model:
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {selectedSchema.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            (/{selectedSchema.slug})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          Configure Handlebars formulas for each field below. Incoming request data will be dynamically compiled into this output schema.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Render Model Fields */}
                  {(() => {
                    const parsedModelSchema = safeParseSchema(selectedSchema.schema);
                    const modelFields: FieldDefinition[] = parsedModelSchema.fields || [];

                    if (modelFields.length === 0) {
                      return (
                        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center space-y-2">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            No fields defined yet for Model "{selectedSchema.name}"
                          </p>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 max-w-md mx-auto">
                            Add fields to this Model in the Schema Builder (e.g. "sub" and "body" for an Email model), or write custom template body below.
                          </p>
                          <div className="pt-2">
                            <DualModeEditor
                              content={bodyDraft}
                              onChange={setBodyDraft}
                              templateType={type}
                              selectedSchema={selectedSchema}
                              components={components}
                            />
                          </div>
                        </div>
                      );
                    }

                    return modelFields.map((field: any) => {
                      const isComponent = field.type === 'component';
                      const isDynamicZone = field.type === 'dynamiczone';

                      const targetCompId = field.component?.componentId || (field as any).componentId;
                      const targetCompSlug = field.component?.componentSlug || (field as any).componentSlug;

                      const compDef = isComponent
                        ? components.find(
                            (c) =>
                              (targetCompId && (c.id === targetCompId || c.slug === targetCompId)) ||
                              (targetCompSlug && (c.slug === targetCompSlug || c.id === targetCompSlug)),
                          )
                        : null;

                      const parsedCompSchema = safeParseSchema(compDef?.schema);
                      const compFields: FieldDefinition[] = parsedCompSchema.fields || [];
                      const isRepeatable = Boolean(field.component?.repeatable);

                      // Discover any extra custom/computed keys in fieldsDraft[field.name]
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

                      const isRichOrBody =
                        field.type === 'richtext' ||
                        field.type === 'json' ||
                        field.name === 'body' ||
                        field.name === 'html' ||
                        field.name === 'content';

                      const allowedDzIds: string[] =
                        field.dynamiczone?.allowedComponentIds ||
                        (field as any).allowedComponentIds ||
                        [];
                      const allowedComps = isDynamicZone
                        ? components.filter(
                            (c) => allowedDzIds.includes(c.id) || allowedDzIds.includes(c.slug),
                          )
                        : [];

                      return (
                        <div
                          key={field.name}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {field.label || field.name}
                              </span>
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                key: "{field.name}" • {field.type}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Supports &#123;&#123;variable&#125;&#125; syntax
                            </span>
                          </div>

                          {isComponent ? (
                            <div className="space-y-4">
                              {/* Component Header Banner */}
                              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/70 dark:border-violet-900/40 text-xs">
                                <div className="flex items-center gap-2.5">
                                  <Boxes className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-violet-950 dark:text-violet-200">
                                      Component: {compDef ? compDef.name : field.label || field.name}
                                    </span>
                                    {compDef?.slug && (
                                      <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded">
                                        {compDef.slug}
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                                      {isRepeatable ? 'Repeatable Array' : 'Single Object'}
                                    </span>
                                  </div>
                                </div>

                                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                                  {isRepeatable
                                    ? 'JSON array input outputs rendered JSON array'
                                    : 'JSON object input outputs rendered object'}
                                </span>
                              </div>

                              {/* Component Subfields Editor List */}
                              <div className="space-y-3 pl-1">
                                {compFields.length === 0 && extraCustomKeys.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500">
                                      No subfields defined for component <strong>{compDef?.name || field.name}</strong> in Schema Builder.
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      You can add output keys below or click a quick suggestion:
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                                      {['firstname', 'lastname', 'title', 'url'].map((sug) => (
                                        <button
                                          key={sug}
                                          type="button"
                                          onClick={() => handleAddCustomSubfieldKey(field.name, sug)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-800 text-[11px] font-mono text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition"
                                        >
                                          <Plus className="h-2.5 w-2.5 text-violet-500" />
                                          <span>+ {sug}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Render each defined schema subfield with matching input type */}
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

                                            {/* Scope variable helpers */}
                                            {allCompSubNames.length > 0 && (
                                              <div className="flex flex-wrap items-center gap-1">
                                                <span className="text-[10px] text-slate-400 mr-0.5">Insert:</span>
                                                {allCompSubNames.map((sName) => (
                                                  <button
                                                    key={sName}
                                                    type="button"
                                                    onClick={() => {
                                                      const cur = getComponentSubfieldValue(field.name, cField.name);
                                                      const tag = `{{this.${sName}}}`;
                                                      const updated = cur ? `${cur} ${tag}` : tag;
                                                      handleComponentSubfieldChange(field.name, cField.name, updated);
                                                    }}
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 transition shadow-2xs"
                                                    title={`Click to insert {{this.${sName}}}`}
                                                  >
                                                    <Plus className="h-2.5 w-2.5 text-violet-500" />
                                                    <span>{sName}</span>
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {isRich ? (
                                            <DualModeEditor
                                              content={getComponentSubfieldValue(field.name, cField.name)}
                                              onChange={(val) =>
                                                handleComponentSubfieldChange(field.name, cField.name, val)
                                              }
                                              templateType="CUSTOM"
                                              selectedSchema={selectedSchema}
                                              components={components}
                                              className="min-h-[180px]"
                                            />
                                          ) : isJsonField ? (
                                            <textarea
                                              rows={3}
                                              value={getComponentSubfieldValue(field.name, cField.name)}
                                              onChange={(e) =>
                                                handleComponentSubfieldChange(
                                                  field.name,
                                                  cField.name,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={`e.g. {{{json this.${cField.name}}}}`}
                                              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                          ) : (
                                            <input
                                              type="text"
                                              value={getComponentSubfieldValue(field.name, cField.name)}
                                              onChange={(e) =>
                                                handleComponentSubfieldChange(
                                                  field.name,
                                                  cField.name,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={`e.g. {{this.${cField.name}}}`}
                                              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            />
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* Render any extra custom/computed keys */}
                                    {extraCustomKeys.map((customKey) => (
                                      <div
                                        key={customKey}
                                        className="rounded-xl border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/30 dark:bg-violet-950/20 p-3 space-y-2 shadow-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                              {customKey}
                                            </span>
                                            <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-1.5 py-0.5 rounded">
                                              custom / mapped key
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveCustomSubfieldKey(field.name, customKey)
                                            }
                                            className="text-[11px] text-red-500 hover:text-red-700 transition"
                                          >
                                            Remove Key
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={getComponentSubfieldValue(field.name, customKey)}
                                          onChange={(e) =>
                                            handleComponentSubfieldChange(
                                              field.name,
                                              customKey,
                                              e.target.value,
                                            )
                                          }
                                          placeholder={`e.g. {{this.firstname}} {{this.lastname}}`}
                                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                        />
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>

                              {/* Bottom Action Bar: Add Computed Key & Reset */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Add custom key (e.g. fullName)"
                                    value={newSubfieldInputs[field.name] || ''}
                                    onChange={(e) =>
                                      setNewSubfieldInputs((prev) => ({
                                        ...prev,
                                        [field.name]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomSubfieldKey(field.name);
                                      }
                                    }}
                                    className="w-52 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomSubfieldKey(field.name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Output Key</span>
                                  </button>
                                </div>

                                {compFields.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const resetObj: Record<string, string> = {};
                                      compFields.forEach((cf) => {
                                        resetObj[cf.name] = `{{this.${cf.name}}}`;
                                      });
                                      setFieldsDraft((prev) => ({
                                        ...prev,
                                        [field.name]: resetObj,
                                      }));
                                    }}
                                    className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
                                    title="Reset subfield templates to default {{this.field}}"
                                  >
                                    Reset to Defaults
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : isDynamicZone ? (
                            <div className="space-y-2.5">
                              {/* Dynamic Zone Banner */}
                              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-xs">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="font-semibold text-emerald-950 dark:text-emerald-200">
                                    Dynamic Zone: {field.label || field.name}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                    {allowedComps.length > 0 ? `${allowedComps.length} allowed ${allowedComps.length === 1 ? 'component' : 'components'}` : 'All components'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFieldsDraft((prev) => ({
                                        ...prev,
                                        [field.name]: `{{${field.name}}}`,
                                      }))
                                    }
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                                  >
                                    Pass-Through (Default)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      let loopTpl = `{{#each ${field.name}}}\n`;
                                      if (allowedComps.length > 0) {
                                        allowedComps.forEach((ac) => {
                                          const acSchema = safeParseSchema(ac.schema);
                                          const acFields: any[] = acSchema.fields || [];
                                          loopTpl += `  {{#ifEquals this.__component "${ac.slug}"}}\n    <section class="block-${ac.slug}">\n`;
                                          if (acFields.length > 0) {
                                            acFields.forEach((acf) => {
                                              loopTpl += `      <p>{{this.${acf.name}}}</p>\n`;
                                            });
                                          } else {
                                            loopTpl += `      <h2>{{this.title}}</h2>\n`;
                                          }
                                          loopTpl += `    </section>\n  {{/ifEquals}}\n`;
                                        });
                                      } else {
                                        loopTpl += `  <div class="block-item">\n    <p>{{this.__component}}</p>\n  </div>\n`;
                                      }
                                      loopTpl += `{{/each}}`;
                                      setFieldsDraft((prev) => ({ ...prev, [field.name]: loopTpl }));
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                                    title="Generate multi-block discriminator template using actual allowed components"
                                  >
                                    Insert Block Loop
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFieldsDraft((prev) => ({
                                        ...prev,
                                        [field.name]: `{{{json ${field.name}}}}`,
                                      }))
                                    }
                                    className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                                  >
                                    {'{{{json ' + field.name + '}}}'}
                                  </button>
                                </div>
                              </div>

                              {/* Allowed component blocks helper pills */}
                              {allowedComps.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                  <span className="text-slate-500 font-medium mr-1 text-[10px]">
                                    Allowed Blocks:
                                  </span>
                                  {allowedComps.map((ac) => {
                                    const acSchema = safeParseSchema(ac.schema);
                                    const acFields: any[] = acSchema.fields || [];
                                    const blockSnippet = `{{#ifEquals this.__component "${ac.slug}"}}\n  <div class="block-${ac.slug}">\n${
                                      acFields.length > 0
                                        ? acFields.map((acf) => `    <p>{{this.${acf.name}}}</p>`).join('\n')
                                        : '    <p>{{this.title}}</p>'
                                    }\n  </div>\n{{/ifEquals}}`;

                                    return (
                                      <button
                                        key={ac.id}
                                        type="button"
                                        onClick={() => {
                                          const current = fieldsDraft[field.name] || '';
                                          const updated = current ? `${current}\n${blockSnippet}` : blockSnippet;
                                          setFieldsDraft((prev) => ({ ...prev, [field.name]: updated }));
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 font-mono text-[10px] text-emerald-700 dark:text-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition shadow-xs"
                                        title={`Append #${ac.slug} block check snippet`}
                                      >
                                        <Plus className="h-2.5 w-2.5 text-emerald-500" />
                                        <span>{ac.name}</span>
                                        <span className="text-[9px] text-slate-400 font-sans">({acFields.length} {acFields.length === 1 ? 'field' : 'fields'})</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <textarea
                                rows={3}
                                value={fieldsDraft[field.name] || ''}
                                onChange={(e) =>
                                  setFieldsDraft((prev) => ({ ...prev, [field.name]: e.target.value }))
                                }
                                placeholder={`{{${field.name}}} for direct pass-through, or dynamic block loop template`}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          ) : isRichOrBody ? (
                            <DualModeEditor
                              content={fieldsDraft[field.name] || ''}
                              onChange={(val) =>
                                setFieldsDraft((prev) => ({ ...prev, [field.name]: val }))
                              }
                              templateType="CUSTOM"
                              selectedSchema={selectedSchema}
                              components={components}
                              className="min-h-[260px]"
                            />
                          ) : (
                            <input
                              type="text"
                              value={fieldsDraft[field.name] || ''}
                              onChange={(e) =>
                                setFieldsDraft((prev) => ({ ...prev, [field.name]: e.target.value }))
                              }
                              placeholder={`e.g. {{${field.name}}}`}
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                /* Mandatory Model Selection Screen (No Standalone Mode) */
                <div className="flex flex-col items-center justify-center h-full min-h-[420px] text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
                    <Layers className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Please select one model to continue
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
                    Templates require an associated Model defining the output schema format (e.g. Email, Push Notification, SMS, HTML Document, or Custom JSON). Please select a model to configure template formulas.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <select
                      value={contentTypeId}
                      onChange={(e) => setContentTypeId(e.target.value)}
                      className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/50 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Choose an Output Model --</option>
                      {schemas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (/{s.slug})
                        </option>
                      ))}
                    </select>
                    <Link
                      to="/schemas/new"
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Create New Model
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right: Live Preview Pane */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className={`h-full overflow-y-auto ${
                viewMode === 'split' ? 'w-1/2' : 'w-full'
              }`}
            >
              <TemplatePreviewPane
                orgId={orgId || ''}
                templateId={isEditing ? id : undefined}
                templateType={type}
                fieldsDraft={fieldsDraft}
                bodyDraft={bodyDraft}
                subjectDraft={subjectDraft}
                selectedSchema={selectedSchema}
                components={components}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
