import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import LocationMapExplorer from './pages/LocationMapExplorer';
import BackendDebugger from './components/BackendDebugger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <InternetIdentityProvider>
        <QueryClientProvider client={queryClient}>
          <BackendDebugger />
          <LocationMapExplorer />
          <Toaster />
        </QueryClientProvider>
      </InternetIdentityProvider>
    </ThemeProvider>
  );
}

export default App;
