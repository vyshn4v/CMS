import React, { useState } from 'react';
import { TipTapEditor } from './TipTapEditor';
import { MonacoEditor } from './MonacoEditor';
import {
  Code2,
  Eye,
  Braces,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Type,
  HelpCircle,
} from 'lucide-react';
import { ContentTypeDto, ComponentDto, FieldDefinition, TemplateType } from '@cms/shared-types';
import { safeParseSchema } from '../../lib/utils';

interface DualModeEditorProps {
  content: string;
  onChange: (val: string) => void;
  templateType?: TemplateType;
  selectedSchema?: ContentTypeDto | null;
  components?: ComponentDto[];
  className?: string;
}

export const DualModeEditor: React.FC<DualModeEditorProps> = ({
  content,
  onChange,
  templateType,
  selectedSchema,
  components = [],
  className = '',
}) => {
  // If JSON, force code mode
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>(
    templateType === 'JSON' ? 'code' : 'code',
  );
  const [showVariableDrawer, setShowVariableDrawer] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const fields: FieldDefinition[] =
    safeParseSchema(selectedSchema?.schema).fields || [];

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 1800);

    // Also append snippet to the current content
    const updated = content ? `${content}\n${snippet}` : snippet;
    onChange(updated);
  };

  const defaultHelpers = [
    {
      name: 'Format Date',
      snippet: '{{formatDate createdAt "YYYY-MM-DD"}}',
      desc: 'Formats dates with Day.js',
      icon: Calendar,
    },
    {
      name: 'Uppercase',
      snippet: '{{uppercase title}}',
      desc: 'Converts text to UPPERCASE',
      icon: Type,
    },
    {
      name: 'Truncate',
      snippet: '{{truncate description 80}}',
      desc: 'Cuts text with an ellipsis',
      icon: Type,
    },
    {
      name: 'If Condition',
      snippet: '{{#if is_featured}}\n  <p>Featured Item</p>\n{{/if}}',
      desc: 'Conditional rendering',
      icon: HelpCircle,
    },
    {
      name: 'If Equals',
      snippet: '{{#ifEquals status "active"}}\n  <span>Active</span>\n{{/ifEquals}}',
      desc: 'Equality comparison',
      icon: HelpCircle,
    },
    {
      name: 'JSON Pretty Print',
      snippet: '{{json this}}',
      desc: 'Dumps data as formatted JSON',
      icon: Braces,
    },
  ];

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        {/* Visual vs Code Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
          {templateType !== 'JSON' && (
            <button
              type="button"
              onClick={() => setEditorMode('visual')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                editorMode === 'visual'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Visual (WYSIWYG)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setEditorMode('code')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              editorMode === 'code'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Code ({templateType === 'JSON' ? 'JSON' : 'HTML/Handlebars'})</span>
          </button>
        </div>

        {/* Variables Drawer Trigger */}
        <button
          type="button"
          onClick={() => setShowVariableDrawer(!showVariableDrawer)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            showVariableDrawer
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span>Insert Variables & Helpers</span>
        </button>
      </div>

      {/* Variables & Helpers Popover / Drawer */}
      {showVariableDrawer && (
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Braces className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Available Handlebars Tags
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              Click any tag to copy & append to editor
            </span>
          </div>

          {/* Schema-specific fields */}
          {selectedSchema ? (
            <div>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Fields from schema <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedSchema.name}</span>:
              </p>
              {fields.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No fields defined in this schema.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => {
                    const tag = `{{${f.name}}}`;
                    const isCopied = copiedSnippet === tag;

                    // If component, find component definition for subfield helpers
                    const isComponent = f.type === 'component';
                    const targetId = f.component?.componentId || (f as any).componentId;
                    const targetSlug = f.component?.componentSlug || (f as any).componentSlug;
                    const compDef = isComponent
                      ? components.find(
                          (c) =>
                            (targetId && c.id === targetId) ||
                            (targetSlug && c.slug === targetSlug),
                        )
                      : null;
                    const compFields = safeParseSchema(compDef?.schema).fields || [];

                    return (
                      <React.Fragment key={f.name}>
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(tag)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-700 dark:text-slate-200 shadow-sm hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                          <span>{tag}</span>
                          <span className="text-[10px] text-slate-400 font-sans">({f.type})</span>
                        </button>

                        {/* Component Subfields */}
                        {isComponent && compFields.map((cf: any) => {
                          const subTag = f.component?.repeatable
                            ? `{{#each ${f.name}}}{{this.${cf.name}}}{{/each}}`
                            : `{{${f.name}.${cf.name}}}`;
                          const isSubCopied = copiedSnippet === subTag;
                          return (
                            <button
                              key={`${f.name}.${cf.name}`}
                              type="button"
                              onClick={() => handleCopySnippet(subTag)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 px-2.5 py-1 text-xs font-mono text-violet-700 dark:text-violet-300 shadow-sm hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-200 transition"
                              title={`Insert subfield ${cf.name}`}
                            >
                              {isSubCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-violet-400" />}
                              <span>{subTag}</span>
                              <span className="text-[10px] text-slate-400 font-sans">({cf.type})</span>
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
              Select an associated <strong>Content Type</strong> above to inspect and insert schema-specific fields.
            </p>
          )}

          {/* Built-in Handlebars Helpers */}
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Built-in Helpers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {defaultHelpers.map((h) => {
                const isCopied = copiedSnippet === h.snippet;
                return (
                  <button
                    key={h.name}
                    type="button"
                    onClick={() => handleCopySnippet(h.snippet)}
                    className="flex flex-col items-start p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <h.icon className="h-3 w-3 text-indigo-500" />
                        {h.name}
                      </span>
                      {isCopied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                    <code className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1 line-clamp-1">
                      {h.snippet.split('\n')[0]}
                    </code>
                    <span className="text-[10px] text-slate-400 mt-0.5">{h.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Editor Body */}
      {editorMode === 'visual' && templateType !== 'JSON' ? (
        <TipTapEditor content={content} onChange={onChange} />
      ) : (
        <MonacoEditor
          value={content}
          onChange={onChange}
          language={templateType === 'JSON' ? 'json' : 'handlebars'}
          height="450px"
        />
      )}
    </div>
  );
};
