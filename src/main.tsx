import React from 'react'
import { createRoot } from 'react-dom/client'
import { FieldsProvider } from '@/contexts/FieldsContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <FieldsProvider>
    <App />
  </FieldsProvider>
);
