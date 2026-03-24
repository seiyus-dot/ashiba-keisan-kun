import { NextRequest } from "next/server"
import { buildMessages, client, SYSTEM_PROMPT } from "@/lib/claude"
import { calculate } from "@/lib/calculations"
import type { CalculationSettings, ExtractedDimensions } from "@/lib/types"
import type { ImageInput } from "@/lib/claude"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
type AllowedMediaType = (typeof ALLOWED_TYPES)[number]

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const scaffoldType = formData.get("scaffoldType") as string
  const frameType = formData.get("frameType") as string
  const hasSetback = formData.get("hasSetback") === "true"
  const hasRShape = formData.get("hasRShape") === "true"
  const isNarrowSite = formData.get("isNarrowSite") === "true"
  const buildingType = formData.get("buildingType") as string | null
  const workType = formData.get("workType") as string | null
  const hasCover = formData.get("hasCover") === "true"
  const hasAsagao = formData.get("hasAsagao") === "true"
  const hasRoadOccupation = formData.get("hasRoadOccupation") === "true"

  if (!scaffoldType || !frameType) {
    return new Response(JSON.stringify({ error: "積算条件が不足しています" }), { status: 400 })
  }

  const settings: CalculationSettings = {
    scaffoldType: scaffoldType as "くさび" | "次世代",
    frameType: frameType as "本足場" | "一足足場",
    hasSetback,
    hasRShape,
    isNarrowSite,
    buildingType: (buildingType as CalculationSettings["buildingType"]) ?? "住宅",
    workType: (workType as CalculationSettings["workType"]) ?? "新築",
    hasCover,
    hasAsagao,
    hasRoadOccupation,
  }

  let images: ImageInput[]

  const pagesJson = formData.get("pages") as string | null
  if (pagesJson) {
    const pages = JSON.parse(pagesJson) as { base64: string; drawingType?: string }[]
    if (!pages.length) {
      return new Response(JSON.stringify({ error: "ページが選択されていません" }), { status: 400 })
    }
    images = pages.map((p) => {
      const isJpeg = p.base64.startsWith("data:image/jpeg")
      const mediaType = isJpeg ? "image/jpeg" : "image/png"
      const base64 = p.base64.replace(/^data:image\/(jpeg|png);base64,/, "")
      return { base64, mediaType, drawingType: p.drawingType } as ImageInput
    })
  } else {
    const file = formData.get("file") as File | null
    if (!file) return new Response(JSON.stringify({ error: "図面ファイルが必要です" }), { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type as AllowedMediaType)) {
      return new Response(JSON.stringify({ error: "JPEG・PNG・WebP形式のみ対応しています" }), { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    images = [{ base64: Buffer.from(arrayBuffer).toString("base64"), mediaType: file.type as AllowedMediaType }]
  }

  const messages = buildMessages(images, settings)

  try {
    // 1. Claude で寸法抽出
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    const jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const { extracted_dimensions, notes } = JSON.parse(jsonText) as {
      extracted_dimensions: ExtractedDimensions
      notes: Array<{ type: "注意" | "確認" | "情報"; text: string }>
    }

    // 2. コードで積算計算
    const { faces, parts, legal_check, applied_rules, calc_breakdown } = calculate(
      extracted_dimensions,
      settings
    )

    const result = {
      extracted_dimensions,
      faces,
      parts,
      legal_check,
      applied_rules,
      notes: notes ?? [],
      calc_breakdown,
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
