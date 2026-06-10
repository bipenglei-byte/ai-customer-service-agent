import Link from "next/link";
import { Settings } from "lucide-react";
import ChatBox from "@/components/ChatBox";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <nav className="mb-5 flex items-center justify-between">
        <Link className="text-lg font-semibold tracking-normal text-ink" href="/">
          智答 AI客服Agent
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm text-ink shadow-sm transition hover:border-moss hover:text-moss"
          href="/admin"
        >
          <Settings className="h-4 w-4" />
          后台
        </Link>
      </nav>
      <ChatBox />
    </main>
  );
}
