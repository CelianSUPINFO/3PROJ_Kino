export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="glass mx-auto max-w-3xl space-y-4 rounded-2xl p-6 text-white/80">
      <h1 className="text-display text-3xl font-bold text-white">{title}</h1>
      {children}
    </article>
  );
}
