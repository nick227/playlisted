interface MuseumQuietRoomProps {
  phrase: string;
}

export function MuseumQuietRoom({ phrase }: MuseumQuietRoomProps) {
  return (
    <section className="relative min-w-0 py-20 md:py-28" aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,77,255,0.06),transparent_58%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <p className="relative text-center font-serif text-[clamp(1.5rem,3.5vw,2.75rem)] font-light italic leading-tight tracking-[0.02em] text-white/24">
        {phrase}
      </p>
    </section>
  );
}
