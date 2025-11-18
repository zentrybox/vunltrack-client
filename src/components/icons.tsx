import type { SVGProps, ReactElement } from "react";

export type IconName =
  | "dashboard"
  | "devices"
  | "radar"
  | "scans"
  | "automation"
  | "reports"
  | "incidents"
  | "users"
  | "settings"
  | "subscription"
  | "export"
  | "play"
  | "chevron-down"
  | "sign-out";

export function Icon(
  { name, className, ...props }: { name: IconName } & SVGProps<SVGSVGElement>,
) {
  const Cmp = ICONS[name] ?? ICONS.dashboard;
  return <Cmp className={className} {...props} />;
}

const base = "stroke-current";

function Svg({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

const ICONS: Record<IconName, (p: SVGProps<SVGSVGElement>) => ReactElement> = {
  dashboard: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h5v8H3v-8Zm7 0h11v8H10v-8Z" strokeWidth={1.6} />
    </Svg>
  ),
  devices: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <rect x="3" y="5" width="18" height="12" rx="2" strokeWidth={1.6} />
      <path d="M8 19h8" strokeWidth={1.6} />
    </Svg>
  ),
  radar: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
      <path d="M12 12L5 5" strokeWidth={1.6} />
      <circle cx="12" cy="12" r="5" strokeWidth={1.6} />
    </Svg>
  ),
  scans: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M4 4h4M16 4h4M4 20h4M16 20h4" strokeWidth={1.6} />
      <rect x="8" y="8" width="8" height="8" rx="2" strokeWidth={1.6} />
    </Svg>
  ),
  automation: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <circle cx="7" cy="7" r="3" strokeWidth={1.6} />
      <circle cx="17" cy="17" r="3" strokeWidth={1.6} />
      <path d="M10 7h4M7 10v4m10-4v-4" strokeWidth={1.6} />
    </Svg>
  ),
  reports: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M6 4h9l3 3v13H6V4Z" strokeWidth={1.6} />
      <path d="M9 12h6M9 16h6M9 8h3" strokeWidth={1.6} />
    </Svg>
  ),
  incidents: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M12 2l10 18H2L12 2Z" strokeWidth={1.6} />
      <path d="M12 9v4M12 17h.01" strokeWidth={1.6} />
    </Svg>
  ),
  users: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <circle cx="12" cy="8" r="4" strokeWidth={1.6} />
      <path d="M4 20c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5" strokeWidth={1.6} />
    </Svg>
  ),
  settings: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M12 8a4 4 0 100 8 4 4 0 000-8Zm8 4a7.963 7.963 0 00-.37-2.36l2.28-1.65-2-3.46-2.68 1a8.06 8.06 0 00-2.04-1.18l-.41-2.82H9.22l-.41 2.82A8.06 8.06 0 006.77 4.5l-2.68-1L2.09 7l2.28 1.65A7.963 7.963 0 004 12c0 .82.12 1.6.37 2.35L2.09 16 4.1 19.46l2.67-1a8.06 8.06 0 002.04 1.18l.41 2.82h5.56l.41-2.82a8.06 8.06 0 002.04-1.18l2.68 1L21.91 16l-2.28-1.65c.25-.75.37-1.53.37-2.35Z" strokeWidth={1.2} />
    </Svg>
  ),
  subscription: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <rect x="4" y="5" width="16" height="14" rx="2" strokeWidth={1.6} />
      <path d="M4 9h16" strokeWidth={1.6} />
    </Svg>
  ),
  export: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M12 3v10M8 7l4-4 4 4M4 21h16" strokeWidth={1.6} />
    </Svg>
  ),
  play: (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M8 5v14l11-7-11-7Z" strokeWidth={1.6} />
    </Svg>
  ),
  "chevron-down": (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M6 9l6 6 6-6" strokeWidth={1.6} />
    </Svg>
  ),
  "sign-out": (p) => (
    <Svg {...p} className={`${base} ${p.className ?? ""}`}>
      <path d="M16 17l5-5-5-5M21 12H9" strokeWidth={1.6} />
      <path d="M13 21H5a2 2 0 01-2-2V5a2 2 0 012-2h8" strokeWidth={1.6} />
    </Svg>
  ),
};

export default ICONS;
