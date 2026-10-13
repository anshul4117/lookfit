import Link from "next/link";

/**
 * Global 404 Not Found page.
 * Required by Next.js App Router for production builds.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground text-lg">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="text-primary hover:text-primary/80 underline underline-offset-4"
      >
        Go home
      </Link>
    </div>
  );
}
