import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Decorative 3D ring of landing-page product assets that slowly rotates and
 * floats behind the login marketing copy. Pure CSS 3D (no JS); the spin/float
 * are disabled under prefers-reduced-motion via `.login-orbit*` in globals.css.
 */
const ASSETS = [
  "/brand/finds/charizard.webp",
  "/brand/finds/seiko.jpg",
  "/brand/finds/boro.jpg",
  "/brand/finds/onitsuka.jpg",
];

export function LoginOrbit() {
  const n = ASSETS.length;
  const radius = 230;
  return (
    <div aria-hidden className="login-orbit pointer-events-none absolute inset-0 z-0">
      <div className="login-orbit__tilt">
        <div className="login-orbit__ring">
          {ASSETS.map((src, i) => (
            <div
              key={src}
              className="login-orbit__slot"
              style={
                {
                  "--a": `${(360 / n) * i}deg`,
                  "--r": `${radius}px`,
                } as CSSProperties
              }
            >
              <div
                className="login-orbit__card"
                style={{ animationDelay: `${i * 1.4}s` }}
              >
                <Image src={src} alt="" fill sizes="160px" className="object-cover" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* left scrim — keeps the marketing copy crisp over the ring */}
      <div className="login-orbit__scrim" />
    </div>
  );
}
