// Small inline line icons (stroke = currentColor).
const P = ({ children, size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const Flame = (p) => (
  <P {...p}><path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.4-5.6-3.6-8.7-.3 2-1.3 3.3-2.6 3.9C13 6.6 11 4 8.5 2c.4 3.6-3.5 6.5-3.5 11.2C5 19.3 8 22 12 22z" /><path d="M12 22c-1.7 0-3-1.2-3-3 0-2 1.6-2.8 2.2-4.6.9 1 3.8 2.3 3.8 4.6 0 1.8-1.3 3-3 3z" /></P>
);
export const Grain = (p) => (
  <P {...p}><path d="M3 12h18a9 9 0 0 1-18 0z" /><path d="M8 8.5c0-2 1.5-3.5 3-4M12 8.5c0-2 1.5-3.5 3-4M16 8.5c0-1.4.7-2.6 1.7-3.3" /></P>
);
export const Leaf = (p) => (
  <P {...p}><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z" /><path d="M5 19l7-7" /></P>
);
export const Box = (p) => (
  <P {...p}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></P>
);
export const Card = (p) => (
  <P {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></P>
);
export const Truck = (p) => (
  <P {...p}><path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></P>
);
export const Pin = (p) => (
  <P {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></P>
);
export const Check = (p) => <P {...p}><path d="M4 12.5l5 5L20 6.5" /></P>;
export const Plus = (p) => <P {...p}><path d="M12 5v14M5 12h14" /></P>;
export const Minus = (p) => <P {...p}><path d="M5 12h14" /></P>;
export const X = (p) => <P {...p}><path d="M6 6l12 12M18 6L6 18" /></P>;
export const Repeat = (p) => (
  <P {...p}><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></P>
);
export const Clock = (p) => <P {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></P>;
export const Insta = (p) => (
  <P {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></P>
);
export const Arrow = (p) => <P {...p}><path d="M5 12h14M13 6l6 6-6 6" /></P>;
export const Cash = (p) => (
  <P {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v5M18 9.5v5" /></P>
);
export const Bolt = (p) => <P {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></P>;
export const Printer = (p) => (
  <P {...p}><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></P>
);
export const Route = (p) => (
  <P {...p}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></P>
);
export const Users = (p) => (
  <P {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" /></P>
);
export const Gear = (p) => (
  <P {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></P>
);
export const List = (p) => <P {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></P>;
export const Money = (p) => <P {...p}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></P>;
export const Chat = (p) => <P {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></P>;
