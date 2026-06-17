import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AdminShell,
  CoreProvider,
  ResourceStoreProvider,
  ThemeProvider,
  createRestResourceStore,
  type AdminMenuItem,
} from '@nubitio/react-admin';
import { ShowcasePage } from './pages/ShowcasePage';
import { UsersPage } from './pages/UsersPage';
import { FieldTypesPage } from './pages/FieldTypesPage';

// JSONPlaceholder speaks the _page/_limit dialect and ignores unknown params.
const restResourceStore = createRestResourceStore({ pageParam: '_page', pageSizeParam: '_limit' });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const menu: AdminMenuItem[] = [
  { text: 'UI Showcase', icon: 'ph ph-squares-four', path: '/showcase' },
  { text: 'Users (CRUD)', icon: 'ph ph-users', path: '/users' },
  { text: 'Field Types', icon: 'ph ph-list-bullets', path: '/fieldtypes' },
];

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CoreProvider http={{ baseUrl: 'https://jsonplaceholder.typicode.com' }}>
        <ResourceStoreProvider factory={restResourceStore}>
        <ThemeProvider>
          <BrowserRouter>
            <AdminShell title="Nubit Demo" menuItems={menu}>
              <Routes>
                <Route path="/" element={<Navigate to="/showcase" replace />} />
                <Route path="/showcase" element={<ShowcasePage />} />
                <Route path="/users" element={<UsersPage />} />
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
