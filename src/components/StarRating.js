"use client";

function Star({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill={filled ? "#4de8ff" : "none"}>
      <path
        d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 2.5z"
        stroke={filled ? "#4de8ff" : "currentColor"}
        strokeOpacity={filled ? 1 : 0.35}
        strokeWidth={1.3}
      />
    </svg>
  );
}

export default function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <Star key={n} filled={n <= (value ?? 0)} />
        ) : (
          <button key={n} type="button" onClick={() => onChange(n === value ? null : n)} className="p-0.5">
            <Star filled={n <= (value ?? 0)} />
          </button>
        )
      )}
    </div>
  );
}
