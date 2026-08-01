import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { consumeAuthHandoff } from '@halal-basket/web';
import { useAuthStore } from './auth/auth-store';
import App from './App';
import './index.css';

document.documentElement.setAttribute('data-role', 'shop');

const handoff = consumeAuthHandoff();
if (handoff?.user.role === 'shop') {
  useAuthStore.getState().setSession(handoff);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function Root() {
  useEffect(() => {
    document.documentElement.setAttribute('data-role', 'shop');
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
