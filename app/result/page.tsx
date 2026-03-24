"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import FaceResultTable from "@/components/FaceResultTable"
import PartsResultTable from "@/components/PartsResultTable"
import CalcBreakdownPanel from "@/components/CalcBreakdownPanel"
import { takePendingFetch } from "@/lib/pending-calculation"
import { calculate } from "@/lib/calculations"
import type { CalculationResult, LegalStatus, Note, ExtractedDimensions, CalculationSettings } from "@/lib/types"

function LegalBadge({ status }: { status: LegalStatus }) {
  if (status === "compliant") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">適合</Badge>
  if (status === "requires_review") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">要確認</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">非適合</Badge>
}

function NoteBadge({ type }: { type: Note["type"] }) {
  if (type === "注意") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shrink-0">注意</Badge>
  if (type === "確認") return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 shrink-0">確認</Badge>
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 shrink-0">情報</Badge>
}

type PageStatus = "waiting" | "done" | "error"

export default function ResultPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PageStatus>("waiting")
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [editedDims, setEditedDims] = useState<ExtractedDimensions | null>(null)
  const [settings] = useState<CalculationSettings>(() => {
    if (typeof window === "undefined")
      return { scaffoldType: "くさび", frameType: "本足場", hasSetback: false, hasRShape: false, isNarrowSite: false }
    try {
      return JSON.parse(sessionStorage.getItem("calcSettings") ?? "{}")
    } catch {
      return { scaffoldType: "くさび", frameType: "本足場", hasSetback: false, hasRShape: false, isNarrowSite: false }
    }
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const fetchPromise = takePendingFetch()
    if (!fetchPromise) { router.push("/"); return }

    async function load() {
      try {
        const res = await fetchPromise!
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as CalculationResult
        setResult(data)
        setEditedDims(JSON.parse(JSON.stringify(data.extracted_dimensions)))
        setStatus("done")
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました")
        setStatus("error")
      }
    }

    load()
  }, [router])

  function handleRecalculate() {
    if (!editedDims || !result) return
    const { faces, parts, legal_check, applied_rules, calc_breakdown } = calculate(editedDims, settings)
    setResult({ ...result, faces, parts, legal_check, applied_rules, calc_breakdown })
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-3 max-w-md">{errorMsg}</p>
          <Button variant="outline" onClick={() => router.push("/")}>← やり直す</Button>
        </div>
      </main>
    )
  }

  if (status === "waiting") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">AIが図面を解析中...</p>
          <p className="text-xs text-gray-400">寸法を読み取っています（通常10〜20秒）</p>
        </div>
      </main>
    )
  }

  if (!result) return null

  const scales = [...new Set(editedDims?.faces.map((f) => f.scale).filter(Boolean) ?? [])]
  const mixedScale = scales.length > 1

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">積算結果</h1>
          <Button variant="outline" onClick={() => router.push("/")}>← 再計算</Button>
        </div>

        {/* 読み取り寸法（編集可能） */}
        {editedDims && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>AI読み取り寸法</span>
                <span className="text-xs font-normal text-gray-500">修正して再計算できます</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mixedScale && (
                <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                  <span className="text-yellow-700 font-medium">⚠ 縮尺が混在しています：{scales.join(" / ")}</span>
                  <span className="text-yellow-600">寸法を目視で確認してください</span>
                </div>
              )}
              {!mixedScale && (
                <div className="text-xs text-gray-500">縮尺：{scales[0] ?? "不明"}</div>
              )}
              <div className="flex gap-4 text-sm text-gray-600">
                <span>階数：
                  <input
                    type="number"
                    value={editedDims.floor_count}
                    onChange={(e) => setEditedDims({ ...editedDims, floor_count: Number(e.target.value) })}
                    className="w-12 ml-1 border border-gray-300 rounded px-1 text-center text-sm"
                  />F
                </span>
                <span>建物高さ：
                  <input
                    type="number"
                    step="0.1"
                    value={editedDims.building_height}
                    onChange={(e) => setEditedDims({ ...editedDims, building_height: Number(e.target.value) })}
                    className="w-14 ml-1 border border-gray-300 rounded px-1 text-center text-sm"
                  />m
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left pb-1">面</th>
                    <th className="text-center pb-1">幅 (m)</th>
                    <th className="text-center pb-1">高さ (m)</th>
                    <th className="text-center pb-1">縮尺</th>
                  </tr>
                </thead>
                <tbody>
                  {editedDims.faces.map((f, i) => {
                    const isOdd = mixedScale && f.scale !== scales[0]
                    return (
                      <tr key={f.face} className={`border-t border-gray-100 ${isOdd ? "bg-yellow-50" : ""}`}>
                        <td className="py-1 font-medium">{f.face}面</td>
                        <td className="text-center">
                          <input
                            type="number" step="0.1" value={f.width}
                            onChange={(e) => {
                              const faces = [...editedDims.faces]
                              faces[i] = { ...f, width: Number(e.target.value) }
                              setEditedDims({ ...editedDims, faces })
                            }}
                            className="w-16 border border-gray-300 rounded px-1 text-center text-sm"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="number" step="0.1" value={f.height}
                            onChange={(e) => {
                              const faces = [...editedDims.faces]
                              faces[i] = { ...f, height: Number(e.target.value) }
                              setEditedDims({ ...editedDims, faces })
                            }}
                            className="w-16 border border-gray-300 rounded px-1 text-center text-sm"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="text" value={f.scale ?? ""}
                            onChange={(e) => {
                              const faces = [...editedDims.faces]
                              faces[i] = { ...f, scale: e.target.value }
                              setEditedDims({ ...editedDims, faces })
                            }}
                            className={`w-16 border rounded px-1 text-center text-sm ${isOdd ? "border-yellow-400 bg-yellow-50" : "border-gray-300"}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleRecalculate}
              >
                この寸法で再計算
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 面別積算結果 */}
        <Card>
          <CardHeader><CardTitle className="text-base">面別積算結果</CardTitle></CardHeader>
          <CardContent>
            <FaceResultTable faces={result.faces} />
          </CardContent>
        </Card>

        {/* 部材数量 */}
        <Card>
          <CardHeader><CardTitle className="text-base">部材数量</CardTitle></CardHeader>
          <CardContent>
            <PartsResultTable parts={result.parts} />
          </CardContent>
        </Card>

        {/* 計算プロセス（新規） */}
        <CalcBreakdownPanel bd={result.calc_breakdown} />

        {/* 法令適合チェック */}
        <Card>
          <CardHeader><CardTitle className="text-base">法令適合チェック</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>手すり高さ（安衛則563条）</span>
              <LegalBadge status={result.legal_check.handrail_height} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>壁つなぎ間隔（安衛則570条）</span>
              <LegalBadge status={result.legal_check.wall_tie_interval} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>踏み板幅（安衛則563条）</span>
              <LegalBadge status={result.legal_check.floor_width} />
            </div>
          </CardContent>
        </Card>

        {/* 適用した法令基準 */}
        <Card>
          <CardHeader><CardTitle className="text-base">適用した法令・実務基準</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-gray-700">
              {result.applied_rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400">・</span>{rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 特記事項 */}
        {result.notes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">特記事項</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <NoteBadge type={note.type} />
                    <span className="text-gray-700 leading-snug">{note.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
