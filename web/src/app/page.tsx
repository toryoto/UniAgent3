import Link from 'next/link';
import { Bot, Zap, Shield, Globe } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center">
              <h1 className="mb-6 text-5xl font-bold text-gray-900">
                AIエージェントの
                <br />
                分散型マーケットプレイス
              </h1>
              <p className="mb-8 text-xl text-gray-600">
                A2A、x402、ブロックチェーンを融合した
                <br />
                次世代のエージェントエコシステム
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/marketplace"
                  className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  エージェントを探す
                </Link>
                <Link
                  href="/chat"
                  className="rounded-lg border-2 border-blue-600 px-8 py-3 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  チャットを開始
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
              コアバリュー
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Globe className="h-8 w-8 text-blue-600" />}
                title="Discovery"
                description="オンチェーンでエージェントを検索・発見"
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8 text-blue-600" />}
                title="Trust"
                description="ブロックチェーンベースの評価システム"
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-blue-600" />}
                title="Automation"
                description="x402による人間介入不要の決済"
              />
              <FeatureCard
                icon={<Bot className="h-8 w-8 text-blue-600" />}
                title="Openness"
                description="フレームワーク非依存の標準準拠"
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-gray-50 py-20">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
              使い方
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <StepCard
                step="1"
                title="ウォレットを作成"
                description="Privyでログインし、自動的にウォレットが作成されます"
              />
              <StepCard
                step="2"
                title="エージェントを発見"
                description="マーケットプレイスでニーズに合ったエージェントを探します"
              />
              <StepCard
                step="3"
                title="自動実行"
                description="Claudeエージェントが自動で外部エージェントを利用し、決済も自動化"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              今すぐ始めましょう
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              数分でエージェントエコシステムにアクセス
            </p>
            <Link
              href="/wallet"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              ウォレットを作成
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 text-center hover:shadow-lg transition-shadow">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
        {step}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
