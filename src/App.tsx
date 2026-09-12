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

export function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes wrapped in AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<NewNote />} />
        <Route path="/note/:noteId" element={<NoteDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/chat" element={<GlobalChat />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
