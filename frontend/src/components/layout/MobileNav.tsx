import { Waves, BarChart2, Map, Bot, Users, type LucideProps } from 'lucide-react'
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
  const { mobileTab, setMobileTab, setFriendsOpen } = useSpotStore()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(13,28,42,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(168,200,220,0.08)',
      }}
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const active = mobileTab === id
          return (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className="flex flex-col items-center justify-center gap-1 py-3 transition-colors"
              style={{ color: active ? '#78B8D8' : '#6AAED0', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <Icon size={20} />
              <span style={{
                fontFamily: "'Bangers', Impact, system-ui",
                fontWeight: 400,
                fontSize: 9,
                letterSpacing: '0.16em',
                color: active ? '#78B8D8' : '#6AAED0',
              }}>
                {label}
              </span>
            </button>
          )
        })}
        {/* Friends button */}
        <button
          onClick={() => setFriendsOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-3 transition-colors"
          style={{ color: '#6AAED0', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <Users size={20} />
          <span style={{
            fontFamily: "'Bangers', Impact, system-ui",
            fontWeight: 400,
            fontSize: 9,
            letterSpacing: '0.16em',
            color: '#6AAED0',
          }}>
            FRIENDS
          </span>
        </button>
      </div>
    </nav>
  )
}
