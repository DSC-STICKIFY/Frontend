import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ProductsProvider } from './context/ProductsContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

const root = createRoot(document.getElementById('root'))

// Get Client ID from .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ProductsProvider>
        <App />
      </ProductsProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)