"use client";

export default function RatingScaleHeader() {
  return (
    <div className="rating-scale-header" aria-hidden="true">
      <span className="rating-scale-label start">Disagree</span>
      <span className="rating-scale-spacer" />
      <span className="rating-scale-label center">Neutral</span>
      <span className="rating-scale-spacer" />
      <span className="rating-scale-label end">Agree</span>
    </div>
  );
}
