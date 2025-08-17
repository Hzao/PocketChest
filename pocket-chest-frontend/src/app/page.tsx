import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="text-8xl mb-6">📦</div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">PocketChest</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secure, temporary file sharing. Upload files or text, get a code, share anywhere.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link href="/share" className="group block">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border-2 border-transparent hover:border-blue-200 transform hover:scale-105 h-full flex flex-col">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">📤</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Share Files</h2>
              <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                Upload files or text content to generate a secure retrieval code. 
                Set expiry time and share with anyone.
              </p>
              <div className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold group-hover:bg-blue-600 transition-colors duration-300">
                Start Sharing
              </div>
            </div>
          </Link>

          <Link href="/retrieve" className="group block">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border-2 border-transparent hover:border-green-200 transform hover:scale-105 h-full flex flex-col">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">📥</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Retrieve Files</h2>
              <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                Have a retrieval code? Enter it here to access and download 
                shared files and text content.
              </p>
              <div className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold group-hover:bg-green-600 transition-colors duration-300">
                Enter Code
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Files are automatically deleted after expiry. No account required.
          </p>
        </div>
      </div>
    </main>
  );
}