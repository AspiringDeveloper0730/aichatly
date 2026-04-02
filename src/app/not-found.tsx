import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <Link href="/" className="inline-flex items-center justify-center">
          <Image
            src="/Logo.png"
            alt="Logo"
            width={220}
            height={74}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-muted-foreground">The page you are looking for could not be found.</p>
        </div>
        <Button asChild className="gradient-blue-purple text-white hover:opacity-90">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
