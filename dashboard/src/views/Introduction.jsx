import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Introduction() {
  const navigate = useNavigate()
  const doveRef = useRef(null)
  const wingTopRef = useRef(null)
  const wingBottomRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const dove = doveRef.current
    if (!dove) return

    // Key positions
    const BRANCH_X = 210
    const BRANCH_Y = 160
    const WATER_X = window.innerWidth - 160
    const WATER_Y = window.innerHeight - 140

    // States: 'toWater' | 'drinking' | 'toTree' | 'perched'
    let state = 'perched'
    let t = 0
    let perchTimer = null
    let drinkTimer = null
    let wingAngle = 0
    let drinkAngle = 0
    let drinkDir = 1

    const cubicBezier = (t, p0, p1, p2, p3) =>
      Math.pow(1-t,3)*p0 + 3*Math.pow(1-t,2)*t*p1 +
      3*(1-t)*Math.pow(t,2)*p2 + Math.pow(t,3)*p3

    const getWingFlap = (offset) => ({
      top: `M 0,0 C -12,${-18+offset} -32,${-30+offset} -38,${-18+offset} C -28,${-6+offset} -14,${-2+offset} 0,0`,
      bottom: `M 0,0 C 10,${-8-offset*0.4} 22,${-16-offset*0.4} 24,${-8-offset*0.4} C 18,${0-offset*0.4} 8,3 0,0`
    })

    const setWings = (offset) => {
      const paths = getWingFlap(offset)
      if (wingTopRef.current) wingTopRef.current.setAttribute('d', paths.top)
      if (wingBottomRef.current) wingBottomRef.current.setAttribute('d', paths.bottom)
    }

    const startFlyToWater = () => {
      state = 'toWater'
      t = 0
    }

    const startDrinking = () => {
      state = 'drinking'
      drinkAngle = 0
      drinkTimer = setTimeout(() => {
        state = 'toTree'
        t = 0
      }, 2500)
    }

    const startPerch = () => {
      state = 'perched'
      perchTimer = setTimeout(() => {
        startFlyToWater()
      }, 2000)
    }

    // Start perched on branch
    dove.setAttribute('transform', `translate(${BRANCH_X}, ${BRANCH_Y})`)
    perchTimer = setTimeout(() => startFlyToWater(), 1500)

    const animate = () => {
      wingAngle += 0.18

      if (state === 'perched') {
        // Gentle breathing wing fold
        setWings(Math.sin(wingAngle * 0.3) * 4)
        dove.setAttribute('transform',
          `translate(${BRANCH_X}, ${BRANCH_Y}) scale(1,1)`)

      } else if (state === 'toWater') {
        t += 0.006
        if (t >= 1) { t = 1; startDrinking() }

        const cp1x = BRANCH_X + (WATER_X - BRANCH_X) * 0.3
        const cp1y = BRANCH_Y - 120
        const cp2x = BRANCH_X + (WATER_X - BRANCH_X) * 0.7
        const cp2y = WATER_Y - 180

        const x = cubicBezier(t, BRANCH_X, cp1x, cp2x, WATER_X)
        const y = cubicBezier(t, BRANCH_Y, cp1y, cp2y, WATER_Y)

        const nx = cubicBezier(Math.min(t+0.01,1), BRANCH_X, cp1x, cp2x, WATER_X)
        const ny = cubicBezier(Math.min(t+0.01,1), BRANCH_Y, cp1y, cp2y, WATER_Y)
        const angle = Math.atan2(ny - y, nx - x) * 180 / Math.PI

        const flapIntensity = 0.4 + Math.sin(t * Math.PI) * 0.6
        setWings(Math.sin(wingAngle) * 18 * flapIntensity)

        dove.setAttribute('transform',
          `translate(${x}, ${y}) rotate(${angle})`)

      } else if (state === 'drinking') {
        // Dove bobs head down to water and back up repeatedly
        drinkAngle += 0.05 * drinkDir
        if (drinkAngle > 1) drinkDir = -1
        if (drinkAngle < 0) drinkDir = 1

        const headDip = Math.sin(drinkAngle * Math.PI) * 28
        setWings(Math.sin(wingAngle * 0.2) * 5)

        dove.setAttribute('transform',
          `translate(${WATER_X}, ${WATER_Y - headDip * 0.3}) rotate(${headDip * 1.2}) scale(-1,1)`)

      } else if (state === 'toTree') {
        t += 0.005
        if (t >= 1) { t = 1; startPerch() }

        const cp1x = WATER_X - (WATER_X - BRANCH_X) * 0.25
        const cp1y = WATER_Y - 150
        const cp2x = WATER_X - (WATER_X - BRANCH_X) * 0.7
        const cp2y = BRANCH_Y - 100

        const x = cubicBezier(t, WATER_X, cp1x, cp2x, BRANCH_X)
        const y = cubicBezier(t, WATER_Y, cp1y, cp2y, BRANCH_Y)

        const nx = cubicBezier(Math.min(t+0.01,1), WATER_X, cp1x, cp2x, BRANCH_X)
        const ny = cubicBezier(Math.min(t+0.01,1), WATER_Y, cp1y, cp2y, BRANCH_Y)
        const angle = Math.atan2(ny - y, nx - x) * 180 / Math.PI

        const flapIntensity = 0.4 + Math.sin(t * Math.PI) * 0.6
        setWings(Math.sin(wingAngle) * 18 * flapIntensity)

        dove.setAttribute('transform',
          `translate(${x}, ${y}) rotate(${angle}) scale(-1,1)`)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      clearTimeout(perchTimer)
      clearTimeout(drinkTimer)
    }
  }, [])

  const initialWing = {
    top: 'M 0,0 C -12,-18 -32,-30 -38,-18 C -28,-6 -14,-2 0,0',
    bottom: 'M 0,0 C 10,-8 22,-16 24,-8 C 18,0 8,3 0,0'
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: '#F7F8F6',
      overflow: 'hidden',
    }}>

      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Water shimmer gradient */}
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85"/>
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.6"/>
          </linearGradient>
          {/* Water reflection shimmer */}
          <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0"/>
            <stop offset="50%" stopColor="white" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          {/* Ground gradient */}
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.2"/>
          </linearGradient>
          {/* Tree foliage gradient */}
          <radialGradient id="foliageGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#4ADE80"/>
            <stop offset="60%" stopColor="#16A34A"/>
            <stop offset="100%" stopColor="#14532D"/>
          </radialGradient>
          <radialGradient id="foliageGrad2" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#86EFAC"/>
            <stop offset="60%" stopColor="#22C55E"/>
            <stop offset="100%" stopColor="#15803D"/>
          </radialGradient>
        </defs>

        {/* Ground / grass strip */}
        <ellipse
          cx={window.innerWidth * 0.5}
          cy={window.innerHeight - 60}
          rx={window.innerWidth * 0.9}
          ry={60}
          fill="url(#groundGrad)"
        />

        {/* ── TREE (large, left side) ── */}
        <g transform="translate(0, 0)">

          {/* Root sprawl */}
          <path d="M 120,620 C 90,610 60,615 40,625"
            fill="none" stroke="#5C4033" strokeWidth="8" strokeLinecap="round"/>
          <path d="M 130,618 C 140,608 155,612 165,622"
            fill="none" stroke="#5C4033" strokeWidth="6" strokeLinecap="round"/>
          <path d="M 110,622 C 105,628 95,630 80,628"
            fill="none" stroke="#5C4033" strokeWidth="5" strokeLinecap="round"/>

          {/* Main trunk */}
          <path
            d="M 80,620 C 88,540 92,460 95,390 C 98,320 100,260 102,200 C 104,160 108,140 112,120"
            fill="none" stroke="#5C4033" strokeWidth="28"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Trunk highlight */}
          <path
            d="M 88,620 C 95,540 98,460 100,390 C 102,320 103,260 104,200"
            fill="none" stroke="#7C5C4A" strokeWidth="8"
            strokeLinecap="round" opacity="0.5"
          />

          {/* Main right branch — dove lands at tip */}
          <path
            d="M 112,170 C 140,155 170,148 200,150 C 220,152 235,158 250,162"
            fill="none" stroke="#5C4033" strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Branch tip extension */}
          <path
            d="M 210,153 C 230,148 252,145 270,148"
            fill="none" stroke="#6B4C3B" strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Left branch */}
          <path
            d="M 105,220 C 75,205 45,195 15,190"
            fill="none" stroke="#5C4033" strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Upper twig right */}
          <path
            d="M 115,145 C 130,125 148,112 165,108"
            fill="none" stroke="#6B4C3B" strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Upper twig left */}
          <path
            d="M 108,155 C 88,138 68,128 50,122"
            fill="none" stroke="#6B4C3B" strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Small twigs */}
          <path d="M 165,108 C 172,96 180,90 192,86"
            fill="none" stroke="#7C5C4A" strokeWidth="5" strokeLinecap="round"/>
          <path d="M 155,112 C 160,100 165,92 170,84"
            fill="none" stroke="#7C5C4A" strokeWidth="4" strokeLinecap="round"/>
          <path d="M 50,122 C 38,110 28,105 14,102"
            fill="none" stroke="#7C5C4A" strokeWidth="4" strokeLinecap="round"/>
          <path d="M 15,190 C 5,178 -5,170 -10,162"
            fill="none" stroke="#7C5C4A" strokeWidth="5" strokeLinecap="round"/>

          {/* Foliage — large overlapping clusters */}
          {[
            // Main crown clusters
            [115, 75, 75, 'url(#foliageGrad)'],
            [80, 90, 62, '#15803D'],
            [155, 68, 58, 'url(#foliageGrad2)'],
            [60, 82, 52, '#16A34A'],
            [185, 78, 50, '#15803D'],
            // Mid clusters
            [110, 120, 42, 'url(#foliageGrad)'],
            [148, 110, 38, '#22C55E'],
            [72, 112, 36, '#16A34A'],
            [45, 100, 32, 'url(#foliageGrad2)'],
            [195, 100, 30, '#15803D'],
            // Left branch foliage
            [20, 172, 40, 'url(#foliageGrad)'],
            [-5, 160, 32, '#16A34A'],
            [50, 155, 28, 'url(#foliageGrad2)'],
            // Upper twig foliage
            [185, 72, 24, '#4ADE80'],
            [175, 58, 18, '#86EFAC'],
            [48, 102, 22, '#4ADE80'],
            [170, 78, 20, '#22C55E'],
          ].map(([cx, cy, r, fill], i) => (
            <circle
              key={i} cx={cx} cy={cy} r={r}
              fill={fill}
              opacity={0.82 + (i % 4) * 0.04}
            />
          ))}

          {/* Foliage light spots */}
          {[
            [105, 62, 18],
            [145, 55, 14],
            [75, 78, 12],
            [165, 70, 10],
            [25, 158, 14],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="#BBF7D0" opacity={0.35}/>
          ))}
        </g>

        {/* ── WATER BODY (right side) ── */}
        <g>
          {/* Main pond shape */}
          <ellipse
            cx={window.innerWidth - 180}
            cy={window.innerHeight - 115}
            rx={220} ry={80}
            fill="url(#waterGrad)"
            opacity={0.9}
          />
          {/* Pond edge highlight */}
          <ellipse
            cx={window.innerWidth - 180}
            cy={window.innerHeight - 118}
            rx={218} ry={78}
            fill="none"
            stroke="#93C5FD"
            strokeWidth="2"
            opacity={0.5}
          />
          {/* Water shimmer stripes */}
          {[0, 1, 2, 3].map(i => (
            <ellipse
              key={i}
              cx={window.innerWidth - 220 + i * 30}
              cy={window.innerHeight - 125 + i * 8}
              rx={60 - i * 10} ry={6}
              fill="url(#shimmer)"
              opacity={0.6}
            />
          ))}
          {/* Ripple circles */}
          {[1, 2, 3].map(i => (
            <ellipse
              key={i}
              cx={window.innerWidth - 160}
              cy={window.innerHeight - 138}
              rx={12 * i} ry={5 * i}
              fill="none"
              stroke="white"
              strokeWidth="1"
              opacity={0.3 / i}
            />
          ))}
          {/* Lily pad suggestion */}
          <ellipse
            cx={window.innerWidth - 320}
            cy={window.innerHeight - 105}
            rx={22} ry={12}
            fill="#16A34A" opacity={0.7}
          />
          <ellipse
            cx={window.innerWidth - 80}
            cy={window.innerHeight - 98}
            rx={16} ry={9}
            fill="#15803D" opacity={0.65}
          />
          {/* Shore grass tufts */}
          {[-60, -20, 20, 60, 100].map((offset, i) => (
            <g key={i} transform={`translate(${window.innerWidth - 180 + offset}, ${window.innerHeight - 58})`}>
              <path d="M 0,0 C -3,-12 -2,-20 0,-24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 4,0 C 4,-10 5,-18 4,-22" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
              <path d="M -4,0 C -5,-8 -4,-14 -2,-18" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"/>
            </g>
          ))}
          {/* Reflection of dove drinking — subtle wavy line */}
          <path
            d={`M ${window.innerWidth - 200},${window.innerHeight - 95} C ${window.innerWidth - 180},${window.innerHeight - 88} ${window.innerWidth - 160},${window.innerHeight - 88} ${window.innerWidth - 140},${window.innerHeight - 95}`}
            fill="none" stroke="white" strokeWidth="1.5"
            opacity={0.2}
          />
        </g>

        {/* ── DOVE (animated) ── */}
        <g ref={doveRef}>
          {/* Body */}
          <ellipse cx="0" cy="0" rx="22" ry="13" fill="#F0FDF4"/>
          {/* Chest puff */}
          <ellipse cx="8" cy="3" rx="14" ry="10" fill="#F0FDF4"/>
          {/* Head */}
          <circle cx="20" cy="-8" r="10" fill="#F0FDF4"/>
          {/* Neck connection */}
          <ellipse cx="14" cy="-3" rx="9" ry="7" fill="#F0FDF4"/>
          {/* Beak */}
          <path d="M 28,-8 L 36,-6 L 28,-4 Z" fill="#D97706"/>
          {/* Beak line */}
          <line x1="28" y1="-6" x2="36" y2="-6" stroke="#B45309" strokeWidth="0.8"/>
          {/* Eye */}
          <circle cx="24" cy="-10" r="2.5" fill="#1F2A1C"/>
          <circle cx="24.8" cy="-10.8" r="0.9" fill="white"/>
          {/* Nostril dot */}
          <circle cx="30" cy="-7" r="0.8" fill="#92400E"/>
          {/* Tail feathers */}
          <path
            d="M -18,2 C -26,5 -30,10 -28,15 C -24,10 -20,7 -16,6 C -22,10 -25,16 -22,20 C -17,13 -13,9 -9,8 C -14,12 -15,18 -12,21 C -8,15 -5,10 -1,8 Z"
            fill="#E8F5E9" stroke="#C8E6C9" strokeWidth="0.5"
          />
          {/* Wing feather detail line */}
          <path
            d="M -5,-2 C 2,-6 10,-8 18,-7"
            fill="none" stroke="#D1FAE5" strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Top wing */}
          <path
            ref={wingTopRef}
            d={initialWing.top}
            fill="#DCFCE7"
            stroke="#A7F3D0"
            strokeWidth="0.8"
          />
          {/* Bottom wing */}
          <path
            ref={wingBottomRef}
            d={initialWing.bottom}
            fill="#ECFDF5"
            stroke="#D1FAE5"
            strokeWidth="0.8"
          />
          {/* Wing feather tips */}
          <path
            d="M -30,-14 C -32,-10 -30,-6 -26,-5"
            fill="none" stroke="#A7F3D0" strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -22,-18 C -24,-14 -22,-10 -18,-9"
            fill="none" stroke="#A7F3D0" strokeWidth="1"
            strokeLinecap="round"
          />
          {/* Feet (visible when perched) */}
          <path d="M 4,10 L 2,18 M 2,18 L -2,22 M 2,18 L 4,22 M 2,18 L 6,22"
            fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 10,10 L 8,18 M 8,18 L 4,22 M 8,18 L 10,22 M 8,18 L 12,22"
            fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Verdant wordmark — centered */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        zIndex: 10,
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '64px',
          fontWeight: '700',
          color: '#1F2A1C',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Verdant
        </h1>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '13px 40px',
            background: '#16A34A',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 2px 12px rgba(22,163,74,0.3)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.target.style.background = '#15803D'
            e.target.style.transform = 'translateY(-1px)'
            e.target.style.boxShadow = '0 4px 16px rgba(22,163,74,0.4)'
          }}
          onMouseLeave={e => {
            e.target.style.background = '#16A34A'
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 2px 12px rgba(22,163,74,0.3)'
          }}
        >
          Open
        </button>
      </div>

    </div>
  )
}
