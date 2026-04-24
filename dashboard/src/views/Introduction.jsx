import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Introduction() {
  const navigate = useNavigate()
  const doveRef = useRef(null)
  const wingRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const dove = doveRef.current
    const wing = wingRef.current
    if (!dove || !wing) return

    // Flight path: bottom-right to top-left tree branch
    // Bezier curve control points for natural arc
    const startX = window.innerWidth - 80
    const startY = window.innerHeight - 80
    const endX = 120   // lands on tree branch tip
    const endY = 85    // height of branch

    // Control points for the bezier arc
    const cp1x = window.innerWidth * 0.65
    const cp1y = window.innerHeight * 0.6
    const cp2x = window.innerWidth * 0.25
    const cp2y = window.innerHeight * 0.15

    let t = 0
    let direction = 1  // 1 = flying to tree, -1 = flying back
    const speed = 0.004
    let perched = false
    let perchTimer = null

    // Wing flap animation
    let wingAngle = 0
    let wingDir = 1
    const flapSpeed = 0.15

    const cubicBezier = (t, p0, p1, p2, p3) =>
      Math.pow(1 - t, 3) * p0 +
      3 * Math.pow(1 - t, 2) * t * p1 +
      3 * (1 - t) * Math.pow(t, 2) * p2 +
      Math.pow(t, 3) * p3

    const animate = () => {
      if (perched) {
        // Gentle wing fold while perched — subtle breathing
        wingAngle += 0.02
        wing.setAttribute('d', getWingPath(Math.sin(wingAngle) * 3))
        animRef.current = requestAnimationFrame(animate)
        return
      }

      t += speed * direction

      // Reached the tree — perch for 1.5 seconds
      if (t >= 1) {
        t = 1
        perched = true
        perchTimer = setTimeout(() => {
          perched = false
          direction = -1  // fly back
        }, 1500)
      }

      // Returned to start — pause then fly again
      if (t <= 0) {
        t = 0
        perched = true
        perchTimer = setTimeout(() => {
          perched = false
          direction = 1
        }, 800)
      }

      const x = cubicBezier(t, startX, cp1x, cp2x, endX)
      const y = cubicBezier(t, startY, cp1y, cp2y, endY)

      // Calculate heading angle from bezier tangent
      const dx = cubicBezier(t + 0.01, startX, cp1x, cp2x, endX) - x
      const dy = cubicBezier(t + 0.01, startY, cp1y, cp2y, endY) - y
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)

      // Wing flap — faster mid-flight, slower near endpoints
      const flapIntensity = 0.5 + Math.sin(t * Math.PI) * 0.5
      wingAngle += flapSpeed * flapIntensity * direction
      const flapOffset = Math.sin(wingAngle) * 12 * flapIntensity

      wing.setAttribute('d', getWingPath(flapOffset))

      // Flip dove horizontally when flying back
      const scaleX = direction === 1 ? 1 : -1
      dove.setAttribute(
        'transform',
        `translate(${x}, ${y}) rotate(${direction === 1 ? angle : angle + 180}) scale(${scaleX}, 1)`
      )

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      clearTimeout(perchTimer)
    }
  }, [])

  // Dove wing path — offset controls flap position
  const getWingPath = (offset = 0) =>
    `M 0,0 
     C -8,${-6 + offset} -18,${-14 + offset} -22,${-8 + offset}
     C -18,${-2 + offset} -10,2 0,0
     M 0,0
     C 6,${-4 - offset * 0.3} 14,${-10 - offset * 0.3} 16,${-5 - offset * 0.3}
     C 12,${0 - offset * 0.3} 6,2 0,0`

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>

      {/* SVG canvas — full screen */}
      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Tree in top-left corner */}
        <g transform="translate(30, 20)">

          {/* Tree trunk */}
          <path
            d="M 55,280 C 52,240 50,200 52,160 C 54,120 58,100 60,80"
            fill="none"
            stroke="#4B5446"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Main branch going right — dove lands here */}
          <path
            d="M 60,80 C 75,72 95,68 120,70"
            fill="none"
            stroke="#4B5446"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Secondary branch left */}
          <path
            d="M 58,105 C 40,95 20,90 5,88"
            fill="none"
            stroke="#4B5446"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Small twig up */}
          <path
            d="M 60,80 C 62,65 65,55 68,45"
            fill="none"
            stroke="#4B5446"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Foliage clusters — organic circles */}
          {[
            [62, 35, 28],
            [82, 28, 22],
            [45, 42, 20],
            [70, 55, 16],
            [50, 30, 18],
            [90, 45, 16],
            [30, 52, 14],
            [10, 75, 18],
            [95, 62, 14],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="#3D8C21"
              opacity={0.7 + (i % 3) * 0.1}
            />
          ))}

          {/* Lighter foliage highlights */}
          {[
            [68, 30, 12],
            [50, 38, 10],
            [85, 35, 10],
            [15, 70, 10],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="#5FAF40"
              opacity={0.5}
            />
          ))}

          {/* Small grass/roots at base */}
          <path
            d="M 40,280 C 38,265 42,255 45,250"
            fill="none" stroke="#4B5446"
            strokeWidth="2" strokeLinecap="round"
          />
          <path
            d="M 70,280 C 72,265 68,255 65,250"
            fill="none" stroke="#4B5446"
            strokeWidth="2" strokeLinecap="round"
          />
        </g>

        {/* Dove — animated */}
        <g
          ref={doveRef}
          style={{ transformOrigin: '0 0' }}
        >
          {/* Dove body */}
          <ellipse cx="0" cy="0" rx="12" ry="7" fill="#f0fdf4" />

          {/* Dove head */}
          <circle cx="10" cy="-4" r="5" fill="#f0fdf4" />

          {/* Beak */}
          <path
            d="M 14,-4 L 18,-3 L 14,-2 Z"
            fill="#D97706"
          />

          {/* Eye */}
          <circle cx="12" cy="-5" r="1.2" fill="#374034" />
          <circle cx="12.4" cy="-5.3" r="0.4" fill="white" />

          {/* Tail */}
          <path
            d="M -10,0 C -14,2 -16,5 -14,7 C -12,5 -10,3 -8,2 C -10,4 -11,7 -9,8 C -7,5 -6,2 -4,1 Z"
            fill="#e8f8f0"
          />

          {/* Wings — animated via ref */}
          <path
            ref={wingRef}
            d={getWingPath(0)}
            fill="#dcfce7"
            stroke="#9CA897"
            strokeWidth="0.5"
          />
        </g>

        {/* Subtle flight trail dots */}
        <circle cx="0" cy="0" r="0" fill="transparent" id="trail" />
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
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '52px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Verdant
        </h1>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 32px',
            background: 'var(--green-500)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => e.target.style.background = 'var(--green-600)'}
          onMouseLeave={e => e.target.style.background = 'var(--green-500)'}
        >
          Open
        </button>
      </div>

    </div>
  )
}
