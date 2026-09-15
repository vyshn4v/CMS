import React from 'react';
import { PlaceholderPage } from '../common/PlaceholderPage';

export const ContentPage: React.FC = () => (
  <PlaceholderPage
    title="Content Management"
    description="Browse, create, edit, and publish entries for your collection and single types."
    phase="Phase 4"
  />
);

export const SchemasPage: React.FC = () => (
  <PlaceholderPage
    title="Schema Builder"
    description="Visually design content types with typed fields, validations, relations, and components."
    phase="Phase 3"
  />
);

export const TemplatesPage: React.FC = () => (
  <PlaceholderPage
    title="Template Studio"
    description="Dual-mode TipTap WYSIWYG and Monaco code editor for Handlebars email and HTML generation."
    phase="Phase 5"
  />
);

export const SettingsPage: React.FC = () => (
  <PlaceholderPage
    title="Organization Settings & API Keys"
    description="Manage team members, RBAC custom roles, and issue org-scoped API keys for the /render endpoint."
    phase="Phase 2 & Phase 6"
  />
);
