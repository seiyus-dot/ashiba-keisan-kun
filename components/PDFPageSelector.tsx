"use client"

import { useEffect, useRef, useState } from "react"

export type DrawingType = "立面図" | "平面図" | "断面図" | "不要"

const DRAWING_TYPES: DrawingType[] = ["立面図", "平面図", "断面図", "不要"]

const TYPE_STYLE: Record<DrawingType, string> = {
  立面図: "bg-blue-500 text-white",
  平面図: "bg-green-500 text-white",
  断面図: "bg-orange-500 text-white",
  不要: "bg-gray-400 text-white",
}

interface PageInfo {
  pageNumber: number
  dataUrl: string
  drawingType: DrawingType | null
}

export interface LabeledPage {
  pageNumber: number
  dataUrl: string
  drawingType: DrawingType
}

interface Props {
  file: File
  onPagesSelected: (pages: LabeledPage[]) => void
}

export default function PDFPageSelector({ file, onPagesSelected }: Props) {
  const [pages, setPages] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [renderError, setRenderError] = useState<string | null>(null)
  const renderingRef = useRef(false)

  useEffect(() => {
    if (renderingRef.current) return
    renderingRef.current = true

    async function renderPDF() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const rendered: PageInfo[] = []
        setProgress({ current: 0, total: pdf.numPages })

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.8 })
          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext("2d")!
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvasContext: ctx as any, viewport, canvas }).promise
          rendered.push({ pageNumber: i, dataUrl: canvas.toDataURL("image/jpeg", 0.8), drawingType: null })
          setProgress({ current: i, total: pdf.numPages })
        }

        setPages(rendered)
      } catch (err) {
        setRenderError(err instanceof Error ? err.message : "PDF読み込みエラー")
      } finally {
        setLoading(false)
      }
    }

    renderPDF()
  }, [file])

  function cycleType(pageNumber: number) {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageNumber !== pageNumber) return p
        if (p.drawingType === null) return { ...p, drawingType: "立面図" }
        const idx = DRAWING_TYPES.indexOf(p.drawingType)
        const next = idx < DRAWING_TYPES.length - 1 ? DRAWING_TYPES[idx + 1] : null
        return { ...p, drawingType: next }
      })
    )
  }

  function handleConfirm() {
    const labeled = pages.filter((p) => p.drawingType !== null && p.drawingType !== "不要") as LabeledPage[]
    onPagesSelected(labeled)
  }

  const usableCount = pages.filter((p) => p.drawingType !== null && p.drawingType !== "不要").length

  if (renderError) {
    return <div className="text-center py-4 text-sm text-red-600 bg-red-50 rounded-lg px-3">{renderError}</div>
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>PDF読み込み中...{progress.total > 0 && ` (${progress.current} / ${progress.total}ページ)`}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-1">
        <p>図面の種類をタップして設定してください。もう一度タップで変更できます。</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {DRAWING_TYPES.map((t) => (
            <span key={t} className={`px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[t]}`}>{t}</span>
          ))}
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">タップなし = スキップ</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
        {pages.map((p) => (
          <button
            key={p.pageNumber}
            type="button"
            onClick={() => cycleType(p.pageNumber)}
            className={`relative rounded-lg border-2 overflow-hidden transition-all ${
              p.drawingType === null || p.drawingType === "不要"
                ? "border-gray-200 hover:border-gray-400 opacity-40"
                : "border-blue-400 ring-2 ring-blue-100"
            }`}
          >
            <img src={p.dataUrl} alt={`ページ ${p.pageNumber}`} className="w-full object-contain bg-white" />
            <div className={`absolute bottom-0 left-0 right-0 text-xs py-1 text-center font-medium ${
              p.drawingType ? TYPE_STYLE[p.drawingType] : "bg-black/40 text-white"
            }`}>
              {p.drawingType ?? `p.${p.pageNumber}`}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={usableCount === 0}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          usableCount > 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {usableCount > 0 ? `${usableCount}ページで積算する` : "図面の種類を設定してください"}
      </button>
    </div>
  )
}
