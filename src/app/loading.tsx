import { PixelLoader } from "@/components/PixelLoader";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="rounded-[2px] border border-[#d4d4d4] bg-[#ffffff] px-8 py-7">
        <div className="flex flex-col items-center gap-4">
          <PixelLoader size="md" />
          <div className="space-y-1">
            <p className="font-display text-lg tracking-wider text-[#000000]">
              LOADING
            </p>
            <p className="font-mono text-xs text-[#525252]">
              Preparing workspace...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
