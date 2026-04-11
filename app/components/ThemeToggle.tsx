'use client'

import { useEffect, useState } from 'react'

type Theme = 'osrs' | 'dark-rpg'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('osrs')

  useEffect(() => {
    const stored = localStorage.getItem('sq-theme') as Theme | null
    if (stored === 'dark-rpg') {
      setTheme('dark-rpg')
    }
  }, [])

  function toggle() {
    const next: Theme = theme === 'osrs' ? 'dark-rpg' : 'osrs'
    setTheme(next)
    localStorage.setItem('sq-theme', next)
    if (next === 'dark-rpg') {
      document.documentElement.setAttribute('data-theme', 'dark-rpg')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'osrs' ? 'Switch to Dark RPG theme' : 'Switch to OSRS theme'}
      className="px-2 py-1 text-[10px] font-display font-bold uppercase tracking-wider transition-all"
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        boxShadow: 'inset 1px 1px 0 var(--border-highlight), inset -1px -1px 0 var(--border-shadow), 0 0 0 1px var(--border-mid)',
        borderRadius: '2px',
      }}
    >
      {theme === 'osrs' ? '◑ RPG' : '◐ OSRS'}
    </button>
  )
}
