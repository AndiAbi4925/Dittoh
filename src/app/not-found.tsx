import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-xs text-[#d71921]">404</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-[#000000] sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-[#525252]">
        The page you opened does not exist or may have moved. Go back home or
        start a new photo conversion.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/convert"
          className="dottoh-btn border border-[#000000] bg-[#000000] px-7 py-3.5 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
        >
          Convert a photo
        </Link>
        <Link
          href="/"
          className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-6 py-3.5 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
        >
          Go home
        </Link>
      </div>
    </section>
  );
}
