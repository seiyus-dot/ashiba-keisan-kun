import Anthropic from "@anthropic-ai/sdk"
import type { CalculationSettings } from "@/lib/types"

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ImageInput {
  base64: string
  mediaType: "image/jpeg" | "image/png" | "image/webp"
  drawingType?: string
}

export function buildMessages(
  images: ImageInput[],
  settings: CalculationSettings
): Anthropic.MessageParam[] {
  const userPrompt = `以下の積算条件で使用する躯体図面です。

【積算条件】
- 足場タイプ：${settings.scaffoldType}
- 足場構成：${settings.frameType}
- 建物用途：${settings.buildingType ?? "住宅"}
- 工事種別：${settings.workType ?? "新築"}
- セットバックあり：${settings.hasSetback ? "はい" : "いいえ"}
- R形状・曲面壁あり：${settings.hasRShape ? "はい" : "いいえ"}
- 狭小地（隣地50cm以内）：${settings.isNarrowSite ? "はい" : "いいえ"}
- 養生シートあり：${settings.hasCover ? "はい" : "いいえ"}
- 朝顔あり：${settings.hasAsagao ? "はい" : "いいえ"}
- 道路占有あり：${settings.hasRoadOccupation ? "はい" : "いいえ"}

図面を解析して寸法情報のみを抽出してください。計算はしないでください。`

  const imageContent: Anthropic.ContentBlockParam[] = images.flatMap((img, i) => {
    const blocks: Anthropic.ContentBlockParam[] = [
      {
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      },
    ]
    if (img.drawingType) {
      blocks.push({ type: "text", text: `【画像${i + 1}：${img.drawingType}】` })
    }
    return blocks
  })

  return [
    {
      role: "user",
      content: [...imageContent, { type: "text", text: userPrompt }],
    },
  ]
}

export const SYSTEM_PROMPT = `あなたは建設業の足場積算の専門家AIです。
躯体図面の画像を解析し、寸法情報のみを抽出してください。
計算・積算・部材数量の算出は行わないでください（それは別のシステムが行います）。

図面から読み取れた縮尺・寸法を記録し、不明な点はnotesに記載してください。
縮尺が記載されていない場合は図面の形状・比率から合理的に推定してください。

最終的な回答は必ず以下のJSON形式のみで出力してください。それ以外のテキストは含めないでください：
{
  "extracted_dimensions": {
    "floor_count": 数値,
    "building_height": 数値,
    "faces": [
      {"face": "北", "width": 数値, "height": 数値, "scale": "1/100"},
      {"face": "南", "width": 数値, "height": 数値, "scale": "1/100"},
      {"face": "東", "width": 数値, "height": 数値, "scale": "1/100"},
      {"face": "西", "width": 数値, "height": 数値, "scale": "1/100"}
    ]
  },
  "notes": [
    {"type": "注意|確認|情報", "text": "20文字以内で簡潔に"}
  ]
}`
