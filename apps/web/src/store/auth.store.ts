import { create } from 'zustand';
import { UserDto } from '@cms/shared-types';

export interface OrganizationBasic {
  id: string;
  name: string;
  slug: string;
  role: string;
  permissions?: string[];
}

interface AuthState {
  user: UserDto | null;
  activeOrg: OrganizationBasic | null;
  organizations: OrganizationBasic[];
  isLoading: boolean;
  setUser: (user: UserDto | null) => void;
  setActiveOrg: (org: OrganizationBasic | null) => void;
  setOrganizations: (orgs: OrganizationBasic[]) => void;
  updateOrg: (org: Partial<OrganizationBasic> & { id: string }) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeOrg: null,
  organizations: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setActiveOrg: (activeOrg) => {
    if (activeOrg) {
      localStorage.setItem('cms_active_org_id', activeOrg.id);
    } else {
      localStorage.removeItem('cms_active_org_id');
    }
    set({ activeOrg });
  },
  setOrganizations: (organizations) => set({ organizations }),
  updateOrg: (updatedOrg) =>
    set((state) => {
      const organizations = state.organizations.map((org) =>
        org.id === updatedOrg.id ? { ...org, ...updatedOrg } : org,
      );
      const activeOrg =
        state.activeOrg?.id === updatedOrg.id
          ? { ...state.activeOrg, ...updatedOrg }
          : state.activeOrg;
      return { organizations, activeOrg };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('cms_active_org_id');
    set({ user: null, activeOrg: null, organizations: [] });
  },
}));
