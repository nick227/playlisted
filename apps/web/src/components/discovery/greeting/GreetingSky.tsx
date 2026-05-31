import type { TimeTheme } from "./getTimeTheme";

const STARS = Array.from({ length: 18 }, (_, i) => ({
  x: ((Math.sin(i * 127.1) * 0.5 + 0.5) * 88 + 4).toFixed(1),
  y: ((Math.cos(i * 73.7) * 0.5 + 0.5) * 65 + 6).toFixed(1),
  size: i % 4 === 0 ? 2 : 1,
  delay: `${((i * 0.65) % 4.5).toFixed(2)}s`,
}));

function SunRays() {
  return (
    <div className="greeting-sun-rays absolute inset-[-28px]">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="greeting-sun-ray absolute left-1/2 top-1/2 h-[52px] w-px origin-bottom -translate-x-1/2 bg-gradient-to-t from-amber-200/0 via-amber-100/25 to-amber-50/45"
          style={{ transform: `translateX(-50%) rotate(${i * 45}deg)` }}
        />
      ))}
    </div>
  );
}

export function GreetingSky({ theme }: { theme: TimeTheme }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: theme.skyGradient }} />

      <div
        className="absolute h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          left: `${theme.glowX}%`,
          top: `${theme.glowY}%`,
          background: theme.glowColor,
          opacity: theme.glowOpacity,
        }}
      />

      {theme.starOpacity > 0.02 ? (
        <div className="absolute inset-0" style={{ opacity: theme.starOpacity }}>
          {STARS.map((star, i) => (
            <span
              key={i}
              className="greeting-star absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      ) : null}

      {theme.sunOpacity > 0.02 ? (
        <div
          className="greeting-sun absolute"
          style={{
            left: `${theme.sunX}%`,
            top: `${theme.sunY}%`,
            opacity: theme.sunOpacity,
            transform: `translate(-50%, -50%) scale(${theme.sunScale})`,
          }}
        >
          <SunRays />
          <div className="greeting-sun-core relative h-16 w-16 rounded-full" />
        </div>
      ) : null}

      {theme.moonOpacity > 0.02 ? (
        <div
          className="greeting-moon absolute"
          style={{
            left: `${theme.moonX}%`,
            top: `${theme.moonY}%`,
            opacity: theme.moonOpacity,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="greeting-moon-body relative h-14 w-14 rounded-full" />
        </div>
      ) : null}
    </div>
  );
}
