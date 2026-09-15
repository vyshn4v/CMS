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
} from 'lucide-react';
import {
  TemplateDto,
  TemplateType,
  ContentTypeDto,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@cms/shared-types';

export const TemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('EMAIL');
  const [contentTypeId, setContentTypeId] = useState<string>('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');

  // UI State
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [copiedSchemaId, setCopiedSchemaId] = useState(false);

  // Fetch all schemas for the active org
  const { data: schemas = [] } = useQuery<ContentTypeDto[]>({
    queryKey: ['schemas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await api.get(`/orgs/${orgId}/schemas`);
      return res.data.data;
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
      setType(template.type || 'EMAIL');
      setContentTypeId(template.contentTypeId || '');
      setSubjectDraft(template.subjectDraft || '');
      setBodyDraft(template.bodyDraft || '');
    } else if (!isEditing) {
      // Set sensible defaults for new template
      setName('Welcome Email');
      setType('EMAIL');
      setSubjectDraft('Welcome to {{orgName}}, {{name}}!');
      setBodyDraft(
        `<h2>Welcome, {{name}}!</h2>\n<p>Thank you for signing up. Your account is active.</p>\n<p>Registered on: {{formatDate createdAt "MMMM D, YYYY"}}</p>`,
      );
    }
  }, [template, isEditing]);

  const selectedSchema = schemas.find((s) => s.id === contentTypeId) || null;
  const isPublished = template?.status === 'PUBLISHED';

  // Save Mutation (handles both Draft and Save & Publish)
  const saveMutation = useMutation({
    mutationFn: async (shouldPublish: boolean = false) => {
      if (!name.trim()) {
        throw new Error('Template name is required');
      }

      if (isEditing) {
        if (shouldPublish) {
          const res = await api.post(`/orgs/${orgId}/templates/${id}/publish`, {
            name: name.trim(),
            bodyDraft,
            subjectDraft: type === 'EMAIL' ? subjectDraft : null,
          });
          return res.data.data || res.data;
        } else {
          const payload: UpdateTemplateInput = {
            name: name.trim(),
            type,
            contentTypeId: contentTypeId || null,
            bodyDraft,
            subjectDraft: type === 'EMAIL' ? subjectDraft : null,
          };
          const res = await api.patch(`/orgs/${orgId}/templates/${id}`, payload);
          return res.data.data || res.data;
        }
      } else {
        const payload: CreateTemplateInput = {
          name: name.trim(),
          type,
          contentTypeId: contentTypeId || null,
          bodyDraft,
          subjectDraft: type === 'EMAIL' ? subjectDraft : null,
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
            disabled={saveMutation.isPending || unpublishMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
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
            disabled={saveMutation.isPending || unpublishMutation.isPending}
            onClick={() => saveMutation.mutate(true)}
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
        {/* Template Type Selector */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Type:</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TemplateType)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
          >
            <option value="EMAIL">EMAIL (Subject + Body)</option>
            <option value="HTML_PAGE">HTML_PAGE (Web document)</option>
            <option value="JSON">JSON (Structured payload)</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 dark:border-slate-800" />

        {/* Associated ContentType Selector */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Associated Model:</span>
          <select
            value={contentTypeId}
            onChange={(e) => setContentTypeId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">-- None (Standalone Template) --</option>
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (/{s.slug})
              </option>
            ))}
          </select>

          {/* schemaId 1-click clipboard copy badge */}
          {selectedSchema && (
            <button
              type="button"
              onClick={handleCopySchemaId}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
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
              {/* EMAIL Subject Draft Input */}
              {type === 'EMAIL' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1.5 shadow-sm">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Email Subject Template</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Supports Handlebars tags, e.g. &#123;&#123;name&#125;&#125;
                    </span>
                  </label>
                  <input
                    type="text"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    placeholder="e.g. Welcome to {{orgName}}, {{name}}!"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Template Body Dual-Mode Editor */}
              <div className="flex-1 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Template Body Source
                </label>
                <DualModeEditor
                  content={bodyDraft}
                  onChange={setBodyDraft}
                  templateType={type}
                  selectedSchema={selectedSchema}
                  className="flex-1"
                />
              </div>
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
                bodyDraft={bodyDraft}
                subjectDraft={subjectDraft}
                selectedSchema={selectedSchema}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
