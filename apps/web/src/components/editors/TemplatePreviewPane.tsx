import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Mail,
  Bell,
  MessageSquare,
  Globe,
  Code2,
  Database,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  ContentTypeDto,
  TemplateType,
  RenderOutputData,
} from '@cms/shared-types';

interface TemplatePreviewPaneProps {
  orgId: string;
  templateId?: string;
  templateType?: TemplateType;
  fieldsDraft?: Record<string, string>;
  bodyDraft: string;
  subjectDraft?: string;
  selectedSchema?: ContentTypeDto | null;
}

export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  orgId,
  templateId,
  fieldsDraft,
  bodyDraft,
  subjectDraft,
  selectedSchema,
}) => {
  const [outputTab, setOutputTab] = useState<'visual' | 'json'>('visual');
  const [variablesJson, setVariablesJson] = useState<string>('{}');
  const [previewOutput, setPreviewOutput] = useState<RenderOutputData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Determine Model Output Type from the Schema definition or heuristics
  const modelType: string =
    ((selectedSchema?.schema as any)?.modelType as string) ||
    (selectedSchema?.slug?.toLowerCase().includes('email') ||
    (fieldsDraft && (fieldsDraft.sub !== undefined || fieldsDraft.subject !== undefined))
      ? 'EMAIL'
      : selectedSchema?.slug?.toLowerCase().includes('push') ||
        selectedSchema?.slug?.toLowerCase().includes('notification')
      ? 'PUSH_NOTIFICATION'
      : selectedSchema?.slug?.toLowerCase().includes('sms')
      ? 'SMS'
      : selectedSchema?.slug?.toLowerCase().includes('page') ||
        selectedSchema?.slug?.toLowerCase().includes('html')
      ? 'HTML_PAGE'
      : 'CUSTOM');

  // Automatically extracts {{variable}} placeholders from the template fields and creates sample test payload
  const generateSampleData = () => {
    const foundVars = new Set<string>();
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;

    // Scan all field formulas in fieldsDraft
    if (fieldsDraft) {
      Object.values(fieldsDraft).forEach((tpl) => {
        if (!tpl) return;
        let match;
        while ((match = regex.exec(tpl)) !== null) {
          const varName = match[1];
          if (varName && !['if', 'else', 'each', 'unless', 'with', 'formatDate', 'uppercase', 'json'].includes(varName)) {
            foundVars.add(varName);
          }
        }
      });
    }

    // Scan body and subject drafts
    [bodyDraft, subjectDraft].forEach((tpl) => {
      if (!tpl) return;
      let match;
      while ((match = regex.exec(tpl)) !== null) {
        const varName = match[1];
        if (varName && !['if', 'else', 'each', 'unless', 'with', 'formatDate', 'uppercase', 'json'].includes(varName)) {
          foundVars.add(varName);
        }
      }
    });

    const sample: Record<string, any> = {};

    if (foundVars.size > 0) {
      foundVars.forEach((v) => {
        const low = v.toLowerCase();
        if (low.includes('name') || low.includes('customer') || low.includes('user')) {
          sample[v] = 'Vyshnav';
        } else if (low.includes('email')) {
          sample[v] = 'vyshnav@example.com';
        } else if (low.includes('order') || low.includes('id')) {
          sample[v] = 'ORD-5542';
        } else if (low.includes('amount') || low.includes('total') || low.includes('price')) {
          sample[v] = 450;
        } else if (low.includes('url') || low.includes('link')) {
          sample[v] = 'https://example.com/orders/5542';
        } else if (low.includes('date')) {
          sample[v] = new Date().toISOString().split('T')[0];
        } else if (low.includes('title')) {
          sample[v] = 'Order Confirmed';
        } else {
          sample[v] = `Sample ${v}`;
        }
      });
    } else {
      // Sensible defaults if no variables are detected
      sample.customer = 'Vyshnav';
      sample.orderId = 'ORD-5542';
      sample.totalAmount = 450;
      sample.platform = 'CMS Engine';
    }

    setVariablesJson(JSON.stringify(sample, null, 2));
  };

  // Perform preview render
  const runPreview = async () => {
    setIsRendering(true);
    setPreviewError(null);

    try {
      let parsedVariables = {};
      if (variablesJson.trim()) {
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
        fieldsDraft,
        body: bodyDraft,
        subject: subjectDraft,
        type: modelType as TemplateType,
        variables: parsedVariables,
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

  // Initialize sample test data on mount or when schema changes
  useEffect(() => {
    generateSampleData();
  }, [selectedSchema]);

  const outputData: Record<string, any> =
    (previewOutput as any)?.data ||
    (previewOutput as any)?.output ||
    (previewOutput as any)?.payload ||
    (previewOutput ? (previewOutput as any) : {});

  const getModelTypeBadge = () => {
    switch (modelType) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
            <Mail className="h-3 w-3" />
            <span>EMAIL</span>
          </span>
        );
      case 'PUSH_NOTIFICATION':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">
            <Bell className="h-3 w-3" />
            <span>PUSH NOTIFICATION</span>
          </span>
        );
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
            <MessageSquare className="h-3 w-3" />
            <span>SMS</span>
          </span>
        );
      case 'HTML_PAGE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300">
            <Globe className="h-3 w-3" />
            <span>HTML DOCUMENT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
            <Code2 className="h-3 w-3" />
            <span>CUSTOM OBJECT</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Dynamic Input Variables Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Dynamic Request Input (JSON)
              </span>
              <p className="text-[10px] text-slate-400">
                Schema-free input payload passed at runtime to populate template fields
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generateSampleData}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              title="Extract template variables from formulas"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Autofill Variables</span>
            </button>

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

        <div>
          <textarea
            rows={4}
            value={variablesJson}
            onChange={(e) => setVariablesJson(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder='{ "customer": "Alice", "orderId": "ORD-101", "amount": 250 }'
          />
        </div>
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
      <div className="flex-1 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[380px] shadow-sm">
        {/* Output Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Model Output: {selectedSchema ? selectedSchema.name : 'Custom Structure'}
            </span>
            {getModelTypeBadge()}
          </div>

          {previewOutput && (
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setOutputTab('visual')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  outputTab === 'visual'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Model Preview ({modelType})
              </button>
              <button
                type="button"
                onClick={() => setOutputTab('json')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  outputTab === 'json'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Output JSON
              </button>
            </div>
          )}
        </div>

        {/* Output Content Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {previewOutput ? (
            <div className="space-y-4">
              {/* Tab 1: Output JSON */}
              {outputTab === 'json' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      Output fields matching Model schema:
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      200 OK
                    </span>
                  </div>
                  <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
                    {JSON.stringify(outputData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Tab 2: Visual Preview based on Model Type */}
              {outputTab === 'visual' && (
                <div>
                  {/* EMAIL MODEL PREVIEW */}
                  {modelType === 'EMAIL' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                      {/* Email Client Header */}
                      <div className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Email Client Preview
                            </span>
                          </div>
                          <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            Model: {selectedSchema?.name || 'Email'}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs pt-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-400 font-medium w-16 shrink-0">Subject:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {outputData.sub || outputData.subject || (
                                <span className="text-slate-400 italic">No Subject</span>
                              )}
                            </span>
                          </div>
                          {outputData.preheader && (
                            <div className="flex items-baseline gap-2 text-[11px] text-slate-500">
                              <span className="text-slate-400 font-medium w-16 shrink-0">Preheader:</span>
                              <span className="italic">{outputData.preheader}</span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-2 text-[11px] text-slate-500">
                            <span className="text-slate-400 font-medium w-16 shrink-0">From:</span>
                            <span>noreply@platform.internal</span>
                          </div>
                        </div>
                      </div>

                      {/* Email Body Canvas */}
                      <div className="p-6 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                        <div
                          className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: outputData.body || outputData.html || '<p class="text-slate-400 italic">Empty body content</p>',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* PUSH NOTIFICATION MODEL PREVIEW */}
                  {modelType === 'PUSH_NOTIFICATION' && (
                    <div className="flex justify-center py-6">
                      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 text-white p-4 shadow-xl space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
                              CMS
                            </div>
                            <span className="font-semibold text-slate-200">Platform Notification</span>
                          </div>
                          <span className="text-[10px] text-slate-400">now</span>
                        </div>
                        <div className="pt-1">
                          <h4 className="text-sm font-bold text-white">
                            {outputData.title || outputData.sub || outputData.subject || 'Notification Title'}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-normal">
                            {outputData.message || outputData.body || outputData.text || 'Notification message content'}
                          </p>
                        </div>
                        {(outputData.action_url || outputData.deep_link) && (
                          <div className="pt-2 border-t border-slate-800 flex justify-end">
                            <span className="text-[11px] text-indigo-400 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer">
                              <span>Open App</span>
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SMS MODEL PREVIEW */}
                  {modelType === 'SMS' && (
                    <div className="flex justify-center py-6">
                      <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4 shadow-md space-y-3">
                        <div className="text-center text-[11px] text-slate-400 font-semibold">
                          SMS Text Message • Today
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-emerald-600 text-white rounded-2xl rounded-br-none px-4 py-2.5 max-w-[85%] text-xs shadow-sm">
                            <p className="leading-relaxed whitespace-pre-wrap">
                              {outputData.message || outputData.text || outputData.body || '(Empty SMS message)'}
                            </p>
                            <span className="text-[9px] text-emerald-200 block text-right mt-1">Delivered</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HTML PAGE / DOCUMENT MODEL PREVIEW */}
                  {modelType === 'HTML_PAGE' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                      <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="flex-1 max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-md px-3 py-1 text-[11px] text-slate-500 font-mono truncate border border-slate-200 dark:border-slate-800">
                          https://render.internal/{selectedSchema?.slug || 'page'}
                        </div>
                      </div>
                      <div className="p-6">
                        <div
                          className="prose dark:prose-invert max-w-none text-sm"
                          dangerouslySetInnerHTML={{
                            __html: outputData.html || outputData.body || '<p class="text-slate-400 italic">Empty HTML document</p>',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CUSTOM STRUCTURED OBJECT PREVIEW */}
                  {modelType === 'CUSTOM' && (
                    <div className="space-y-3">
                      {Object.keys(outputData).length > 0 ? (
                        Object.entries(outputData).map(([key, value]) => {
                          const strVal = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                          const isHtml =
                            typeof value === 'string' &&
                            (key === 'body' || key === 'html' || (strVal.includes('<') && strVal.includes('>')));

                          return (
                            <div
                              key={key}
                              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {key}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {typeof value}
                                </span>
                              </div>

                              {isHtml ? (
                                <div
                                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 prose dark:prose-invert max-w-none text-sm shadow-sm"
                                  dangerouslySetInnerHTML={{ __html: strVal }}
                                />
                              ) : (
                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200">
                                  {strVal}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No output fields rendered. Click Render Preview to compile.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <Play className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Ready to compile & render</p>
              <p className="text-[11px] max-w-xs">
                Provide test input variables in the JSON editor above, then click <strong>Render Preview</strong> to inspect the Model output.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
