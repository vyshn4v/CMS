import React, { useState } from 'react';
import {
  Copy,
  Check,
  Search,
  Code2,
  Terminal,
  Shield,
  Key,
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

interface EndpointParam {
  name: string;
  in: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
}

interface EndpointDoc {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: 'Render' | 'Content' | 'Schemas' | 'Components' | 'Templates' | 'API Keys' | 'Auth' | 'Orgs' | 'Audit';
  title: string;
  description: string;
  permission?: string;
  authType: 'API Key' | 'User JWT' | 'Public';
  params?: EndpointParam[];
  requestBody?: any;
  responseBody?: any;
}

export const ApiDocsPage: React.FC = () => {
  const { activeOrg } = useAuthStore();
  const orgId = activeOrg?.id || 'YOUR_ORG_ID';
  const baseUrl = window.location.origin.includes('5173')
    ? 'http://localhost:5000/api/v1'
    : `${window.location.origin}/api/v1`;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    'render-post': true,
    'content-list': true,
    'content-create': true,
  });

  const toggleExpand = (id: string) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    'All',
    'Render',
    'Content',
    'Schemas',
    'Components',
    'Templates',
    'API Keys',
    'Auth',
    'Orgs',
    'Audit',
  ];

  const endpoints: EndpointDoc[] = [
    {
      id: 'render-post',
      method: 'POST',
      path: '/render',
      category: 'Render',
      title: 'Render Published Template (Public Delivery API)',
      description:
        'Executes the Handlebars rendering engine against a published template or target schema using dynamic caller input data. Authenticated via organization-scoped delivery API keys.',
      authType: 'API Key',
      permission: 'API Key Bearer Token (sk_live_...)',
      requestBody: {
        schemaId: 'c1f6b860-23ef-4899-b1d5-bc9eb8907fcb',
        data: {
          customerName: 'Alice Smith',
          invoiceNumber: 'INV-2026-001',
          amount: 499.0,
          dueDate: '2026-10-01',
        },
      },
      responseBody: {
        status: 200,
        data: {
          rendered: {
            subject: 'Invoice INV-2026-001 Due Soon',
            html: '<html><body><h2>Invoice for Alice Smith</h2><p>Amount: $499.00</p></body></html>',
          },
          template: {
            id: '7b8e1f0c-4d3a-4b2e-9c1a-8f0b7e6d5c4b',
            name: 'Invoice Notification',
            type: 'EMAIL',
          },
          model: {
            id: 'c1f6b860-23ef-4899-b1d5-bc9eb8907fcb',
            name: 'Invoice Model',
          },
        },
      },
    },
    {
      id: 'content-list',
      method: 'GET',
      path: `/orgs/${orgId}/content/:slug`,
      category: 'Content',
      title: 'List Content Entries',
      description:
        'Retrieves paginated content records for a specific Content Type. Accepts either the content model slug (e.g., articles) or immutable schemaId.',
      authType: 'User JWT',
      permission: 'content.read',
      params: [
        { name: 'slug', in: 'path', type: 'string', required: true, description: 'Model API slug or UUID' },
        { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number (default: 1)' },
        { name: 'limit', in: 'query', type: 'number', required: false, description: 'Items per page (default: 20)' },
        { name: 'status', in: 'query', type: 'string', required: false, description: 'Filter: DRAFT or PUBLISHED' },
        { name: 'search', in: 'query', type: 'string', required: false, description: 'Keyword search query' },
      ],
      responseBody: {
        status: 200,
        data: {
          items: [
            {
              id: '50e18146-c77c-485a-8b1b-fb7ba036a18d',
              slug: 'welcome-guide',
              status: 'PUBLISHED',
              data: { title: 'Welcome Guide', author: 'Jane Doe' },
              createdAt: '2026-09-16T12:00:00.000Z',
              updatedAt: '2026-09-16T12:10:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
    {
      id: 'content-create',
      method: 'POST',
      path: `/orgs/${orgId}/content/:slug`,
      category: 'Content',
      title: 'Create Content Entry',
      description:
        'Creates a new draft content entry. Fields are automatically validated against the Content Type Zod schema.',
      authType: 'User JWT',
      permission: 'content.create',
      params: [
        { name: 'slug', in: 'path', type: 'string', required: true, description: 'Model API slug or UUID' },
      ],
      requestBody: {
        data: {
          title: 'Product Announcement',
          summary: 'New release is now live.',
          publishedDate: '2026-09-16',
        },
        publish: false,
      },
      responseBody: {
        status: 201,
        data: {
          id: '50e18146-c77c-485a-8b1b-fb7ba036a18d',
          status: 'DRAFT',
          data: { title: 'Product Announcement' },
        },
      },
    },
    {
      id: 'content-publish',
      method: 'POST',
      path: `/orgs/${orgId}/content/:slug/:id/publish`,
      category: 'Content',
      title: 'Publish Content Entry',
      description:
        'Takes an immutable snapshot of the entry draft data into publishedData, flips status to PUBLISHED, and purges the delivery cache.',
      authType: 'User JWT',
      permission: 'content.publish',
      params: [
        { name: 'slug', in: 'path', type: 'string', required: true, description: 'Model slug' },
        { name: 'id', in: 'path', type: 'string', required: true, description: 'Entry UUID' },
      ],
      responseBody: {
        status: 200,
        data: {
          id: '50e18146-c77c-485a-8b1b-fb7ba036a18d',
          status: 'PUBLISHED',
        },
      },
    },
    {
      id: 'schemas-list',
      method: 'GET',
      path: `/orgs/${orgId}/schemas`,
      category: 'Schemas',
      title: 'List Content Types (Schemas)',
      description: 'Returns all defined structured models within the organization.',
      authType: 'User JWT',
      permission: 'schema.read',
      responseBody: {
        status: 200,
        data: [
          {
            id: 'c1f6b860-23ef-4899-b1d5-bc9eb8907fcb',
            name: 'Blog Article',
            slug: 'blog-articles',
            kind: 'COLLECTION',
            schema: { fields: [] },
          },
        ],
      },
    },
    {
      id: 'schemas-create',
      method: 'POST',
      path: `/orgs/${orgId}/schemas`,
      category: 'Schemas',
      title: 'Create Content Type Schema',
      description:
        'Defines a new structured data model with typed fields (text, richtext, number, date, relation, component, dynamiczone).',
      authType: 'User JWT',
      permission: 'schema.create',
      requestBody: {
        name: 'Hero Section',
        slug: 'hero-section',
        kind: 'SINGLE',
        schema: {
          fields: [
            { name: 'headline', label: 'Headline', type: 'text', required: true },
            { name: 'subheadline', label: 'Subheadline', type: 'text' },
          ],
        },
      },
      responseBody: {
        status: 201,
        data: {
          id: 'c1f6b860-23ef-4899-b1d5-bc9eb8907fcb',
          name: 'Hero Section',
        },
      },
    },
    {
      id: 'components-list',
      method: 'GET',
      path: `/orgs/${orgId}/components`,
      category: 'Components',
      title: 'List Reusable Components',
      description: 'Fetches modular component definitions organized by category.',
      authType: 'User JWT',
      permission: 'schema.read',
      responseBody: {
        status: 200,
        data: [
          {
            id: '8a9c2d1e-4b5f-6a7b-8c9d-0e1f2a3b4c5d',
            name: 'SEO Metadata',
            slug: 'seo-metadata',
            category: 'default',
            schema: { fields: [] },
          },
        ],
      },
    },
    {
      id: 'templates-list',
      method: 'GET',
      path: `/orgs/${orgId}/templates`,
      category: 'Templates',
      title: 'List Templates',
      description:
        'Retrieves Handlebars templates with filters for target model, output format (EMAIL, HTML_PAGE, JSON), or status.',
      authType: 'User JWT',
      permission: 'template.read',
      params: [
        { name: 'contentTypeId', in: 'query', type: 'string', required: false, description: 'Target Model UUID' },
        { name: 'type', in: 'query', type: 'string', required: false, description: 'EMAIL | HTML_PAGE | JSON' },
      ],
      responseBody: {
        status: 200,
        data: [],
      },
    },
    {
      id: 'api-keys-create',
      method: 'POST',
      path: `/orgs/${orgId}/api-keys`,
      category: 'API Keys',
      title: 'Generate API Key',
      description:
        'Generates an organization delivery API key. The plaintext token is returned only in this response.',
      authType: 'User JWT',
      permission: 'apikey.create',
      requestBody: {
        name: 'Mobile App Delivery Key',
      },
      responseBody: {
        status: 201,
        data: {
          id: '0d2c94bb-d45c-44ec-9c41-26ec0a38f4d9',
          name: 'Mobile App Delivery Key',
          prefix: 'sk_live_4f9d',
          key: 'sk_live_<your_generated_key>',
        },
      },
    },
    {
      id: 'audit-logs-list',
      method: 'GET',
      path: `/orgs/${orgId}/audit-logs`,
      category: 'Audit',
      title: 'Query Activity Audit Trail',
      description:
        'Inspects mutating operations across the organization with IP, actor, resource ID, and delta payloads.',
      authType: 'User JWT',
      permission: 'audit.read',
      params: [
        { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number' },
        { name: 'action', in: 'query', type: 'string', required: false, description: 'Filter: CREATE, UPDATE, DELETE, PUBLISH' },
        { name: 'resourceType', in: 'query', type: 'string', required: false, description: 'SCHEMA, CONTENT_ENTRY, etc.' },
      ],
      responseBody: {
        status: 200,
        data: {
          items: [],
          total: 0,
        },
      },
    },
    {
      id: 'auth-me',
      method: 'GET',
      path: '/auth/me',
      category: 'Auth',
      title: 'Get User Session & Permissions',
      description: 'Returns profile details, active organization memberships, and granted permissions.',
      authType: 'User JWT',
      responseBody: {
        status: 200,
        data: {
          user: { id: '...', email: 'user@example.com', name: 'User' },
          organizations: [{ id: orgId, name: 'Acme', role: 'Super Admin', permissions: ['*'] }],
        },
      },
    },
  ];

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(search.toLowerCase()) ||
      ep.path.toLowerCase().includes(search.toLowerCase()) ||
      ep.method.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ep.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'POST':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'PATCH':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-900';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const generateCurl = (ep: EndpointDoc) => {
    const url = `${baseUrl}${ep.path}`;
    let curl = `curl -X ${ep.method} "${url}" \\\n`;

    if (ep.authType === 'API Key') {
      curl += `  -H "Authorization: Bearer sk_live_your_api_key" \\\n`;
    } else {
      curl += `  -H "Authorization: Bearer <your_jwt_token>" \\\n`;
    }

    if (ep.requestBody) {
      curl += `  -H "Content-Type: application/json" \\\n`;
      curl += `  -d '${JSON.stringify(ep.requestBody, null, 2)}'`;
    }

    return curl;
  };

  const downloadOpenApiSpec = () => {
    const link = document.createElement('a');
    link.href = '/openapi.json';
    link.download = 'openapi.json';
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            Developer Hub & Reference
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            REST API Documentation
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl leading-relaxed">
            Integrate your Jamstack frontends, mobile clients, and backend services directly with the CMS Headless content delivery engine.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-indigo-400/20 px-3 py-1.5 rounded-lg text-xs font-mono text-indigo-100">
              <Terminal className="h-3.5 w-3.5 text-indigo-400" />
              <span>Base URL:</span>
              <code className="text-indigo-300 font-semibold">{baseUrl}</code>
              <button
                onClick={() => handleCopy(baseUrl, 'base-url')}
                className="hover:text-white transition ml-1"
                title="Copy Base URL"
              >
                {copiedId === 'base-url' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-indigo-400/20 px-3 py-1.5 rounded-lg text-xs font-mono text-indigo-100">
              <Key className="h-3.5 w-3.5 text-indigo-400" />
              <span>Active Org ID:</span>
              <code className="text-indigo-300 font-semibold truncate max-w-[120px] sm:max-w-none">
                {orgId}
              </code>
              <button
                onClick={() => handleCopy(orgId, 'org-id')}
                className="hover:text-white transition ml-1"
                title="Copy Organization ID"
              >
                {copiedId === 'org-id' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={downloadOpenApiSpec}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition ml-auto"
            >
              <Download className="h-3.5 w-3.5" />
              OpenAPI Spec
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter endpoints by title, path, or HTTP method (e.g. /render, POST, schemas)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Code2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No matching endpoints found
            </p>
            <p className="text-xs text-slate-400 mt-1">Try refining your search keyword or category filter.</p>
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isExpanded = Boolean(expandedEndpoints[ep.id]);
            const curlCode = generateCurl(ep);

            return (
              <div
                key={ep.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(ep.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition flex items-center justify-between gap-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-md border ${getMethodBadgeClass(
                        ep.method,
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ep.path}
                    </span>
                    <span className="text-xs text-slate-500 font-medium hidden md:inline">
                      — {ep.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {ep.permission && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Shield className="h-3 w-3 text-indigo-500" />
                        {ep.permission}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5 bg-slate-50/40 dark:bg-slate-950/20 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                      {ep.description}
                    </p>

                    {/* Parameters Table */}
                    {ep.params && ep.params.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                          Parameters
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="p-2.5">Name</th>
                                <th className="p-2.5">In</th>
                                <th className="p-2.5">Type</th>
                                <th className="p-2.5">Required</th>
                                <th className="p-2.5">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                              {ep.params.map((p) => (
                                <tr key={p.name}>
                                  <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                                    {p.name}
                                  </td>
                                  <td className="p-2.5 text-slate-500">{p.in}</td>
                                  <td className="p-2.5 text-slate-500">{p.type}</td>
                                  <td className="p-2.5">
                                    {p.required ? (
                                      <span className="text-red-500 font-bold">Yes</span>
                                    ) : (
                                      <span className="text-slate-400">No</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">
                                    {p.description}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request Payload / Response Tabs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {ep.requestBody && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
                              Request Body (JSON)
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(JSON.stringify(ep.requestBody, null, 2), `${ep.id}-req`)
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition"
                            >
                              {copiedId === `${ep.id}-req` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>Copy JSON</span>
                            </button>
                          </div>
                          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                            {JSON.stringify(ep.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}

                      {ep.responseBody && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
                              Sample 200 Response
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(JSON.stringify(ep.responseBody, null, 2), `${ep.id}-res`)
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition"
                            >
                              {copiedId === `${ep.id}-res` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>Copy JSON</span>
                            </button>
                          </div>
                          <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                            {JSON.stringify(ep.responseBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* cURL Snippet */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 text-indigo-500" />
                          Ready-to-Run cURL
                        </span>
                        <button
                          onClick={() => handleCopy(curlCode, `${ep.id}-curl`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-semibold transition"
                        >
                          {copiedId === `${ep.id}-curl` ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Command</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 bg-slate-950 text-indigo-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800/80 leading-relaxed">
                        {curlCode}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Handlebars Reference Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <FileCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Handlebars Template Engine Helpers
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          These custom helpers can be embedded in template drafts and are evaluated dynamically during rendering:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">formatDate</span>
            <p className="text-[11px] text-slate-500">
              <code>&#123;&#123;formatDate date "YYYY-MM-DD"&#125;&#125;</code>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">uppercase / lowercase</span>
            <p className="text-[11px] text-slate-500">
              <code>&#123;&#123;uppercase name&#125;&#125;</code>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">truncate</span>
            <p className="text-[11px] text-slate-500">
              <code>&#123;&#123;truncate summary 50&#125;&#125;</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
