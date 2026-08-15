import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { CharacterDirectoryProvider } from './contexts/CharacterDirectoryContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CharacterDirectoryProvider>
        <App />
      </CharacterDirectoryProvider>
    </AuthProvider>
  </StrictMode>,
)
