"use client";
import { useState } from "react";
import { UserRound } from "lucide-react";
export function ProfileAvatar({ src, name, className = "h-16 w-16" }: { src?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState<string>();
  return <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-champagne/25 bg-gold-champagne/5 ${className}`}>
    {src && failed !== src ? <img src={src} alt={name} onError={() => setFailed(src)} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <UserRound className="h-1/2 w-1/2 text-gold-champagne" aria-hidden />}
  </span>;
}
