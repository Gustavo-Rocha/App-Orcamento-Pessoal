import '@testing-library/jest-dom'
import React from 'react'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
    }
  },
  usePathname() {
    return '/dashboard'
  },
}))

// Mock next/link using React.createElement to keep file clean TS (no JSX)
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, any>(
    ({ children, href, ...props }, ref) => {
      return React.createElement('a', { ref, href, ...props }, children)
    }
  ),
}))

// A reusable mock query builder supporting infinite chaining
const mockQueryBuilder: any = {
  select: vi.fn().mockImplementation(() => mockQueryBuilder),
  insert: vi.fn().mockImplementation(() => mockQueryBuilder),
  update: vi.fn().mockImplementation(() => mockQueryBuilder),
  delete: vi.fn().mockImplementation(() => mockQueryBuilder),
  upsert: vi.fn().mockImplementation(() => mockQueryBuilder),
  eq: vi.fn().mockImplementation(() => mockQueryBuilder),
  gte: vi.fn().mockImplementation(() => mockQueryBuilder),
  lte: vi.fn().mockImplementation(() => mockQueryBuilder),
  order: vi.fn().mockImplementation(() => mockQueryBuilder),
  single: vi.fn().mockImplementation(() => mockQueryBuilder),
  onConflict: vi.fn().mockImplementation(() => mockQueryBuilder),
  then: vi.fn().mockImplementation((cb: any) => cb({ data: [], error: null })),
}

// Mock Supabase Auth SSR
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { name: 'Gustavo' } } }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: {} }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signUp: vi.fn(async () => ({ data: { user: {} }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => mockQueryBuilder),
  })),
  createServerClient: vi.fn(() => ({})),
}))

// Mock Lucide icons
vi.mock('lucide-react', async () => {
  return {
    LayoutDashboard: () => React.createElement('span', null, 'LayoutDashboard'),
    Receipt: () => React.createElement('span', null, 'Receipt'),
    Tags: () => React.createElement('span', null, 'Tags'),
    PiggyBank: () => React.createElement('span', null, 'PiggyBank'),
    LogOut: () => React.createElement('span', null, 'LogOut'),
    Plus: () => React.createElement('span', null, 'Plus'),
    Edit2: () => React.createElement('span', null, 'Edit2'),
    Trash2: () => React.createElement('span', null, 'Trash2'),
    Calendar: () => React.createElement('span', null, 'Calendar'),
    Search: () => React.createElement('span', null, 'Search'),
    Filter: () => React.createElement('span', null, 'Filter'),
    ArrowUpRight: () => React.createElement('span', null, 'ArrowUpRight'),
    ArrowDownRight: () => React.createElement('span', null, 'ArrowDownRight'),
    Wallet: () => React.createElement('span', null, 'Wallet'),
    Chrome: () => React.createElement('span', null, 'Chrome'),
    X: () => React.createElement('span', null, 'X'),
    Save: () => React.createElement('span', null, 'Save'),
  }
})

// Mock Recharts to prevent width/height render issues under jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', { className: 'recharts-responsive-container' }, children),
  PieChart: ({ children }: any) => React.createElement('div', { className: 'recharts-pie-chart' }, children),
  Pie: ({ children }: any) => React.createElement('div', null, children),
  Cell: () => React.createElement('div', null),
  Tooltip: () => React.createElement('div', null),
  Legend: () => React.createElement('div', null),
  BarChart: ({ children }: any) => React.createElement('div', { className: 'recharts-bar-chart' }, children),
  Bar: () => React.createElement('div', null),
  XAxis: () => React.createElement('div', null),
  YAxis: () => React.createElement('div', null),
  CartesianGrid: () => React.createElement('div', null),
}))
