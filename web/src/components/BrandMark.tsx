export const BrandMark = ({
  compact = false,
  animated = false,
}: {
  compact?: boolean;
  animated?: boolean;
}) => (
  <div
    className={[
      compact ? 'brand-mark brand-mark--compact' : 'brand-mark',
      animated ? 'brand-mark--animated' : '',
    ]
      .filter(Boolean)
      .join(' ')}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="brandStrokeWeb" x1="12" y1="12" x2="52" y2="52">
          <stop offset="0" stopColor="#A6FF63" />
          <stop offset="1" stopColor="#3FD68C" />
        </linearGradient>
      </defs>

      <circle
        className="brand-piece brand-piece--halo"
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="rgba(166,255,99,0.16)"
        strokeWidth="2.5"
      />
      <path
        className="brand-piece brand-piece--bar"
        d="M22 41 L41 23"
        stroke="url(#brandStrokeWeb)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g className="brand-piece brand-piece--lower-node">
        <circle
          cx="19.5"
          cy="43.5"
          r="7"
          fill="none"
          stroke="url(#brandStrokeWeb)"
          strokeWidth="3.4"
        />
        <circle cx="19.5" cy="43.5" r="2.8" fill="#09110C" />
      </g>
      <g className="brand-piece brand-piece--upper-node">
        <circle
          cx="44.5"
          cy="20.5"
          r="7"
          fill="none"
          stroke="url(#brandStrokeWeb)"
          strokeWidth="3.4"
        />
        <circle cx="44.5" cy="20.5" r="2.8" fill="#09110C" />
      </g>
      <path
        className="brand-piece brand-piece--chart"
        d="M17 22 L27 31 L34 25 L46 36"
        fill="none"
        stroke="#4FCBFF"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="brand-piece brand-piece--arrow"
        d="M41.5 35.5 H46 V31"
        fill="none"
        stroke="#4FCBFF"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
