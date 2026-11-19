"use client";

import Link from "next/link";
import { useEffect } from "react";

interface AppErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorPage({ error, reset }: AppErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Unhandled route error:", error);
    }
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-xs text-[#d71921]">Error</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-[#000000] sm:text-5xl">
        Something went wrong
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[#525252]">
        An unexpected problem interrupted this page. Try loading it again, or
        return to the home page.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="dittoh-btn border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
        >
          Go home
        </Link>
      </div>
    </section>
  );
}
