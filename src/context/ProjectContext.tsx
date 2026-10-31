import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectItem, InquiryItem, ServiceItem, SiteContent } from '../types';
import { INITIAL_SITE_CONTENT } from '../data/initialContent';
import { INITIAL_PROJECTS } from '../data/initialProjects';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProjectContextType {
  projects: ProjectItem[];
  addProject: (project: Omit<ProjectItem, 'id' | 'publishedAt'>) => Promise<void>;
  updateProject: (id: string, project: Partial<ProjectItem>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  exportData: () => void;
  importData: (jsonString: string) => Promise<boolean>;
  siteContent: SiteContent;
  updateSiteContent: (updated: Partial<SiteContent>) => Promise<void>;
  resetSiteContent: () => Promise<void>;
  inquiries: InquiryItem[];
  addInquiry: (inquiry: Omit<InquiryItem, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  currentView: 'portfolio' | 'admin';
  setCurrentView: (view: 'portfolio' | 'admin') => void;
  activeProjectModal: ProjectItem | null;
  openProjectModal: (project: ProjectItem) => void;
  closeProjectModal: () => void;
  activeServiceModal: ServiceItem | null;
  openServiceModal: (service: ServiceItem) => void;
  closeServiceModal: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isAdminAuthenticated: boolean;
  loginAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  isServerConnected: boolean;
  storageMode: string;
  isSupabaseConnected: boolean;
  syncStatus: 'synced' | 'saving' | 'error';
  lastSavedAt: string | null;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'grow_with_ayush_theme';

const DEFAULT_VISIBILITY = {
  showTitle: true,
  showSubtitle: true,
  showSummary: true,
  showCategoryBadge: true,
  showMetrics: true,
  showClientInfo: true,
  showCaseStudy: true,
  showTechniques: true,
  isPublished: true
};

const getInitialView = (): 'portfolio' | 'admin' => {
  if (typeof window === 'undefined') return 'portfolio';
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  if (hash === '#admin' || hash === '#/admin' || path === '/admin') {
    return 'admin';
  }
  return 'portfolio';
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation / Routing State
  const [currentView, setCurrentViewState] = useState<'portfolio' | 'admin'>(getInitialView);

  // Supabase Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Projects, Site Content & Inquiries loaded from Supabase
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state indicators
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Modals
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectItem | null>(null);
  const [activeServiceModal, setActiveServiceModal] = useState<ServiceItem | null>(null);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_THEME);
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {
        // ignore
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // Keep URL hash and currentView in sync
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#admin' || hash === '#/admin' || path === '/admin') {
        setCurrentViewState('admin');
      } else if (hash === '' || hash === '#' || hash === '#home' || hash === '#portfolio' || hash === '#about' || hash === '#services' || hash === '#contact') {
        setCurrentViewState('portfolio');
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const setCurrentView = (view: 'portfolio' | 'admin') => {
    setCurrentViewState(view);
    if (view === 'admin') {
      if (window.location.hash !== '#admin') {
        window.location.hash = 'admin';
      }
    } else {
      if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
        try {
          history.pushState(null, '', window.location.pathname);
        } catch {
          window.location.hash = '';
        }
      }
    }
  };

  // Sync theme with HTML DOM & localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  // Initialize Supabase Auth session & listen for changes
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setIsAdminAuthenticated(Boolean(data.session?.user));
      }
    }).catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsAdminAuthenticated(Boolean(session?.user));
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Fetch projects, content, and inquiries directly from Supabase
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);

      if (!isSupabaseConfigured) {
        if (mounted) {
          setProjects(INITIAL_PROJECTS);
          setSiteContent(INITIAL_SITE_CONTENT);
          setInquiries([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch Projects from 'projects' table (id text, data jsonb)
        const { data: projRows, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!projErr && projRows && projRows.length > 0) {
          if (mounted) {
            setProjects(projRows.map((row: any) => ({
              ...(row.data || {}),
              id: row.id,
              visibility: { ...DEFAULT_VISIBILITY, ...(row.data?.visibility || {}) }
            })));
          }
        } else {
          if (mounted) {
            setProjects(INITIAL_PROJECTS);
          }
          if (!projErr && (!projRows || projRows.length === 0)) {
            // Seed Supabase with initial projects if table is empty
            const seedRows = INITIAL_PROJECTS.map((p, index) => ({
              id: p.id,
              data: p,
              sort_order: index
            }));
            try {
              await supabase.from('projects').upsert(seedRows);
            } catch {
              // ignore seed error
            }
          }
        }

        // 2. Fetch Content from 'content' table (id text, data jsonb)
        const { data: contentRow, error: contentErr } = await supabase
          .from('content')
          .select('*')
          .eq('id', 'main')
          .maybeSingle();

        if (!contentErr && contentRow && contentRow.data) {
          if (mounted) {
            setSiteContent(prev => ({
              ...prev,
              ...contentRow.data,
              visibility: { ...(prev.visibility || {}), ...(contentRow.data?.visibility || {}) }
            }));
          }
        } else {
          if (mounted) {
            setSiteContent(INITIAL_SITE_CONTENT);
          }
          if (!contentErr && !contentRow) {
            try {
              await supabase.from('content').upsert({ id: 'main', data: INITIAL_SITE_CONTENT });
            } catch {
              // ignore seed error
            }
          }
        }

        // 3. Fetch Inquiries from 'inquiries' table
        const { data: inqRows, error: inqErr } = await supabase
          .from('inquiries')
          .select('*')
          .order('created_at', { ascending: false });

        if (!inqErr && inqRows && inqRows.length > 0) {
          if (mounted) {
            setInquiries(inqRows.map((r: any) => ({
              ...(r.data || {}),
              id: r.id || r.data?.id
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase data:', err);
        if (mounted) {
          setProjects(INITIAL_PROJECTS);
          setSiteContent(INITIAL_SITE_CONTENT);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Auth Functions
  const loginAdmin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured in environment variables.'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        setIsAdminAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Failed to authenticate user session.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login error occurred.' };
    }
  };

  const logoutAdmin = async () => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    setCurrentView('portfolio');
  };

  // Project CRUD Actions with Supabase (@supabase/supabase-js)
  const addProject = async (projectData: Omit<ProjectItem, 'id' | 'publishedAt'>) => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can add projects.');
      return;
    }

    setSyncStatus('saving');
    const newProject: ProjectItem = {
      ...projectData,
      id: `proj-${Date.now()}`,
      publishedAt: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase.from('projects').upsert({
      id: newProject.id,
      data: newProject,
      sort_order: Date.now()
    });

    if (!error) {
      setProjects(prev => [newProject, ...prev]);
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      console.error('Supabase add project error:', error);
      setSyncStatus('error');
    }
  };

  const updateProject = async (id: string, updates: Partial<ProjectItem>) => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can edit projects.');
      return;
    }

    setSyncStatus('saving');
    let updatedProject: ProjectItem | null = null;
    const nextProjects = projects.map(p => {
      if (p.id === id) {
        updatedProject = { ...p, ...updates, id };
        return updatedProject;
      }
      return p;
    });

    if (!updatedProject) {
      updatedProject = { ...updates, id } as ProjectItem;
      nextProjects.unshift(updatedProject);
    }

    setProjects(nextProjects);

    const { error } = await supabase.from('projects').upsert({
      id,
      data: updatedProject
    });

    if (!error) {
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      console.error('Supabase update project error:', error);
      setSyncStatus('error');
    }
  };

  const deleteProject = async (id: string) => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can delete projects.');
      return;
    }

    setSyncStatus('saving');
    setProjects(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (!error) {
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      console.error('Supabase delete project error:', error);
      setSyncStatus('error');
    }
  };

  const resetToDefaults = async () => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can reset projects.');
      return;
    }

    setSyncStatus('saving');
    const seedRows = INITIAL_PROJECTS.map((p, index) => ({
      id: p.id,
      data: p,
      sort_order: index
    }));

    await supabase.from('projects').delete().neq('id', '');
    const { error } = await supabase.from('projects').upsert(seedRows);

    if (!error) {
      setProjects(INITIAL_PROJECTS);
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      setSyncStatus('error');
    }
  };

  // Site Content CRUD with Supabase
  const updateSiteContent = async (updated: Partial<SiteContent>) => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can edit site content.');
      return;
    }

    setSyncStatus('saving');
    const merged: SiteContent = {
      ...siteContent,
      ...updated,
      visibility: { ...(siteContent.visibility || {}), ...(updated.visibility || {}) },
      about: updated.about ? { ...siteContent.about, ...updated.about } : siteContent.about,
      hero: updated.hero ? { ...siteContent.hero, ...updated.hero } : siteContent.hero,
      workflow: updated.workflow ? { ...siteContent.workflow, ...updated.workflow } : siteContent.workflow,
      contact: updated.contact ? { ...siteContent.contact, ...updated.contact } : siteContent.contact
    };

    setSiteContent(merged);

    const { error } = await supabase.from('content').upsert({ id: 'main', data: merged });

    if (!error) {
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      console.error('Supabase update content error:', error);
      setSyncStatus('error');
    }
  };

  const resetSiteContent = async () => {
    if (!isAdminAuthenticated) return;

    setSyncStatus('saving');
    const { error } = await supabase.from('content').upsert({ id: 'main', data: INITIAL_SITE_CONTENT });

    if (!error) {
      setSiteContent(INITIAL_SITE_CONTENT);
      setSyncStatus('synced');
      setLastSavedAt(new Date().toLocaleTimeString());
    } else {
      setSyncStatus('error');
    }
  };

  // Add Inquiry (Visitor Submission)
  const addInquiry = async (inquiryData: Omit<InquiryItem, 'id' | 'createdAt' | 'status'>) => {
    const newInquiry: InquiryItem = {
      ...inquiryData,
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new'
    };

    setInquiries(prev => [newInquiry, ...prev]);

    try {
      await supabase.from('inquiries').insert({
        id: newInquiry.id,
        data: newInquiry
      });
    } catch (err) {
      console.error('Supabase inquiry submission error:', err);
    }
  };

  // Backup Export / Import
  const exportData = () => {
    const bundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects,
      siteContent
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grow-with-ayush-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (jsonString: string): Promise<boolean> => {
    if (!isAdminAuthenticated) {
      alert('Unauthorized: Only logged-in admins can import backup data.');
      return false;
    }

    try {
      const parsed = JSON.parse(jsonString);
      const projsToImport = parsed.projects || (Array.isArray(parsed) ? parsed : null);
      const contentToImport = parsed.content || parsed.siteContent;

      if (Array.isArray(projsToImport) && projsToImport.length > 0) {
        const rows = projsToImport.map((p: ProjectItem, index: number) => ({
          id: p.id || `proj-${index}`,
          data: p,
          sort_order: index
        }));
        await supabase.from('projects').delete().neq('id', '');
        await supabase.from('projects').upsert(rows);
        setProjects(projsToImport);
      }

      if (contentToImport && typeof contentToImport === 'object') {
        await supabase.from('content').upsert({ id: 'main', data: contentToImport });
        setSiteContent(contentToImport);
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        addProject,
        updateProject,
        deleteProject,
        resetToDefaults,
        exportData,
        importData,
        siteContent,
        updateSiteContent,
        resetSiteContent,
        inquiries,
        addInquiry,
        currentView,
        setCurrentView,
        activeProjectModal,
        openProjectModal: p => setActiveProjectModal(p),
        closeProjectModal: () => setActiveProjectModal(null),
        activeServiceModal,
        openServiceModal: s => setActiveServiceModal(s),
        closeServiceModal: () => setActiveServiceModal(null),
        theme,
        toggleTheme,
        isAdminAuthenticated,
        loginAdmin,
        logoutAdmin,
        isServerConnected: true,
        storageMode: isSupabaseConfigured ? 'Supabase PostgreSQL Database' : 'Local Fallback (Set VITE_SUPABASE_URL)',
        isSupabaseConnected: isSupabaseConfigured,
        syncStatus,
        lastSavedAt,
        isLoading
      }}
    >
      {isLoading ? (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Loading portfolio from Supabase...</p>
        </div>
      ) : (
        children
      )}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};