import Link from "next/link";
import { Button } from "@/app/shared/components/ui";

export function CTASection() {
  return (
    <div
      className="flex flex-col items-center gap-5 rounded-[16px] px-6 py-8 text-center"
      style={{ background: "linear-gradient(134deg, #2154EF 1%, #133089 99%)" }}
    >
      <h2 className="text-[22px] font-normal leading-[1.4] text-white">
        Start building outfits you&apos;ll actually love
      </h2>
      <p className="text-sm leading-[1.57] text-white">
        Try real outfits from trusted brands, see how they look on you, and make confident choices
        — before you buy.
      </p>
      <Button variant="tunal" size="default" asChild>
        <Link href="/auth">Try it Free</Link>
      </Button>
    </div>
  );
}
