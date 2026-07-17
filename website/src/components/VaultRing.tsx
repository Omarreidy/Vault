// Rotating tick-dashed ring — the vault-door motif used behind phones.
export default function VaultRing({
  size,
  duration,
  reverse = false,
}: {
  size: number;
  duration: number;
  reverse?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        animation: `spin-slow ${duration}s linear infinite${reverse ? ' reverse' : ''}`,
      }}
    >
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="rgba(201,169,110,0.16)"
        strokeWidth="0.35"
        strokeDasharray="0.4 2.6"
      />
    </svg>
  );
}
