import Link from "next/link";

// Lotus/stupa mark from the Stitch screens, drawn as a simple inline glyph
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3c-1.6 2.6-3 4.9-3 7.4 0 1.7 1.3 3 3 3s3-1.3 3-3C15 7.9 13.6 5.6 12 3Z"
        fill="currentColor"
      />
      <path d="M6 14c2.2 0 3.2 1.3 6 1.3S15.8 14 18 14c-.7 2.6-3 4.6-6 4.6S6.7 16.6 6 14Z" fill="currentColor" opacity="0.55" />
      <path d="M4 19.5c2.4-1 4.9-1.5 8-1.5s5.6.5 8 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="brand" aria-label="ภาวนาสติ หน้าแรก">
      <span className="brand-mark">
        <BrandMark />
      </span>
      <span className="brand-name">
        ภาวนาสติ
        <small>สติปัฏฐาน ๔ · Bhavana</small>
      </span>
    </Link>
  );
}
