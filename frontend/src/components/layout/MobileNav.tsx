import clsx from 'clsx'
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(9,16,26,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(26,48,80,0.60)',
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
              style={{ color: active ? '#1AFFD0' : '#3A5870' }}
            >
              <Icon size={20} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                letterSpacing: '0.12em',
                color: active ? '#1AFFD0' : '#3A5870',
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
