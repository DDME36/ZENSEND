type ZenBeaconState = 'connecting' | 'scanning' | 'success';

interface ZenBeaconProps {
  state?: ZenBeaconState;
  label?: string;
  decorative?: boolean;
  className?: string;
}

export function ZenBeacon({
  state = 'scanning',
  label = 'ZenSend signal beacon',
  decorative = false,
  className = '',
}: ZenBeaconProps) {
  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': label };

  return (
    <span
      className={`zen-beacon zen-beacon--${state} ${className}`.trim()}
      {...accessibilityProps}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <circle className="zen-beacon__guide zen-beacon__guide--outer" cx="24" cy="24" r="18.5" />
        <circle className="zen-beacon__guide zen-beacon__guide--inner" cx="24" cy="24" r="12" />
        <path className="zen-beacon__ticks" d="M24 3.5v3M44.5 24h-3M24 44.5v-3M3.5 24h3" />

        <g className="zen-beacon__orbit">
          <path d="M12.4 35.6A16.4 16.4 0 1 1 35.6 35.6" />
          <path d="M17 31A9.9 9.9 0 1 1 31 31" />
          <circle className="zen-beacon__satellite" cx="12.4" cy="35.6" r="1.8" />
          <circle className="zen-beacon__satellite zen-beacon__satellite--late" cx="31" cy="31" r="1.6" />
        </g>

        <g className="zen-beacon__sweep">
          <path d="M24 24 36.7 11.3" />
          <path className="zen-beacon__sweep-arc" d="M24 7a17 17 0 0 1 12 5" />
        </g>

        <circle className="zen-beacon__core-halo" cx="24" cy="24" r="7" />
        <circle className="zen-beacon__core" cx="24" cy="24" r="3.6" />
        <path className="zen-beacon__check" d="m19.2 24.2 3.1 3.2 6.8-7.2" />
      </svg>
    </span>
  );
}
