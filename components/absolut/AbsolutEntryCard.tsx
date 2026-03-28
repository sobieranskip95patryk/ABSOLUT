type AbsolutEntryCardProps = {
  title: string;
  content: string;
  roomTitle: string;
  visibility: string;
};

export function AbsolutEntryCard(props: AbsolutEntryCardProps) {
  return (
    <article className="data-card h-full">
      <span className="eyebrow">{props.visibility}</span>
      <h3 className="mt-4 text-2xl font-semibold text-white">{props.title}</h3>
      <p className="mt-2 text-sm uppercase tracking-[0.18em] text-gold">{props.roomTitle}</p>
      <p className="copy mt-4">{props.content}</p>
    </article>
  );
}
