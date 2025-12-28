import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function HistoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="mb-8 text-3xl font-bold">トランザクション履歴</h1>
          <p className="text-gray-600">取引履歴を表示（実装予定）</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

