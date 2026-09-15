import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Mail,
  FileCode2,
  Database,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  ContentTypeDto,
  ContentEntryDto,
  FieldDefinition,
  TemplateType,
  RenderOutputData,
} from '@cms/shared-types';

interface TemplatePreviewPaneProps {
  orgId: string;
  templateId?: string;
  templateType: TemplateType;
  bodyDraft: string;
  subjectDraft?: string;
  selectedSchema?: ContentTypeDto | null;
}

export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  orgId,
  templateId,
  templateType,
  bodyDraft,
  subjectDraft,
  selectedSchema,
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'entry'>('variables');
  const [variablesJson, setVariablesJson] = useState<string>('{}');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [previewOutput, setPreviewOutput] = useState<RenderOutputData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Fetch entries for the associated schema if available
  const { data: entries = [] } = useQuery<ContentEntryDto[]>({
    queryKey: ['schemaEntries', orgId, selectedSchema?.slug],
    queryFn: async () => {
      if (!selectedSchema?.slug) return [];
      const res = await api.get(`/orgs/${orgId}/content/${selectedSchema.slug}?limit=25`);
      return res.data.data?.items || res.data.data || [];
    },
    enabled: !!selectedSchema?.slug && !!orgId,
  });

  // Generate sample variables based on schema fields
  const generateSampleData = () => {
    if (!selectedSchema) {
      setVariablesJson(
        JSON.stringify(
          {
            name: 'Jane Doe',
            email: 'jane@example.com',
            company: 'Acme Corp',
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
      return;
    }

    const fields: FieldDefinition[] = (selectedSchema.schema as any)?.fields || [];
    const sample: Record<string, any> = {};

    fields.forEach((f) => {
      switch (f.type) {
        case 'text':
          sample[f.name] = `Sample ${f.label || f.name}`;
          break;
        case 'email':
          sample[f.name] = 'user@example.com';
          break;
        case 'number':
          sample[f.name] = 42;
          break;
        case 'boolean':
          sample[f.name] = true;
          break;
        case 'date':
        case 'datetime':
          sample[f.name] = new Date().toISOString();
          break;
        case 'richtext':
          sample[f.name] = `<p>This is rich text for <strong>${f.label || f.name}</strong></p>`;
          break;
        case 'enum':
          sample[f.name] = f.options && f.options.length > 0 ? f.options[0] : 'default';
          break;
        case 'media':
          sample[f.name] = 'https://picsum.photos/400/250';
          break;
        case 'json':
          sample[f.name] = { key: 'value' };
          break;
        default:
          sample[f.name] = 'Test value';
      }
    });

    setVariablesJson(JSON.stringify(sample, null, 2));
  };

  // Perform preview render
  const runPreview = async () => {
    setIsRendering(true);
    setPreviewError(null);

    try {
      let parsedVariables = {};
      if (activeTab === 'variables' && variablesJson.trim()) {
        try {
          parsedVariables = JSON.parse(variablesJson);
        } catch (e: any) {
          throw new Error(`Invalid Variables JSON: ${e.message}`);
        }
      }

      const endpoint = templateId
        ? `/orgs/${orgId}/templates/${templateId}/preview`
        : `/orgs/${orgId}/templates/preview-raw`;

      const payload = {
        body: bodyDraft,
        subject: subjectDraft,
        type: templateType,
        variables: parsedVariables,
        contentId: activeTab === 'entry' ? selectedEntryId || undefined : undefined,
      };

      const res = await api.post(endpoint, payload);
      setPreviewOutput(res.data.data || res.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Preview generation failed';
      setPreviewError(msg);
    } finally {
      setIsRendering(false);
    }
  };

  // Run preview on initial mount or when templateId / schema changes
  useEffect(() => {
    generateSampleData();
  }, [selectedSchema]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Context Configuration Box */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('variables')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                  activeTab === 'variables'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Test Variables</span>
              </button>

              {selectedSchema && (
                <button
                  type="button"
                  onClick={() => setActiveTab('entry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    activeTab === 'entry'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>Live Entry Data ({entries.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'variables' && (
              <button
                type="button"
                onClick={generateSampleData}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reset Sample Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={runPreview}
              disabled={isRendering}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isRendering ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-white" />
              )}
              <span>{isRendering ? 'Rendering...' : 'Render Preview'}</span>
            </button>
          </div>
        </div>

        {activeTab === 'variables' ? (
          <div>
            <textarea
              rows={4}
              value={variablesJson}
              onChange={(e) => setVariablesJson(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder='{ "key": "value" }'
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">-- Choose a content entry to inject --</option>
              {entries.map((entry) => {
                const title =
                  (entry.data as any)?.title ||
                  (entry.data as any)?.name ||
                  (entry.data as any)?.subject ||
                  entry.id;
                return (
                  <option key={entry.id} value={entry.id}>
                    {title} ({entry.status})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Error display */}
      {previewError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Preview Render Failed</p>
            <p className="mt-0.5 font-mono text-[11px]">{previewError}</p>
          </div>
        </div>
      )}

      {/* Rendered Output Frame */}
      <div className="flex-1 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[380px]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Render Output ({templateType})
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            {previewOutput ? 'Ready' : 'Click Render Preview to view output'}
          </span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {previewOutput ? (
            <div className="space-y-4">
              {/* EMAIL Subject Line Preview */}
              {previewOutput.type === 'EMAIL' && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 px-3 py-2">
                  <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">
                      Subject
                    </span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate block">
                      {previewOutput.subject || <span className="text-slate-400 italic">No subject</span>}
                    </span>
                  </div>
                </div>
              )}

              {/* HTML / EMAIL Body Render */}
              {previewOutput.type === 'EMAIL' && (
                <div
                  className="rounded-lg border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/30 prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: previewOutput.body }}
                />
              )}

              {previewOutput.type === 'HTML_PAGE' && (
                <div
                  className="rounded-lg border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/30 dark:bg-slate-950/30 prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: previewOutput.html }}
                />
              )}

              {/* JSON Output */}
              {previewOutput.type === 'JSON' && (
                <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                  {JSON.stringify(previewOutput.payload, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <Play className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Ready to compile & render</p>
              <p className="text-[11px] max-w-xs">
                Provide test variables or select a live content entry, then click <strong>Render Preview</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
