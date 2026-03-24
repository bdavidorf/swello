import { Waves, BarChart2, Map, Bot, type LucideProps } from 'lucide-react'
import { useSpotStore, type MobileTab } from '../../store/spotStore'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

const TABS: { id: MobileTab; label: string; Icon: LucideIcon }[] = [
  { id: 'waves',    label: 'NOW',      Icon: Waves    },
  { id: 'forecast', label: 'FORECAST', Icon: BarChart2 },
  { id: 'spots',    label: 'MAP',      Icon: Map      },
  { id: 'ai',       label: 'AI',       Icon: Bot      },
]

export function MobileNav() {
  const { mobileTab, setMobileTab } = useSpotStore()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(20,18,16,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(240,226,200,0.08)',
      }}
    >
      <div className="grid grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const active = mobileTab === id
          return (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className="flex flex-col items-center justify-center gap-1 py-3 transition-colors"
              style={{ color: active ? '#E07A5F' : '#4A4440', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <Icon size={20} />
              <span style={{
                fontFamily: "'Syne', system-ui",
                fontWeight: 800,
                fontSize: 8,
                letterSpacing: '0.16em',
                color: active ? '#E07A5F' : '#4A4440',
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
