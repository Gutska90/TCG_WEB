export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#7C3AED" />
      <rect x="8" y="5" width="16" height="22" rx="3" fill="#F8FAFC" />
      <rect x="10" y="8" width="12" height="8" rx="1.5" fill="#22D3EE" />
      <rect x="10" y="18" width="8" height="2" rx="1" fill="#7C3AED" />
      <rect x="10" y="22" width="5" height="2" rx="1" fill="#CBD5E1" />
    </svg>
  );
}
