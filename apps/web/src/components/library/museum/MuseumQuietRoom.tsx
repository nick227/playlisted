interface MuseumQuietRoomProps {
  phrase: string;
}

export function MuseumQuietRoom({ phrase }: MuseumQuietRoomProps) {
  return (
    <section className="relative py-24 md:py-32" aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,77,255,0.06),transparent_58%)]" />
      <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <p className="relative px-6 text-center font-serif text-[clamp(1.55rem,3.8vw,3rem)] font-light italic leading-tight tracking-[0.02em] text-white/24">
        {phrase}
      </p>
    </section>
  );
}
