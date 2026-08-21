export default function AdminHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-sm tracking-wide text-neutral-500 uppercase">Admin · Fase 0</p>
      <h1 className="text-3xl font-semibold tracking-tight">Panel interno</h1>
      <p className="text-neutral-700">
        App separada del marketplace. Auth RBAC y módulos de operación llegan en Fase 10.
      </p>
    </main>
  );
}
