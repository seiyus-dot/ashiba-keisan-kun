"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CalcBreakdown } from "@/lib/types"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-mono text-gray-800 text-xs">{value}</span>
    </div>
  )
}

export default function CalcBreakdownPanel({ bd }: { bd: CalcBreakdown }) {
  const [open, setOpen] = useState(true)
  const [openFace, setOpenFace] = useState<string | null>(null)

  return (
    <Card className="border-gray-200">
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <CardTitle className="text-sm flex items-center justify-between text-gray-700">
          <span>📐 計算プロセス（詳細）</span>
          <span className="text-xs text-gray-400">{open ? "▲ 閉じる" : "▼ 開く"}</span>
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 pt-0">

          {/* 係数 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">適用係数</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <Row
                label={`基本係数（${bd.baseFactorReason.split("：")[0]}）`}
                value={`× ${bd.baseScaffoldFactor}`}
              />
              <div className="text-xs text-gray-400 pl-2 pb-1">{bd.baseFactorReason}</div>
              {bd.factors.map((f) => (
                <div key={f.label}>
                  <Row label={f.label} value={`+ ${f.adj}`} />
                  <div className="text-xs text-gray-400 pl-2 pb-1">{f.reason}</div>
                </div>
              ))}
              <div className="border-t border-gray-300 pt-2 mt-1">
                <Row label="最終係数" value={`× ${bd.finalFactor}`} />
              </div>
            </div>
          </section>

          {/* 足場高さ */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">足場高さ</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <Row label="計算式" value={`建物高さ + 1.8m（屋上余剰）= ${bd.scaffoldHeightBase}m`} />
            </div>
          </section>

          {/* 面別計算 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">面別計算</h3>
            <div className="space-y-1">
              {bd.faceDetails.map((f) => (
                <div key={f.face} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => setOpenFace(openFace === f.face ? null : f.face)}
                  >
                    <span className="font-medium">{f.face}面</span>
                    <span className="text-gray-500 font-mono text-xs">
                      躯体 {f.bodyArea}㎡ → 足場 {f.scaffoldArea}㎡
                      <span className="ml-2">{openFace === f.face ? "▲" : "▼"}</span>
                    </span>
                  </button>
                  {openFace === f.face && (
                    <div className="px-3 py-2 space-y-1 bg-white">
                      <Row label="① 足場高さ" value={f.scaffoldHeightFormula} />
                      <Row label="② 躯体面積" value={f.bodyAreaFormula} />
                      <Row label="③ 足場面積" value={f.scaffoldAreaFormula} />
                    </div>
                  )}
                </div>
              ))}

              {/* 屋上 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => setOpenFace(openFace === "屋上" ? null : "屋上")}
                >
                  <span className="font-medium">屋上</span>
                  <span className="text-gray-500 font-mono text-xs">
                    躯体 {bd.roofDetail.bodyArea}㎡ → 足場 {bd.roofDetail.scaffoldArea}㎡
                    <span className="ml-2">{openFace === "屋上" ? "▲" : "▼"}</span>
                  </span>
                </button>
                {openFace === "屋上" && (
                  <div className="px-3 py-2 space-y-1 bg-white">
                    <Row label="計算式" value={bd.roofDetail.formula} />
                    <div className="text-xs text-gray-400 pl-2">
                      東西幅（北面・南面の平均）× 南北幅（東面・西面の平均）× 1.05
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 font-mono">
              総躯体面積 {bd.totalBodyArea}㎡ ／ 総足場面積 {bd.totalScaffoldArea}㎡
            </div>
          </section>

          {/* 部材計算 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">部材数量の計算式</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="text-xs text-gray-400 mb-2">総足場面積 {bd.totalScaffoldArea}㎡ × 単位数量</div>
              {bd.partDetails.map((p) => (
                <Row key={p.name} label={p.name} value={p.formula} />
              ))}
            </div>
          </section>

          {/* 法令チェック詳細 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">法令チェック根拠</h3>
            <div className="space-y-2">
              {bd.legalDetails.map((l) => (
                <div key={l.item} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{l.item}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      l.status === "compliant"
                        ? "bg-green-100 text-green-700"
                        : l.status === "requires_review"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {l.status === "compliant" ? "適合" : l.status === "requires_review" ? "要確認" : "非適合"}
                    </span>
                  </div>
                  <Row label="根拠法令" value={l.law} />
                  <Row label="基準値" value={l.criterion} />
                  <Row label="設計値" value={l.designValue} />
                </div>
              ))}
            </div>
          </section>

        </CardContent>
      )}
    </Card>
  )
}
