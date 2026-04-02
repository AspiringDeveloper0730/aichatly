import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/Logo.png"
          alt="Logo"
          width={220}
          height={74}
          className="h-14 w-auto object-contain"
          priority
        />
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
