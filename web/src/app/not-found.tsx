import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🏴‍☠️</div>
        <h1 className="text-3xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-2">このページは海の果てに消えてしまった</p>
        <p className="text-gray-500 text-sm mb-6">ルフィも見つけられなかった...</p>
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium inline-block"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
