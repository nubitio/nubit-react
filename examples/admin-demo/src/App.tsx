import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AdminShell,
  AdminBottomNavigation,
  Combobox,
  CoreProvider,
  ResourceStoreProvider,
  ThemeProvider,
  ThemeSwitcher,
  createRestResourceStore,
  crudRoute,
  type AdminMenuItem,
} from '@nubitio/react-admin';
import { ShowcasePage } from './pages/ShowcasePage';
import { UsersPage } from './pages/UsersPage';
import { UsersDevExtremePage } from './pages/UsersDevExtremePage';
import { FieldTypesPage } from './pages/FieldTypesPage';
import { DashboardDemoPage } from './pages/DashboardDemoPage';
import { CatalogDemoPage } from './pages/CatalogDemoPage';

// JSONPlaceholder speaks the _page/_limit dialect and ignores unknown params.
const restResourceStore = createRestResourceStore({ pageParam: '_page', pageSizeParam: '_limit' });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const menu: AdminMenuItem[] = [
  { text: 'Dashboard', icon: 'ph ph-chart-line-up', path: '/dashboard' },
  { text: 'Catalog demo', icon: 'ph ph-package', path: '/catalog' },
  { text: 'UI Showcase', icon: 'ph ph-squares-four', path: '/showcase' },
  { text: 'Users (CRUD)', icon: 'ph ph-users', path: '/users' },
  { text: 'Users (DevExtreme)', icon: 'ph ph-table', path: '/users-dx' },
  { text: 'Field Types', icon: 'ph ph-list-bullets', path: '/fieldtypes' },
];

function DemoPageSearch() {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  return (
    <Combobox
      aria-label="Search demo pages"
      placeholder="Search demo pages"
      value={selectedPath}
      options={menu.map((item) => ({ value: item.path!, label: item.text }))}
      onChange={(path) => {
        setSelectedPath(path);
        if (path) navigate({ pathname: path, search: window.location.search });
      }}
    />
  );
}

export function App() {
  // Opt-in preview, leaving existing demo routes/screens unchanged by default.
  const nubitPreview = new URLSearchParams(window.location.search).get('visualStyle') === 'nubit';
  return (
    <QueryClientProvider client={queryClient}>
      <CoreProvider http={{ baseUrl: 'https://jsonplaceholder.typicode.com' }}>
        <ResourceStoreProvider factory={restResourceStore}>
          <ThemeProvider visualStyle={nubitPreview ? 'nubit' : 'default'}>
            <BrowserRouter>
              <AdminShell
                title="Nubit Demo"
                menuItems={menu}
                variant={nubitPreview ? 'workspace' : 'default'}
                brand={nubitPreview ? <strong>Nubit · Demo</strong> : undefined}
                headerContent={nubitPreview ? <DemoPageSearch /> : undefined}
                sidebarContext={
                  nubitPreview ? <span>Demo workspace · Main branch</span> : undefined
                }
                bottomNavigation={
                  nubitPreview ? (
                    <AdminBottomNavigation
                      items={menu
                        .filter((item) =>
                          ['/dashboard', '/showcase', '/users'].includes(item.path ?? ''),
                        )
                        .map((item) => ({ text: item.text, path: item.path!, icon: item.icon }))}
                    />
                  ) : undefined
                }
                renderThemeSwitcher={nubitPreview ? () => <ThemeSwitcher /> : undefined}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardDemoPage />} />
                  {crudRoute('/catalog', <CatalogDemoPage />)}
                  <Route path="/showcase" element={<ShowcasePage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users-dx" element={<UsersDevExtremePage />} />
                  <Route path="/fieldtypes" element={<FieldTypesPage />} />
                </Routes>
              </AdminShell>
            </BrowserRouter>
          </ThemeProvider>
        </ResourceStoreProvider>
      </CoreProvider>
    </QueryClientProvider>
  );
}
