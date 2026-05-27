interface FeedbackStarsProps {
  rating: number | null;
}

const starSlots = [1, 2, 3, 4, 5];

export function FeedbackStars({ rating }: FeedbackStarsProps) {
  return (
    <div className="flex items-center gap-[0.156vw] max-lg:gap-[1vw]" aria-label={rating ? `${rating} out of 5 stars` : "No rating"}>
      {starSlots.map((slot) => (
        <span
          key={slot}
          className={slot <= (rating ?? 0) ? "text-brand-blue" : "text-customer-muted/35"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}
