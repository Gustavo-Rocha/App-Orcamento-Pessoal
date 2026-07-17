'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  Receipt, 
  Tags, 
  PiggyBank, 
  LogOut 
} from 'lucide-react'

interface SidebarProps {
  user: {
    email?: string
    name?: string
    avatar_url?: string
  } | null
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: Receipt },
    { name: 'Categorias', href: '/categories', icon: Tags },
    { name: 'Orçamentos', href: '/budgets', icon: PiggyBank },
  ]

  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">
          <span>Antigravity Fin</span>
        </div>
        
        <nav>
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.href} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <Link href={item.href}>
                    <Icon size={20} />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        {user && (
          <div className="user-profile-info">
            <div className="user-avatar">
              {firstLetter}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name || 'Usuário'}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        )}
        <button onClick={handleSignOut} className="sidebar-btn">
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  )
}
