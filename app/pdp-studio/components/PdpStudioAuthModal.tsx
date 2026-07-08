import { PdpStudioLoginForm } from "../login/components/PdpStudioLoginForm";

export function PdpStudioAuthModal() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 px-5">
      <div className="w-full max-w-[496px] rounded-lg bg-white px-8 py-10 shadow-[0_28px_90px_rgba(0,0,0,0.22)] sm:px-16">
        <div className="text-center">
          <h2 className="text-[28px] font-bold leading-[1.08] text-[#1d1d1f]">
            Create product-ready images
          </h2>
          <p className="mt-3 text-sm text-black/60">Log in or sign up to continue using the studio</p>
        </div>

        <div className="mt-8">
          <PdpStudioLoginForm compact />
        </div>
      </div>
    </div>
  );
}
