import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './contexts/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><AuthProvider><DataProvider><ToastProvider><App/></ToastProvider></DataProvider></AuthProvider></BrowserRouter></StrictMode>)
