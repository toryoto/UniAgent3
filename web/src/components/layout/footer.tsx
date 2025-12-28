export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-semibold">Agent Marketplace</h3>
            <p className="text-sm text-gray-600">
              A2A、x402、ブロックチェーンを融合した
              <br />
              AIエージェント向け分散型マーケットプレイス
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">リンク</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://docs.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600"
                >
                  ドキュメント
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">技術スタック</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Next.js 15 & React 19</li>
              <li>• Solidity & Base Sepolia</li>
              <li>• Privy & ethers.js</li>
              <li>• A2A & x402 Protocol</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          <p>© {currentYear} Agent Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

