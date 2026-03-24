"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PDFPageSelector, { type LabeledPage } from "@/components/PDFPageSelector"
import { setPendingFetch } from "@/lib/pending-calculation"

export default function UploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isPDF, setIsPDF] = useState(false)
  const [scaffoldType, setScaffoldType] = useState<"くさび" | "次世代">("くさび")
  const [frameType, setFrameType] = useState<"本足場" | "一足足場">("本足場")
  const [hasSetback, setHasSetback] = useState(false)
  const [hasRShape, setHasRShape] = useState(false)
  const [isNarrowSite, setIsNarrowSite] = useState(false)
  const [buildingType, setBuildingType] = useState<"住宅" | "マンション" | "商業ビル">("住宅")
  const [workType, setWorkType] = useState<"新築" | "改修" | "解体">("新築")
  const [hasCover, setHasCover] = useState(false)
  const [hasAsagao, setHasAsagao] = useState(false)
  const [hasRoadOccupation, setHasRoadOccupation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    applyFile(e.dataTransfer.files?.[0] ?? null)
  }

  function applyFile(f: File | null) {
    setFile(f)
    setError(null)
    if (!f) { setPreview(null); setIsPDF(false); return }
    if (f.type === "application/pdf") {
      setIsPDF(true); setPreview(null)
    } else {
      setIsPDF(false); setPreview(URL.createObjectURL(f))
    }
  }

  function buildFormData(extra: Record<string, string>) {
    const fd = new FormData()
    fd.append("scaffoldType", scaffoldType)
    fd.append("frameType", frameType)
    fd.append("hasSetback", String(hasSetback))
    fd.append("hasRShape", String(hasRShape))
    fd.append("isNarrowSite", String(isNarrowSite))
    fd.append("buildingType", buildingType)
    fd.append("workType", workType)
    fd.append("hasCover", String(hasCover))
    fd.append("hasAsagao", String(hasAsagao))
    fd.append("hasRoadOccupation", String(hasRoadOccupation))
    for (const [k, v] of Object.entries(extra)) fd.append(k, v)
    return fd
  }

  function startAndNavigate(formData: FormData) {
    sessionStorage.setItem("calcSettings", JSON.stringify({ scaffoldType, frameType, hasSetback, hasRShape, isNarrowSite, buildingType, workType, hasCover, hasAsagao, hasRoadOccupation }))
    const fetchPromise = fetch("/api/calculate", { method: "POST", body: formData })
    setPendingFetch(fetchPromise)
    router.push("/result")
  }

  function handlePagesSelected(pages: LabeledPage[]) {
    const fd = buildFormData({
      pages: JSON.stringify(pages.map((p) => ({ base64: p.dataUrl, drawingType: p.drawingType }))),
    })
    startAndNavigate(fd)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError("図面ファイルを選択してください"); return }

    const fd = buildFormData({})
    fd.append("file", file)
    startAndNavigate(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 図面アップロード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">躯体図面をアップロード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="図面プレビュー" className="max-h-48 mx-auto object-contain" />
            ) : (
              <div className="text-gray-500">
                <p className="text-sm font-medium">ドラッグ＆ドロップ または クリックして選択</p>
                <p className="text-xs mt-1">JPEG / PNG / WebP / PDF</p>
              </div>
            )}
            {file && <p className="text-xs text-gray-600 mt-2">{file.name}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {isPDF && file && (
            <PDFPageSelector file={file} onPagesSelected={handlePagesSelected} />
          )}
        </CardContent>
      </Card>

      {/* 足場タイプ */}
      <Card>
        <CardHeader><CardTitle className="text-base">足場タイプ</CardTitle></CardHeader>
        <CardContent className="flex gap-6">
          {(["くさび", "次世代"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="scaffoldType" value={type} checked={scaffoldType === type} onChange={() => setScaffoldType(type)} />
              <span className="text-sm">{type}足場</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 足場構成 */}
      <Card>
        <CardHeader><CardTitle className="text-base">足場構成</CardTitle></CardHeader>
        <CardContent className="flex gap-6">
          {(["本足場", "一足足場"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="frameType" value={type} checked={frameType === type} onChange={() => setFrameType(type)} />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 建物用途 */}
      <Card>
        <CardHeader><CardTitle className="text-base">建物用途</CardTitle></CardHeader>
        <CardContent className="flex gap-6">
          {(["住宅", "マンション", "商業ビル"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="buildingType" value={type} checked={buildingType === type} onChange={() => setBuildingType(type)} />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 工事種別 */}
      <Card>
        <CardHeader><CardTitle className="text-base">工事種別</CardTitle></CardHeader>
        <CardContent className="flex gap-6">
          {(["新築", "改修", "解体"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="workType" value={type} checked={workType === type} onChange={() => setWorkType(type)} />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* 特殊条件 */}
      <Card>
        <CardHeader><CardTitle className="text-base">特殊条件</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "セットバックあり", value: hasSetback, setter: setHasSetback },
            { label: "R形状・曲面壁あり", value: hasRShape, setter: setHasRShape },
            { label: "狭小地（隣地50cm以内）", value: isNarrowSite, setter: setIsNarrowSite },
            { label: "養生シートあり", value: hasCover, setter: setHasCover },
            { label: "朝顔あり", value: hasAsagao, setter: setHasAsagao },
            { label: "道路占有あり", value: hasRoadOccupation, setter: setHasRoadOccupation },
          ].map(({ label, value, setter }) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {!isPDF && (
        <Button type="submit" disabled={!file} className="w-full">
          積算開始
        </Button>
      )}
    </form>
  )
}
