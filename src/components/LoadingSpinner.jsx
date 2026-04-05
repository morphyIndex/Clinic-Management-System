export default function LoadingSpinner({ label = 'Loading...', inline = false }) {
  const spinner = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${inline ? 'h-4 w-4' : 'h-6 w-6'} animate-spin text-indigo-600`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" stroke="currentColor" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
      {spinner}
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
