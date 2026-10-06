export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground"
      role="status"
    >
      {children}
    </p>
  );
}
