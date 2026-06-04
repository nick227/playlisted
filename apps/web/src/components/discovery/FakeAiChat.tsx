import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const BOT_ACCENT = "#a5f3fc";

type BotChoice = {
  label: string;
  next: string;
};

type BotMessage = {
  eyebrow: string;
  title: string;
  body: string;
  choices: BotChoice[];
};

const BOT_MESSAGES: Record<string, BotMessage> = {
  welcome: {
    eyebrow: "Playlisted",
    title: "",
    body: "",
    choices: [
      { label: "Artists", next: "artists" },
      { label: "Playlists", next: "playlists" },
      { label: "Radio", next: "radio" },
    ],
  },
  artists: {
    eyebrow: "Artists",
    title: "Upload tracks and artwork.",
    body: "Insights like number of plays and duration.",
    choices: [
      { label: "Studio", next: "studio" },
      { label: "Radio", next: "radio" },
      { label: "AI Music", next: "aimusic" },
    ],
  },
  radio: {
    eyebrow: "Radio",
    title: "Streaming ad-free music all day.",
    body: "And we have an API.",
    choices: [
      { label: "API", next: "dev" },
      { label: "Pages", next: "pages" },
      { label: "Charts", next: "charts" },
    ],
  },
  charts: {
    eyebrow: "Charts",
    title: "Get your music on the charts.",
    body: "Showcase your music and get seen.",
    choices: [
      { label: "Profiles", next: "pages" },
      { label: "Playlists", next: "playlists" },
      { label: "Restart", next: "welcome" },
    ],
  },
  playlists: {
    eyebrow: "Playlists",
    title: "Heart and soul of the app.",
    body: "Save favorites, follow artists and playlists.",
    choices: [
      { label: "Charts", next: "charts" },
      { label: "Studio", next: "studio" },
      { label: "API", next: "dev" },
    ],
  },
  studio: {
    eyebrow: "Studio",
    title: "Check the studio's artist features.",
    body: "Manage music, metrics, social links, and profile.",
    choices: [
      { label: "Profiles", next: "pages" },
      { label: "API", next: "dev" },
      { label: "Playlists", next: "playlists" },
    ],
  },
  aimusic: {
    eyebrow: "AI Music",
    title: "We are cool with AI music.",
    body: "Everybody might hate it, but I like it.",
    choices: [
      { label: "Studio", next: "studio" },
      { label: "Pages", next: "pages" },
      { label: "Restart", next: "welcome" },
    ],
  },
  pages: {
    eyebrow: "Pages",
    title: "The platform is for artists.",
    body: "Tracks, playlists, profile links, and favorites.",
    choices: [
      { label: "Artists", next: "artists" },
      { label: "Playlists", next: "playlists" },
      { label: "Restart", next: "welcome" },
    ],
  },
  dev: {
    eyebrow: "Developers",
    title: "API keys are live.",
    body: "Public APIs and tools.",
    choices: [
      { label: "Radio", next: "radio" },
      { label: "Studio", next: "studio" },
      { label: "Restart", next: "welcome" },
    ],
  },
};

function CuteCompileBotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const drawableCanvas = canvas;
    const wrapper = parent;
    const maybeContext = drawableCanvas.getContext("2d");
    if (!maybeContext) return;

    const ctx = maybeContext;
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrame = 0;
    let width = 0;
    let height = 0;

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    function resize() {
      const rect = wrapper.getBoundingClientRect();
      const nextWidth = Math.max(160, Math.round(rect.width));
      const nextHeight = Math.max(160, Math.round(rect.height));
      const dpr = window.devicePixelRatio || 1;
      width = nextWidth;
      height = nextHeight;
      drawableCanvas.width = Math.round(nextWidth * dpr);
      drawableCanvas.height = Math.round(nextHeight * dpr);
      drawableCanvas.style.width = `${nextWidth}px`;
      drawableCanvas.style.height = `${nextHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (prefersReducedMotion) draw(0);
    }

    function drawTerminalLine(y: number, text: string, alpha: number) {
      ctx.fillStyle = `rgba(165,243,252,${alpha})`;
      ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, 0, y);
    }

    function draw(time: number) {
      const t = prefersReducedMotion ? 0.45 : time / 1000;
      const bob = prefersReducedMotion ? 0 : Math.sin(t * 1.7) * 5;
      const pulse = (Math.sin(t * 3) + 1) / 2;
      const cx = width / 2;
      const cy = height / 2 + bob;
      const scale = Math.min(width, height) / 400;

      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(cx, cy + 18, 18 * scale, cx, cy + 18, 188 * scale);
      glow.addColorStop(0, `${BOT_ACCENT}70`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath();
      ctx.ellipse(0, 168, 118, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(165,243,252,0.34)";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-72, -18);
      ctx.bezierCurveTo(-122, 0, -112, 76, -64, 98);
      ctx.moveTo(72, -18);
      ctx.bezierCurveTo(122, 0, 112, 76, 64, 98);
      ctx.moveTo(0, 16);
      ctx.bezierCurveTo(-12, 52, -10, 82, 0, 102);
      ctx.stroke();

      const brainGlow = ctx.createRadialGradient(0, -70, 16, 0, -66, 118);
      brainGlow.addColorStop(0, "rgba(255,255,255,0.98)");
      brainGlow.addColorStop(0.62, "rgba(165,243,252,0.36)");
      brainGlow.addColorStop(1, "rgba(165,243,252,0)");
      ctx.fillStyle = brainGlow;
      ctx.beginPath();
      ctx.arc(0, -66, 126, 0, Math.PI * 2);
      ctx.fill();

      const brainGradient = ctx.createLinearGradient(-92, -140, 92, 8);
      brainGradient.addColorStop(0, "rgba(255,255,255,0.98)");
      brainGradient.addColorStop(1, "rgba(186,230,253,0.94)");
      ctx.fillStyle = brainGradient;
      ctx.strokeStyle = "rgba(8,13,22,0.34)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-86, -72);
      ctx.bezierCurveTo(-112, -116, -64, -156, -24, -130);
      ctx.bezierCurveTo(-4, -164, 48, -148, 44, -110);
      ctx.bezierCurveTo(88, -120, 116, -70, 82, -38);
      ctx.bezierCurveTo(78, -2, 22, 8, 0, -16);
      ctx.bezierCurveTo(-36, 16, -102, -8, -86, -72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(8,13,22,0.24)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      for (const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] of [
        [-58, -82, -30, -112, -20, -42, -62, -34],
        [-14, -120, -38, -88, 12, -70, -12, -34],
        [28, -116, 76, -96, 26, -66, 72, -46],
        [-74, -58, -20, -76, -38, -8, 8, -30],
        [20, -34, 72, -18, 64, -82, 32, -76],
      ]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        ctx.stroke();
      }

      ctx.fillStyle = BOT_ACCENT;
      for (const [x, y, r] of [
        [-54, -92, 8],
        [2, -104, 7],
        [54, -78, 8],
        [-28, -38, 6],
        [36, -28, 6],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, r + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(165,243,252,0.72)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-38, 2);
      ctx.bezierCurveTo(-44, 30, -84, 38, -92, 72);
      ctx.moveTo(38, 0);
      ctx.bezierCurveTo(44, 32, 88, 36, 96, 72);
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(0, 32, 0, 52, 0, 76);
      ctx.stroke();

      ctx.fillStyle = "rgba(8,13,22,0.92)";
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 3;
      roundRect(ctx, -122, 72, 244, 106, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, -104, 88, 208, 26, 13);
      ctx.fill();

      drawTerminalLine(108, "> scan music", 0.94);
      drawTerminalLine(132, "radio.signal()", 0.7 + pulse * 0.22);
      drawTerminalLine(156, "studio.ready", 0.68);

      ctx.fillStyle = BOT_ACCENT;
      ctx.beginPath();
      ctx.arc(96, 156, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      for (const [x, y, r] of [
        [-136, -126, 5],
        [130, -102, 4],
        [-146, 42, 4],
        [142, 46, 5],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y + (prefersReducedMotion ? 0 : Math.sin(t * 2 + x) * 4), r + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      if (!prefersReducedMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);
    draw(0);
    if (!prefersReducedMotion) {
      animationFrame = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="mx-auto aspect-square w-full max-w-[180px] sm:max-w-[210px] md:max-w-[240px]">
      <canvas ref={canvasRef} role="img" aria-label="Glowing brain connected to a terminal" className="block h-full w-full" />
    </div>
  );
}

export function FakeAiChat({
  headline,
  message,
  messageOpacity,
  isGuest,
}: {
  headline: string;
  message: string;
  messageOpacity: number;
  isGuest: boolean;
}) {
  const [messageId, setMessageId] = useState("welcome");
  const botMessage = BOT_MESSAGES[messageId] ?? BOT_MESSAGES.welcome;
  const isWelcome = messageId === "welcome";
  const displayTitle = isWelcome ? headline : botMessage.title;
  const displayBody = isWelcome ? message : botMessage.body;
  const eyebrow = isWelcome ? "Playlisted" : botMessage.eyebrow;
  const displayOpacity = isWelcome ? messageOpacity : 0.86;

  const choiceButtons = useMemo(
    () =>
      botMessage.choices.map((choice) => (
        <button
          key={`${messageId}-${choice.label}`}
          type="button"
          onClick={() => setMessageId(choice.next)}
          className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:border-white/35 hover:bg-white/15"
        >
          {choice.label}
        </button>
      )),
    [botMessage.choices, messageId],
  );

  return (
    <div className="relative z-10 mx-auto flex min-h-[340px] w-full max-w-3xl flex-col items-center justify-center gap-3">
      <CuteCompileBotCanvas />

      <div className="w-full max-w-xl text-center">
        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--color-brand)]">
          {eyebrow}
        </p>
        <h1 className="mx-auto max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
          {displayTitle}
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-white"
          style={{ opacity: displayOpacity }}
        >
          {displayBody}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {isGuest ? (
            <Link
              to="/register"
              className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
            >
              Join free
            </Link>
          ) : (
            <Link
              to="/studio"
              className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90"
            >
              Studio
            </Link>
          )}
          {choiceButtons}
        </div>
      </div>
    </div>
  );
}
