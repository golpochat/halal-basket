import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { consumeAuthHandoff } from '@halal-basket/web';
import { useAuthStore } from './auth/auth-store';
import App from './App';
import './index.css';

document.documentElement.setAttribute('data-role', 'admin');

const handoff = consumeAuthHandoff();
if (
  handoff?.user.role === 'admin' ||
  handoff?.user.role === 'super_admin'
) {
  useAuthStore.getState().setSession(handoff);
  document.documentElement.setAttribute(
    'data-role',
    handoff.user.role === 'super_admin' ? 'super_admin' : 'admin',
  );
} else {
  const existing = useAuthStore.getState().session;
  if (existing?.user.role === 'super_admin') {
    document.documentElement.setAttribute('data-role', 'super_admin');
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
