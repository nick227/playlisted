interface HighlightMatchProps {
  text: string;
  query: string;
}

export function HighlightMatch({ text, query }: HighlightMatchProps) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerText.indexOf(lowerNeedle);
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[var(--color-brand)]/35 px-0.5 text-white">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}
