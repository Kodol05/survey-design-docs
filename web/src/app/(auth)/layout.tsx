export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="reading-column flex flex-1 items-center py-16">
      <div className="w-full max-w-sm mx-auto">{children}</div>
    </main>
  );
}
