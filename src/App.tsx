import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Dashboard } from '@/pages/Dashboard'
import { NewNote } from '@/pages/NewNote'
import { NoteDetail } from '@/pages/NoteDetail'
import { Search } from '@/pages/Search'
import { GlobalChat } from '@/pages/Chat'
import { BookmarksPage } from '@/pages/Bookmarks'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect } from 'react'

export function App() {
  const { user, initialized, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Routes>
      {/* Root redirect: if authenticated -> /dashboard, otherwise -> /login */}
      <Route
        path="/"
        element={
          initialized && user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public auth routes */}
      <Route path="/login" element={initialized && user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={initialized && user ? <Navigate to="/dashboard" replace /> : <Signup />} />

      {/* Protected routes wrapped in AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<NewNote />} />
        <Route path="/note/:noteId" element={<NoteDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/chat" element={<GlobalChat />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

