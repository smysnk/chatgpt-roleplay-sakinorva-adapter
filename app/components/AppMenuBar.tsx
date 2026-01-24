"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function AppMenuBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  return (
    <header className="menu-bar">
      <div className="menu-bar-inner">
        <div className="menu-group" ref={menuRef}>
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            Indicators
          </button>
          {menuOpen ? (
            <div className="menu-panel" role="menu">
              <Link className="menu-item" href="/sakinorva-adapter" role="menuitem">
                Sakinorva
              </Link>
              <Link className="menu-item" href="/smysnk" role="menuitem">
                SMYSNK
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
