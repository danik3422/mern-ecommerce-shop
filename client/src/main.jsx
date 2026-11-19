import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			// retry network/server errors once, never client errors like 404
			retry: (failureCount, error) => failureCount < 1 && !(error.response?.status < 500),
		},
	},
})

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
)
