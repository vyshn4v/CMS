import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Boxes,
  Layers,
} from 'lucide-react';
import {
  ContentTypeDto,
  ComponentDto,
  TemplateType,
  RenderOutputData,
} from '@cms/shared-types';
import { safeParseSchema } from '../../lib/utils';

interface TemplatePreviewPaneProps {
  orgId: string;
  templateId?: string;
  templateType?: TemplateType;
  fieldsDraft?: Record<string, string>;
  bodyDraft: string;
  subjectDraft?: string;
  selectedSchema?: ContentTypeDto | null;
  components?: ComponentDto[];
}

export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  orgId,
  templateId,
  fieldsDraft,
  bodyDraft,
  subjectDraft,
  selectedSchema,
  components = [],
}) => {
  const [outputTab, setOutputTab] = useState<'visual' | 'json'>('visual');
  const [variablesJson, setVariablesJson] = useState<string>('{}');
  const [previewOutput, setPreviewOutput] = useState<RenderOutputData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Helper to generate realistic sample value based on field definition
  const generateFieldValue = (f: any): any => {
    const low = (f.name || '').toLowerCase();
    const label = f.label || f.name;

    if (f.type === 'number') {
      if (low.includes('price') || low.includes('amount') || low.includes('cost') || low.includes('total')) return 99.99;
      if (low.includes('age') || low.includes('count') || low.includes('quantity') || low.includes('qty')) return 5;
      if (low.includes('year')) return 2026;
      return 100;
    }
    if (f.type === 'boolean') {
      return true;
    }
    if (f.type === 'email') {
      return 'alex.doe@example.com';
    }
    if (f.type === 'date') {
      return new Date().toISOString().split('T')[0];
    }
    if (f.type === 'datetime') {
      return new Date().toISOString();
    }
    if (f.type === 'media') {
      return 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?w=800&auto=format&fit=crop';
    }
    if (f.type === 'enum' && Array.isArray(f.options) && f.options.length > 0) {
      return f.options[0];
    }
    if (f.type === 'json') {
      return { key: 'value', active: true };
    }

    // Text / Richtext / Default
    if (low.includes('title') || low.includes('heading')) return `Sample ${label}`;
    if (low.includes('name') || low.includes('author') || low.includes('user')) return 'Alex Doe';
    if (low.includes('desc') || low.includes('content') || low.includes('body') || low.includes('summary')) {
      return `This is a sample description for ${label}.`;
    }
    if (low.includes('url') || low.includes('link') || low.includes('website')) return 'https://example.com';
    if (low.includes('phone') || low.includes('tel')) return '+1 (555) 123-4567';
    if (low.includes('address') || low.includes('city') || low.includes('location')) return '742 Evergreen Terrace';

    return `Sample ${label}`;
  };

  // Automatically extracts variables and schema fields to generate realistic test payload
  const generateSampleData = useCallback(
    (forceReset = false) => {
      const sample: Record<string, any> = {};

      // 1. Populate based on selected schema fields first
      const parsedSchema = safeParseSchema(selectedSchema?.schema);
      const schemaFields: any[] = parsedSchema.fields || [];

      schemaFields.forEach((f: any) => {
        if (f.type === 'component') {
          const targetId = f.component?.componentId || (f as any).componentId;
          const targetSlug = f.component?.componentSlug || (f as any).componentSlug;
          const compDef = components.find(
            (c) =>
              (targetId && c.id === targetId) ||
              (targetSlug && c.slug === targetSlug) ||
              (c.id === targetId) ||
              (c.slug === targetSlug),
          );
          const compSchema = safeParseSchema(compDef?.schema);
          const compFields: any[] = compSchema.fields || [];
          const mockItem: Record<string, any> = {};

          if (compFields.length > 0) {
            compFields.forEach((cf: any) => {
              mockItem[cf.name] = generateFieldValue(cf);
            });
          } else {
            // If component definition is not yet available, generate helpful placeholders
            mockItem.name = 'Sample Item';
            mockItem.description = 'Dynamic component field payload';
          }

          if (f.component?.repeatable) {
            const secondItem: Record<string, any> = {};
            if (compFields.length > 0) {
              compFields.forEach((cf: any) => {
                const val = generateFieldValue(cf);
                if (typeof val === 'string' && !val.startsWith('http') && !val.includes('@')) {
                  secondItem[cf.name] = `${val} (Item 2)`;
                } else if (typeof val === 'number') {
                  secondItem[cf.name] = val + 10;
                } else {
                  secondItem[cf.name] = val;
                }
              });
            } else {
              secondItem.name = 'Sample Item 2';
              secondItem.description = 'Dynamic component field payload (Item 2)';
            }
            sample[f.name] = [mockItem, secondItem];
          } else {
            sample[f.name] = mockItem;
          }
        } else if (f.type === 'dynamiczone') {
          const allowedIds: string[] =
            f.dynamiczone?.allowedComponentIds ||
            (f as any).allowedComponentIds ||
            [];
          const matchedComps = components.filter(
            (c) => allowedIds.includes(c.id) || allowedIds.includes(c.slug),
          );

          if (matchedComps.length > 0) {
            sample[f.name] = matchedComps.map((comp) => {
              const compSchema = safeParseSchema(comp.schema);
              const blockFields: any[] = compSchema.fields || [];
              const blockItem: Record<string, any> = {
                __component: comp.slug,
              };
              if (blockFields.length > 0) {
                blockFields.forEach((bf: any) => {
                  blockItem[bf.name] = generateFieldValue(bf);
                });
              } else {
                blockItem.title = `${comp.name} Block`;
                blockItem.content = `Dynamic content for ${comp.name}`;
              }
              return blockItem;
            });
          } else {
            sample[f.name] = [
              { __component: 'hero', heading: 'Welcome to our platform', subtitle: 'Modern Headless CMS' },
            ];
          }
        } else {
          sample[f.name] = generateFieldValue(f);
        }
      });

      // 2. Scan formulas in fieldsDraft for any additional {{variable}} or {{component.field}} tags
      const regex = /\{\{([a-zA-Z0-9_\.]+)\}\}/g;
      const foundVars = new Set<string>();
      const reservedHelpers = new Set([
        'if',
        'else',
        'each',
        'unless',
        'with',
        'formatDate',
        'uppercase',
        'lowercase',
        'truncate',
        'json',
        'ifEquals',
        'this',
      ]);

      const scanTemplate = (tpl?: string) => {
        if (!tpl) return;
        let match;
        while ((match = regex.exec(tpl)) !== null) {
          const varPath = match[1];
          if (varPath) {
            const topVar = varPath.split('.')[0];
            if (!reservedHelpers.has(topVar)) {
              foundVars.add(varPath);
            }
          }
        }
      };

      if (fieldsDraft) {
        Object.values(fieldsDraft).forEach(scanTemplate);
      }
      scanTemplate(bodyDraft);
      scanTemplate(subjectDraft);

      foundVars.forEach((path) => {
        const parts = path.split('.');
        if (parts.length === 1) {
          const v = parts[0];
          if (sample[v] === undefined) {
            sample[v] = generateFieldValue({ name: v, type: 'text' });
          }
        } else if (parts.length === 2 && parts[0] !== 'this') {
          const [parent, child] = parts;
          if (!sample[parent] || typeof sample[parent] !== 'object' || Array.isArray(sample[parent])) {
            if (!sample[parent]) sample[parent] = {};
          }
          if (typeof sample[parent] === 'object' && !Array.isArray(sample[parent])) {
            if (sample[parent][child] === undefined) {
              sample[parent][child] = generateFieldValue({ name: child, type: 'text' });
            }
          }
        }
      });

      if (Object.keys(sample).length === 0) {
        sample.title = 'Sample Document';
        sample.content = 'Welcome to the template rendering engine!';
      }

      if (forceReset) {
        setVariablesJson(JSON.stringify(sample, null, 2));
        return;
      }

      // If current variablesJson is empty or default empty object, replace it
      setVariablesJson((prev) => {
        const trimmed = prev.trim();
        if (!trimmed || trimmed === '{}' || trimmed === '{\n}') {
          return JSON.stringify(sample, null, 2);
        }
        // Merge: keep user's existing values and fill in any newly discovered fields
        try {
          const current = JSON.parse(prev);
          const merged = { ...sample, ...current };
          return JSON.stringify(merged, null, 2);
        } catch {
          return prev;
        }
      });
    },
    [selectedSchema, components, fieldsDraft, bodyDraft, subjectDraft],
  );

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
        variables: parsedVariables,
        contentTypeId: selectedSchema?.id,
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

  // Automatically initialize / update sample test data when schema or components change
  useEffect(() => {
    generateSampleData();
  }, [selectedSchema, components]);

  // Detected components and dynamic zones from the active schema
  const parsedActiveSchema = useMemo(
    () => safeParseSchema(selectedSchema?.schema),
    [selectedSchema],
  );
  const activeSchemaFields: any[] = useMemo(
    () => parsedActiveSchema.fields || [],
    [parsedActiveSchema],
  );

  interface DetectedComponentInfo {
    fieldName: string;
    componentName: string;
    repeatable: boolean;
    subfieldsCount: number;
    subfieldNames: string[];
  }

  interface DetectedDynamicZoneInfo {
    fieldName: string;
    label: string;
    allowedCount: number;
    allowedNames: string[];
  }

  const detectedComponents: DetectedComponentInfo[] = useMemo(() => {
    return activeSchemaFields
      .filter((f: any) => f.type === 'component')
      .map((f: any) => {
        const targetId = f.component?.componentId || f.componentId;
        const targetSlug = f.component?.componentSlug || f.componentSlug;
        const compDef = components.find(
          (c) =>
            (targetId && c.id === targetId) ||
            (targetSlug && c.slug === targetSlug),
        );
        const compSchema = safeParseSchema(compDef?.schema);
        const subfields: any[] = compSchema.fields || [];
        return {
          fieldName: f.name,
          componentName: compDef?.name || targetSlug || 'Component',
          repeatable: Boolean(f.component?.repeatable),
          subfieldsCount: subfields.length,
          subfieldNames: subfields.map((sf: any) => sf.name),
        };
      });
  }, [activeSchemaFields, components]);

  const detectedDynamicZones: DetectedDynamicZoneInfo[] = useMemo(() => {
    return activeSchemaFields
      .filter((f: any) => f.type === 'dynamiczone')
      .map((f: any) => {
        const allowedIds: string[] =
          f.dynamiczone?.allowedComponentIds ||
          f.allowedComponentIds ||
          [];
        const matchedComps = components.filter(
          (c) => allowedIds.includes(c.id) || allowedIds.includes(c.slug),
        );
        return {
          fieldName: f.name,
          label: f.label || f.name,
          allowedCount: matchedComps.length,
          allowedNames: matchedComps.map((c) => c.name),
        };
      });
  }, [activeSchemaFields, components]);


  const outputData: Record<string, any> =
    (previewOutput as any)?.data ||
    (previewOutput as any)?.output ||
    (previewOutput as any)?.payload ||
    (previewOutput ? (previewOutput as any) : {});

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(outputData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  if (!selectedSchema) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[420px] text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
          <Database className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Please select one model to continue
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          Select an Output Model to configure dynamic input payloads and view the live rendered preview.
        </p>
      </div>
    );
  }

  const fieldEntries = Object.entries(outputData);

  return (
    <div className="flex flex-col space-y-4 pb-10">
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
              onClick={() => generateSampleData(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              title="Reset payload to fresh schema defaults"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => generateSampleData(false)}
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

        {/* Auto-mapped Component & Dynamic Zone Badges */}
        {(detectedComponents.length > 0 || detectedDynamicZones.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-medium text-slate-400 mr-0.5">Dynamic Fields:</span>
            {detectedComponents.map((c) => (
              <span
                key={c.fieldName}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                title={`Subfields: ${c.subfieldNames.join(', ') || 'none'}`}
              >
                <Boxes className="h-3 w-3 text-violet-500" />
                <span>{c.fieldName}</span>
                <span className="text-[9px] text-violet-500 font-sans">
                  ({c.subfieldsCount} {c.subfieldsCount === 1 ? 'subfield' : 'subfields'}{c.repeatable ? ', list' : ''})
                </span>
              </span>
            ))}
            {detectedDynamicZones.map((dz) => (
              <span
                key={dz.fieldName}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                title={`Allowed components: ${dz.allowedNames.join(', ') || 'none'}`}
              >
                <Layers className="h-3 w-3 text-emerald-500" />
                <span>{dz.fieldName}</span>
                <span className="text-[9px] text-emerald-500 font-sans">
                  ({dz.allowedCount} {dz.allowedCount === 1 ? 'block' : 'blocks'})
                </span>
              </span>
            ))}
          </div>
        )}

        <div>
          <textarea
            rows={5}
            value={variablesJson}
            onChange={(e) => setVariablesJson(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder='{ "title": "My Title", "content": "My Content" }'
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Output Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Model Output: {selectedSchema ? selectedSchema.name : 'Template Output'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {fieldEntries.length > 0 ? `${fieldEntries.length} ${fieldEntries.length === 1 ? 'field' : 'fields'}` : 'Ready'}
            </span>
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
                Visual Render
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
                JSON Output
              </button>
            </div>
          )}
        </div>

        {/* Output Content Area */}
        <div className="p-4">
          {previewOutput ? (
            <div className="space-y-4">
              {/* Tab 1: Output JSON */}
              {outputTab === 'json' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Compiled Model Payload:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        200 OK
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition"
                      >
                        {copiedJson ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                  </div>
                  <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
                    {JSON.stringify(outputData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Tab 2: Visual Render Tab */}
              {outputTab === 'visual' && (() => {
                if (fieldEntries.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No rendered output returned.
                    </div>
                  );
                }

                // If Model has exactly 1 field
                if (fieldEntries.length === 1) {
                  const [fieldName, val] = fieldEntries[0];
                  const strVal = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
                  const isHtml =
                    typeof val === 'string' &&
                    ((strVal.includes('<') && strVal.includes('>')) ||
                      fieldName.toLowerCase().includes('html') ||
                      fieldName.toLowerCase().includes('body') ||
                      fieldName.toLowerCase().includes('content'));

                  return (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        <div className="bg-slate-100/80 dark:bg-slate-900/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                            </div>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 ml-1">
                              Output: <strong className="text-indigo-600 dark:text-indigo-400">{fieldName}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
                            {isHtml ? 'Compiled HTML' : 'Text Output'}
                          </span>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-950 min-h-[280px]">
                          {isHtml ? (
                            <div
                              className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: strVal }}
                            />
                          ) : (
                            <p className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {strVal}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // If Model has multiple fields
                const htmlFields = fieldEntries.filter(
                  ([k, v]) =>
                    typeof v === 'string' &&
                    ((v.includes('<') && v.includes('>')) ||
                      k.toLowerCase().includes('html') ||
                      k.toLowerCase().includes('body') ||
                      k.toLowerCase().includes('content'))
                );
                const textFields = fieldEntries.filter(
                  ([k, v]) =>
                    !(
                      typeof v === 'string' &&
                      ((v.includes('<') && v.includes('>')) ||
                        k.toLowerCase().includes('html') ||
                        k.toLowerCase().includes('body') ||
                        k.toLowerCase().includes('content'))
                    )
                );

                return (
                  <div className="space-y-4">
                    {/* Rendered Text/Metadata Fields with strictly aligned 2-column grid */}
                    {textFields.length > 0 && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Output Fields ({textFields.length})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">key-value output</span>
                        </div>
                        <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {textFields.map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[130px_1fr] items-center px-4 py-2.5 text-xs">
                              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 truncate pr-2">
                                {k}:
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-100 break-words">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rendered HTML Visual Canvases */}
                    {htmlFields.map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm"
                      >
                        <div className="bg-slate-100/80 dark:bg-slate-900/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                            </div>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 ml-1">
                              HTML Document: <strong className="text-indigo-600 dark:text-indigo-400">{k}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
                            Compiled HTML
                          </span>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-950 min-h-[240px]">
                          <div
                            className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: String(v) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <Play className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Ready to compile & render</p>
              <p className="text-[11px] max-w-xs text-slate-400">
                Provide test input variables in the JSON editor above, then click <strong>Render Preview</strong> to inspect the Model output.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
