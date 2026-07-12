import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const shared = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  "aria-hidden": true,
} as const;

export function DiscordIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path
        fill="currentColor"
        d="M19.3 5.34A17 17 0 0 0 15.2 4l-.51 1.05a15.7 15.7 0 0 0-5.37 0L8.8 4a16.7 16.7 0 0 0-4.1 1.35C2.1 9.2 1.4 12.95 1.75 16.64a16.4 16.4 0 0 0 5.03 2.54l1.23-1.68a10.5 10.5 0 0 1-1.9-.91l.47-.36c3.65 1.68 7.6 1.68 11.2 0l.48.36c-.61.36-1.25.67-1.9.91l1.22 1.68a16.4 16.4 0 0 0 5.03-2.54c.42-4.28-.72-8-3.31-11.3ZM8.73 14.37c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28c1.12 0 2.02 1.03 2 2.28 0 1.25-.88 2.27-2 2.27Zm6.54 0c-1.1 0-2-1.02-2-2.27s.88-2.28 2-2.28c1.12 0 2.02 1.03 2 2.28 0 1.25-.88 2.27-2 2.27Z"
      />
    </svg>
  );
}

export function TwitchIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path
        fill="currentColor"
        d="M2.15 1 1 5.1v15.75h5.6V24l3.15-3.15h4.1L21.3 13.4V1H2.15Zm17.1 11.4-3.3 3.3h-5.2l-2.8 2.8v-2.8H3.5V3.05h15.75V12.4Zm-3.3-5.85v5.6H13.9v-5.6h2.05Zm-5.6 0v5.6H8.3v-5.6h2.05Z"
      />
    </svg>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg {...shared} {...props} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.25-2.52c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.88A6 6 0 0 1 6.08 12c0-.65.11-1.29.31-1.88v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.6C7.18 7.75 9.39 5.98 12 5.98Z"
      />
    </svg>
  );
}
