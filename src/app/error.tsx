'use client';

export default function GlobeError({ retry }: { retry: () => void }) {
  return <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-slate-100">
    <div role="alert" className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">The globe could not load</h1>
      <p>A viewer asset or application error interrupted loading. Your saved browser data is retained.</p>
      <div className="flex gap-3">
        <button className="control" onClick={retry}>Try again</button>
        <button className="control" onClick={() => window.location.reload()}>Reload page</button>
      </div>
    </div>
  </main>;
}
