function IconBase({ children, className = '', strokeWidth = 1.8, viewBox = '0 0 24 24' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

export function LockIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
      <path d="M12 14v2.5" />
    </IconBase>
  );
}

export function ShieldCheckIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M12 3l7 3v5c0 4.6-2.7 7.8-7 10-4.3-2.2-7-5.4-7-10V6l7-3Z" />
      <path d="m9.5 11.8 1.7 1.7 3.5-3.8" />
    </IconBase>
  );
}

export function BuildingIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M4 21V6.5A1.5 1.5 0 0 1 5.5 5H11v16" />
      <path d="M13 21V3.5A1.5 1.5 0 0 1 14.5 2H19a1 1 0 0 1 1 1v18" />
      <path d="M8 9h.01M8 13h.01M8 17h.01M16 7h.01M16 11h.01M16 15h.01" />
    </IconBase>
  );
}

export function ClipboardIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6a1 1 0 0 0 0-2H9a1 1 0 1 0 0 2Z" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </IconBase>
  );
}

export function GaugeIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M5 17a7 7 0 1 1 14 0" />
      <path d="M12 12l4-2" />
      <path d="M8 18h8" />
    </IconBase>
  );
}

export function DatabaseIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  );
}

export function ArchiveIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="4" rx="1.5" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </IconBase>
  );
}

export function CodeIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
      <path d="m13 5-2 14" />
    </IconBase>
  );
}

export function GlobeIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </IconBase>
  );
}

export function ClockIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function SparkIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M12 3v5" />
      <path d="M12 16v5" />
      <path d="M4.9 6.9l3.5 3.5" />
      <path d="m15.6 17.6 3.5 3.5" />
      <path d="M3 12h5" />
      <path d="M16 12h5" />
      <path d="m4.9 17.1 3.5-3.5" />
      <path d="m15.6 6.4 3.5-3.5" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

export function BookIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v15H6.5A2.5 2.5 0 0 0 4 21.5Z" />
      <path d="M8 8h7M8 12h7" />
    </IconBase>
  );
}

export function HeartPulseIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" />
      <path d="M7.5 12h2l1.2-2.2 2.1 4.3 1.2-2.1H16.5" />
    </IconBase>
  );
}

export function TeamIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="10" r="2.5" />
      <path d="M4.5 19a4.5 4.5 0 0 1 9 0" />
      <path d="M14.5 18a3.5 3.5 0 0 1 5 0" />
    </IconBase>
  );
}

export function MonitorIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </IconBase>
  );
}

export function MobileIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 5h2" />
      <circle cx="12" cy="18" r="0.8" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function TabletIcon({ className = 'h-6 w-6' }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CheckCircleIcon({ className = 'h-5 w-5' }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.3 2.3 4.7-4.8" />
    </IconBase>
  );
}
