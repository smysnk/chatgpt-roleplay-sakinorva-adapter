"use client";

type HelpIconButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
};

export default function HelpIconButton({ label, onClick, className }: HelpIconButtonProps) {
  return (
    <button
      type="button"
      className={`help-icon-button ${className ?? ""}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      ?
    </button>
  );
}
