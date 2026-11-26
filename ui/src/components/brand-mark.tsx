/** The Bluewhale mark. Decorative; the product name is always adjacent. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M5 15.5c0-4.7 3.8-8.5 8.5-8.5 4.1 0 7.5 2.9 8.3 6.7l4.2-2.9v9.4l-4.2-2.9c-.8 3.8-4.2 6.7-8.3 6.7C8.8 24 5 20.2 5 15.5Z"
        fill="currentColor"
      />
      <circle cx="11" cy="14.5" r="1.4" fill="var(--color-surface)" />
    </svg>
  );
}
