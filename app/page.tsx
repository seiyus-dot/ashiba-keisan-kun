import UploadForm from "@/components/UploadForm"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">足場計算くん</h1>
          <p className="text-sm text-gray-500 mt-1">プロトタイプ</p>
        </div>
        <UploadForm />
      </div>
    </main>
  )
}
