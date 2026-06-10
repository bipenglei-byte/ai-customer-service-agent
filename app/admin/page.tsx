import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center justify-between">
        <Link className="text-lg font-semibold tracking-normal text-ink" href="/">
          智答 AI客服Agent
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm text-ink shadow-sm transition hover:border-moss hover:text-moss"
          href="/"
        >
          <MessageSquareText className="h-4 w-4" />
          返回咨询页
        </Link>
      </nav>
      <AdminPanel />
    </main>
  );
}
