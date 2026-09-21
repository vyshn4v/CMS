import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import {
  TemplateDto,
  TemplateType,
  ContentTypeDto,
  ComponentDto,
  FieldDefinition,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@cms/shared-types';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../lib/api';
import { safeParseSchema } from '../../lib/utils';
import { DualModeEditor } from '../../components/editors/DualModeEditor';
import { TemplatePreviewPane } from '../../components/editors/TemplatePreviewPane';
import { TemplateHeader, ViewMode } from '../../components/templates/TemplateHeader';
import { ComponentFieldCard } from '../../components/templates/ComponentFieldCard';
import { DynamicZoneFieldCard } from '../../components/templates/DynamicZoneFieldCard';
import { Alert, Spinner } from '../../components/ui';

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

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Fetch all schemas (models)
  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
    },
    enabled: !!orgId,
  });

  // Fetch all components
  const { data: components = [] } = useQuery<ComponentDto[]>({
    queryKey: ['components', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/components`);
      return res.data.data || res.data || [];
    },
    enabled: !!orgId,
  });

  // Fetch existing template
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

  // Initialize missing component/dynamic zone fields when model changes
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
            } else if (f.type === 'dynamiczone') {
              const allowedDzIds: string[] =
                f.dynamiczone?.allowedComponentIds || (f as any).allowedComponentIds || [];
              const allowedComps = components.filter(
                (c) => allowedDzIds.includes(c.id) || allowedDzIds.includes(c.slug),
              );
              const defaultDzObj: Record<string, any> = { __dynamicZone: true };
              allowedComps.forEach((ac) => {
                const acFields: FieldDefinition[] = safeParseSchema(ac.schema).fields || [];
                const blockSub: Record<string, string> = {};
                acFields.forEach((acf: any) => {
                  blockSub[acf.name] = `{{this.${acf.name}}}`;
                });
                defaultDzObj[ac.slug] = blockSub;
              });

              const prevVal = prev[f.name] !== undefined ? prev[f.name] : existingSaved[f.name];
              if (prevVal && typeof prevVal === 'object' && !Array.isArray(prevVal)) {
                next[f.name] = { ...defaultDzObj, ...prevVal, __dynamicZone: true };
              } else {
                next[f.name] = defaultDzObj;
              }
            } else {
              next[f.name] =
                prev[f.name] !== undefined
                  ? prev[f.name]
                  : existingSaved[f.name] !== undefined
                  ? existingSaved[f.name]
                  : `{{${f.name}}}`;
            }
          });

          return next;
        });
      }
    }
  }, [selectedSchema, components, template]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (shouldPublish: boolean = false) => {
      if (!name.trim()) throw new Error('Template name is required');
      if (!contentTypeId) throw new Error('Please select a Model to continue configuring this template');

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
          const payload: UpdateTemplateInput = {
            name: name.trim(),
            type: 'CUSTOM',
            contentTypeId: contentTypeId || null,
            fieldsDraft,
            bodyDraft: bodyToSave,
            subjectDraft: subjectToSave,
          };
          const res = await api.patch(`/orgs/${orgId}/templates/${id}`, payload);
          return res.data.data || res.data;
        }
      } else {
        const payload: CreateTemplateInput = {
          name: name.trim(),
          type: 'CUSTOM',
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
        queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
        if (!isEditing && savedTemplate.id) {
          navigate(`/templates/${savedTemplate.id}`, { replace: true });
        }
      }
    },
    onError: (err: any) => {
      setGeneralError(err.response?.data?.message || err.message || 'Failed to save template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/orgs/${orgId}/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      navigate('/templates');
    },
    onError: (err: any) => {
      setGeneralError(err.response?.data?.message || err.message || 'Failed to delete template');
    },
  });

  // Handlers for Component Fields
  const handleComponentSubfieldChange = (compFieldName: string, subfieldName: string, value: string) => {
    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      current[subfieldName] = value;
      return { ...prev, [compFieldName]: current };
    });
  };

  const handleAddCustomSubfieldKey = (compFieldName: string, keyName?: string) => {
    const rawKey = (keyName || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!rawKey) return;
    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      if (current[rawKey] === undefined) {
        current[rawKey] = `{{this.${rawKey}}}`;
      }
      return { ...prev, [compFieldName]: current };
    });
  };

  const handleRemoveCustomSubfieldKey = (compFieldName: string, subfieldName: string) => {
    setFieldsDraft((prev) => {
      const current =
        typeof prev[compFieldName] === 'object' && prev[compFieldName] !== null && !Array.isArray(prev[compFieldName])
          ? { ...prev[compFieldName] }
          : {};
      delete current[subfieldName];
      return { ...prev, [compFieldName]: current };
    });
  };

  const handleCompResetDefaults = (compFieldName: string, defaults: Record<string, string>) => {
    setFieldsDraft((prev) => ({ ...prev, [compFieldName]: defaults }));
  };

  // Handlers for Dynamic Zone Fields
  const handleDzBlockSubfieldChange = (
    dzFieldName: string,
    blockSlug: string,
    subfieldName: string,
    value: string,
  ) => {
    setFieldsDraft((prev) => {
      const dz =
        typeof prev[dzFieldName] === 'object' && prev[dzFieldName] !== null && !Array.isArray(prev[dzFieldName])
          ? { ...prev[dzFieldName] }
          : { __dynamicZone: true };
      const block =
        typeof dz[blockSlug] === 'object' && dz[blockSlug] !== null && !Array.isArray(dz[blockSlug])
          ? { ...dz[blockSlug] }
          : {};
      block[subfieldName] = value;
      dz[blockSlug] = block;
      dz.__dynamicZone = true;
      return { ...prev, [dzFieldName]: dz };
    });
  };

  const handleAddDzCustomKey = (dzFieldName: string, blockSlug: string, keyName?: string) => {
    const rawKey = (keyName || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!rawKey) return;
    handleDzBlockSubfieldChange(dzFieldName, blockSlug, rawKey, `{{this.${rawKey}}}`);
  };

  const handleRemoveDzCustomKey = (dzFieldName: string, blockSlug: string, subfieldName: string) => {
    setFieldsDraft((prev) => {
      const dz =
        typeof prev[dzFieldName] === 'object' && prev[dzFieldName] !== null && !Array.isArray(prev[dzFieldName])
          ? { ...prev[dzFieldName] }
          : { __dynamicZone: true };
      const block =
        typeof dz[blockSlug] === 'object' && dz[blockSlug] !== null && !Array.isArray(dz[blockSlug])
          ? { ...dz[blockSlug] }
          : {};
      delete block[subfieldName];
      dz[blockSlug] = block;
      return { ...prev, [dzFieldName]: dz };
    });
  };

  const handleDzResetDefaults = (
    dzFieldName: string,
    blockSlug: string,
    defaults: Record<string, string>,
  ) => {
    setFieldsDraft((prev) => {
      const dz =
        typeof prev[dzFieldName] === 'object' && prev[dzFieldName] !== null
          ? { ...prev[dzFieldName] }
          : { __dynamicZone: true };
      dz[blockSlug] = defaults;
      dz.__dynamicZone = true;
      return { ...prev, [dzFieldName]: dz };
    });
  };

  if (isTemplateLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spinner size="lg" label="Loading template..." />
      </div>
    );
  }

  const modelFields: FieldDefinition[] = safeParseSchema(selectedSchema?.schema).fields || [];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header Toolbar */}
      <TemplateHeader
        name={name}
        onNameChange={setName}
        selectedSchema={selectedSchema}
        template={template || null}
        isEditing={isEditing}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSaveDraft={() => saveMutation.mutate(false)}
        onPublish={() => saveMutation.mutate(true)}
        onDelete={() => {
          if (confirm(`Delete template "${name}" permanently?`)) {
            deleteMutation.mutate();
          }
        }}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      {/* Model Selection Bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-6 py-2.5 shrink-0 text-xs">
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
        {selectedSchema && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            {modelFields.length} {modelFields.length === 1 ? 'field' : 'fields'} configured
          </span>
        )}
      </div>

      {/* Error Banner */}
      {generalError && (
        <div className="mx-6 mt-4">
          <Alert type="error" onDismiss={() => setGeneralError(null)}>
            {generalError}
          </Alert>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex gap-6">
          {/* Editor Column */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div
              className={`flex flex-col h-full overflow-y-auto space-y-4 ${
                viewMode === 'split' ? 'w-1/2' : 'w-full'
              }`}
            >
              {selectedSchema ? (
                <div className="space-y-4">
                  {modelFields.map((field) => {
                    const isComponent = field.type === 'component';
                    const isDynamicZone = field.type === 'dynamiczone';
                    const isRichOrBody =
                      field.type === 'richtext' ||
                      field.type === 'json' ||
                      field.name === 'body' ||
                      field.name === 'html' ||
                      field.name === 'content';

                    if (isComponent) {
                      const targetCompId = field.component?.componentId || (field as any).componentId;
                      const targetCompSlug = field.component?.componentSlug || (field as any).componentSlug;
                      const compDef =
                        components.find(
                          (c) =>
                            (targetCompId && (c.id === targetCompId || c.slug === targetCompId)) ||
                            (targetCompSlug && (c.slug === targetCompSlug || c.id === targetCompSlug)),
                        ) || null;

                      return (
                        <ComponentFieldCard
                          key={field.name}
                          field={field}
                          compDef={compDef}
                          fieldsDraft={fieldsDraft}
                          onFieldChange={handleComponentSubfieldChange}
                          onAddCustomKey={handleAddCustomSubfieldKey}
                          onRemoveCustomKey={handleRemoveCustomSubfieldKey}
                          onResetDefaults={handleCompResetDefaults}
                          selectedSchema={selectedSchema}
                          components={components}
                        />
                      );
                    }

                    if (isDynamicZone) {
                      return (
                        <DynamicZoneFieldCard
                          key={field.name}
                          field={field}
                          fieldsDraft={fieldsDraft}
                          onFieldChange={handleDzBlockSubfieldChange}
                          onAddCustomKey={handleAddDzCustomKey}
                          onRemoveCustomKey={handleRemoveDzCustomKey}
                          onResetDefaults={handleDzResetDefaults}
                          selectedSchema={selectedSchema}
                          components={components}
                        />
                      );
                    }

                    // Regular Primitive or Rich Text Field
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

                        {isRichOrBody ? (
                          <DualModeEditor
                            content={fieldsDraft[field.name] || ''}
                            onChange={(val) =>
                              setFieldsDraft((prev) => ({ ...prev, [field.name]: val }))
                            }
                            templateType="CUSTOM"
                            selectedSchema={selectedSchema}
                            components={components}
                            className="min-h-[240px]"
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
                  })}
                </div>
              ) : (
                /* Empty Model Prompt */
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

          {/* Live Preview Pane */}
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
