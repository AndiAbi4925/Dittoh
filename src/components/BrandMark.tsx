import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function DottohMark({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect width="24" height="24" rx="2" fill="#000000" />
      <rect x="4" y="4" width="3" height="3" fill="#ffffff" />
      <rect x="9" y="4" width="3" height="3" fill="#ffffff" />
      <rect x="14" y="4" width="3" height="3" fill="#ffffff" />
      <rect x="4" y="9" width="3" height="3" fill="#ffffff" />
      <rect x="17" y="9" width="3" height="3" fill="#ffffff" />
      <rect x="4" y="14" width="3" height="3" fill="#ffffff" />
      <rect x="17" y="14" width="3" height="3" fill="#ffffff" />
      <rect x="4" y="17" width="3" height="3" fill="#ffffff" />
      <rect x="9" y="17" width="3" height="3" fill="#ffffff" />
      <rect x="14" y="17" width="3" height="3" fill="#ffffff" />
      <rect x="17" y="17" width="3" height="3" fill="#d71921" />
    </svg>
  );
}

export function IconMenuGrid({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="2" y="3" width="12" height="1.5" fill="currentColor" />
      <rect x="2" y="7.25" width="12" height="1.5" fill="currentColor" />
      <rect x="2" y="11.5" width="8" height="1.5" fill="currentColor" />
      <rect x="12" y="11.5" width="2" height="1.5" fill="#d71921" />
    </svg>
  );
}

export function IconCloseCross({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconArrowRight({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M2 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconUploadGrid({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M10 13V4M10 4L6.5 7.5M10 4L13.5 7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 13.5V16.5H17V13.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconLayersCut({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="3" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="8" width="9" height="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconSlidersGrid({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="3.5" width="3" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="8" width="3" height="4" fill="#d71921" />
      <rect x="7" y="12.5" width="3" height="4" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconDownloadBox({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M10 3V12.5M10 12.5L6.5 9M10 12.5L13.5 9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14V17H17V14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconShieldLock({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M8 1.5L13.5 3.5V7.5C13.5 11 11.1 13.7 8 14.7C4.9 13.7 2.5 11 2.5 7.5V3.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="7" y="6.5" width="2" height="3" fill="#d71921" />
    </svg>
  );
}

export function IconPlay({ className = "h-3.5 w-3.5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M3.5 2.5L11.5 7L3.5 11.5V2.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ className = "h-3.5 w-3.5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="3" y="2.5" width="2.5" height="9" fill="currentColor" />
      <rect x="8.5" y="2.5" width="2.5" height="9" fill="currentColor" />
    </svg>
  );
}
