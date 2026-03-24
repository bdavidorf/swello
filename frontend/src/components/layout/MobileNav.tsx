import clsx from 'clsx'
import { Waves, BarChart2, Map, Bot, type LucideProps } from 'lucide-react'
import { useSpotStore, type MobileTab } from '../../store/spotStore'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

const TABS: { id: MobileTab; label: string; Icon: LucideIcon }[] = [
  { id: 'waves',    label: 'Now',      Icon: Waves    },
  { id: 'forecast', label: 'Forecast', Icon: BarChart2 },
  { id: 'spots',    label: 'Explore',  Icon: Map      },
  { id: 'ai',       label: 'AI',       Icon: Bot      },
]

export function MobileNav() {
  const { mobileTab, setMobileTab } = useSpotStore()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ocean-950/95 backdrop-blur-md border-t border-ocean-700/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {TABS.map(({ id, label, Icon }) => {
          const active = mobileTab === id
          return (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                active ? 'text-wave-400' : 'text-ocean-500'
              )}
            >
              <Icon size={20} />
              <span className={clsx('text-[10px] font-semibold tracking-wide', active && 'text-wave-400')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
