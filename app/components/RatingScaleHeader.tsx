"use client";

export default function RatingScaleHeader() {
  return (
    <div className="rating-scale-header" aria-hidden="true">
      <span>Disagree</span>
      <span className="rating-scale-spacer">·</span>
      <span>Neutral</span>
      <span className="rating-scale-spacer">·</span>
      <span>Agree</span>
    </div>
  );
}
