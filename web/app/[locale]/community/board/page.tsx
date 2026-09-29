import { CommunityBoard } from "@/components/community/CommunityBoard";
import { Suspense } from "react";
export default function BoardPage() { return <Suspense fallback={<main className="min-h-screen bg-canvas p-12" role="status">게시판을 불러오는 중…</main>}><CommunityBoard /></Suspense>; }
