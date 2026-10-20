const paths = {
  club: "M12 2.5a4.2 4.2 0 0 0-3.4 6.7A4.2 4.2 0 1 0 10.9 16c-.3 2-1.1 3.6-2.4 4.9h7c-1.3-1.3-2.1-2.9-2.4-4.9a4.2 4.2 0 1 0 2.3-6.8A4.2 4.2 0 0 0 12 2.5z",
  spade: "M12 1.8C9.2 6 3.5 9.2 3.5 13.6a4.3 4.3 0 0 0 7.4 3c-.3 1.9-1.1 3.4-2.4 4.6h7c-1.3-1.2-2.1-2.7-2.4-4.6a4.3 4.3 0 0 0 7.4-3C20.5 9.2 14.8 6 12 1.8z",
};

interface SuitIconProps {
  suit: "club" | "spade";
  className: string;
}

export function SuitIcon({ suit, className }: SuitIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={paths[suit]} />
    </svg>
  );
}
