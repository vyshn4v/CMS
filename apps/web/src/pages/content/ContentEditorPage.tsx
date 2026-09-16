import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Globe,
  Archive,
  AlertCircle,
  Copy,
  Check,
  CheckCircle,
  Clock,
  Trash2,
  Lock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { usePermissions } from '../../hooks/usePermissions';
import { ContentTypeDto, ContentEntryDto, SchemaDefinition } from '@cms/shared-types';
import { DynamicFormRenderer } from '../../components/content/DynamicFormRenderer';

export const ContentEditorPage: React.FC = () => {
  const { slug, id } = useParams<{ slug: string; id?: string }>();
  const isEditing = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id;
  const { canEditContent, canCreateContent, canPublishContent, canDeleteContent, role } = usePermissions();
  const canModify = isEditing ? canEditContent : canCreateContent;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Fetch schema
  const { data: contentType, isLoading: isLoadingSchema } = useQuery<ContentTypeDto>({
    queryKey: ['schema', orgId, slug],
    queryFn: async () => {
      if (!orgId || !slug) return null;
      const res = await api.get(`/orgs/${orgId}/schemas/slug/${slug}`);
      return res.data.data;
    },
    enabled: !!orgId && !!slug,
  });

  // Fetch entry if editing
  const { data: entry, isLoading: isLoadingEntry } = useQuery<ContentEntryDto>({
    queryKey: ['contentEntry', orgId, slug, id],
    queryFn: async () => {
      if (!orgId || !slug || !id || id === 'new') return null;
      const res = await api.get(`/orgs/${orgId}/content/${slug}/${id}`);
      return res.data.data || res.data;
    },
    enabled: isEditing && !!orgId && !!slug && !!id,
  });

  // Populate form on entry load or reset on create mode
  useEffect(() => {
    if (isEditing && entry) {
      setFormData(entry.data || {});
    } else if (!isEditing) {
      setFormData({});
    }
  }, [entry, isEditing]);

  // Save or Publish mutation
  const saveMutation = useMutation({
    mutationFn: async (publish: boolean = false) => {
      if (!orgId || !canModify) return;
      if (publish && !canPublishContent) return;
      setFieldErrors({});
      setGeneralError(null);

      if (isEditing && id) {
        if (publish) {
          const res = await api.post(`/orgs/${orgId}/content/${slug}/${id}/publish`, {
            data: formData,
          });
          return res.data.data || res.data;
        } else {
          const res = await api.patch(`/orgs/${orgId}/content/${slug}/${id}`, {
            data: formData,
          });
          return res.data.data || res.data;
        }
      } else {
        const res = await api.post(`/orgs/${orgId}/content/${slug}`, {
          data: formData,
          publish,
        });
        return res.data.data || res.data;
      }
    },
    onSuccess: (savedEntry) => {
      if (savedEntry) {
        queryClient.setQueryData(['contentEntry', orgId, slug, savedEntry.id], savedEntry);
      }
      queryClient.invalidateQueries({ queryKey: ['contentEntries', orgId, slug] });
      queryClient.invalidateQueries({ queryKey: ['contentEntry', orgId, slug, id] });
      if (!isEditing && savedEntry?.id) {
        navigate(`/content/${slug}/${savedEntry.id}`, { replace: true });
      }
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      const errorObj = responseData?.error;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const map: Record<string, string> = {};
        for (const e of responseData.errors) {
          map[e.field] = e.message;
        }
        setFieldErrors(map);
      } else {
        setGeneralError(errorObj?.message || responseData?.message || 'Failed to save entry');
      }
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === 'new' || !canPublishContent) return;
      const res = await api.post(`/orgs/${orgId}/content/${slug}/${id}/unpublish`);
      return res.data.data || res.data;
    },
    onSuccess: (updatedEntry) => {
      if (updatedEntry) {
        queryClient.setQueryData(['contentEntry', orgId, slug, id], updatedEntry);
      }
      queryClient.invalidateQueries({ queryKey: ['contentEntries', orgId, slug] });
      queryClient.invalidateQueries({ queryKey: ['contentEntry', orgId, slug, id] });
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      setGeneralError(responseData?.error?.message || responseData?.message || 'Failed to unpublish entry');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id || id === 'new' || !canDeleteContent) return;
      await api.delete(`/orgs/${orgId}/content/${slug}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentEntries', orgId, slug] });
      navigate(`/content/${slug}`);
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      setGeneralError(responseData?.error?.message || responseData?.message || 'Failed to delete entry');
    },
  });

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
  };

  if (isLoadingSchema || (isEditing && isLoadingEntry)) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading editor...</div>;
  }

  if (!contentType) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Schema Not Found</h3>
        <button
          onClick={() => navigate('/content')}
          className="mt-4 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg"
        >
          Back to Content
        </button>
      </div>
    );
  }

  const fields = (contentType.schema as unknown as SchemaDefinition)?.fields || [];
  const isPublished = entry?.status === 'PUBLISHED';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/content/${slug}`)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? `Edit ${contentType.name} Entry` : `Create ${contentType.name}`}
              </h1>
              {isEditing && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isPublished
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isPublished ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {entry?.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Content Model: <span className="font-semibold text-slate-700 dark:text-slate-300">{contentType.name}</span> (/{contentType.slug})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete entry (editing mode only) */}
          {isEditing && canDeleteContent && (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm('Delete this entry permanently?')) {
                  deleteMutation.mutate();
                }
              }}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete Entry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Unpublish button (when already published) */}
          {isEditing && isPublished && canPublishContent && (
            <button
              type="button"
              disabled={unpublishMutation.isPending || saveMutation.isPending}
              onClick={() => unpublishMutation.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 px-3 py-2 text-xs font-semibold transition"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{unpublishMutation.isPending ? 'Unpublishing...' : 'Unpublish'}</span>
            </button>
          )}

          {/* Save Draft Button */}
          {canModify && (
            <button
              type="button"
              disabled={saveMutation.isPending || unpublishMutation.isPending}
              onClick={() => saveMutation.mutate(false)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveMutation.isPending && !saveMutation.variables ? 'Saving...' : 'Save Draft'}</span>
            </button>
          )}

          {/* Publish / Update & Publish Button */}
          {canPublishContent && (
            <button
              type="button"
              disabled={saveMutation.isPending || unpublishMutation.isPending}
              onClick={() => saveMutation.mutate(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
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
          )}
        </div>
      </div>

      {/* Read-Only Access Warning Banner */}
      {!canModify && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> You are viewing this content entry with the <strong>{role || 'Viewer'}</strong> role. Editing, saving, and publishing are restricted.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {role || 'Viewer'}
          </span>
        </div>
      )}

      {generalError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Editor Grid: Form on Left, Metadata & Schema on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Form Fields Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Entry Fields
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fill in the structured fields defined in the schema.
            </p>
          </div>

          <DynamicFormRenderer
            fields={fields}
            values={formData}
            onChange={handleFieldChange}
            errors={fieldErrors}
            disabled={saveMutation.isPending || !canModify}
          />
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Model & API Reference
            </h3>

            <div>
              <label className="text-[11px] font-medium text-slate-400">Content Model</label>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {contentType.name}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400">schemaId (UUID)</label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 truncate">
                  {contentType.id}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(contentType.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  title="Copy schemaId for Generation API"
                  className="text-slate-400 hover:text-indigo-600 transition p-0.5"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Pass this <code className="font-mono text-indigo-500">schemaId</code> in the Generation API body to avoid slug conflicts.
              </p>
            </div>

            {isEditing && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Entry Information
                </h3>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Entry ID</label>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate select-all">
                    {entry?.id || id}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Created By</label>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {entry?.createdBy?.name || entry?.createdBy?.email || 'User'}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400">Created At</label>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                {entry?.publishedAt && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-400">Published At</label>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {new Date(entry.publishedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
