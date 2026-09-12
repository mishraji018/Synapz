import { create } from 'zustand'

interface UIState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}

const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('vn_theme') as 'light' | 'dark') || 'light'

if (typeof document !== 'undefined') {
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useUIStore = create<UIState>((set) => ({
  theme: savedTheme,
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('vn_theme', newTheme)
    return { theme: newTheme }
  }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
