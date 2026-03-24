import type {
  CalculationSettings,
  ExtractedDimensions,
  FaceResult,
  PartResult,
  LegalCheck,
  CalcBreakdown,
  FaceCalcDetail,
  PartCalcDetail,
  LegalCheckDetail,
} from "@/lib/types"

const ROOF_EXTRA_HEIGHT = 1.8 // 屋上より上に組む高さ (m)

const PARTS_PER_SQM: Record<string, Record<string, number>> = {
  くさび: {
    "支柱（建地）": 0.8,
    "水平材（布材）": 1.2,
    "斜材（ブレース）": 0.4,
    "踏板": 0.6,
    "手すり": 0.5,
    "壁つなぎ": 0.15,
    "ジャッキベース": 0.05,
  },
  次世代: {
    "支柱（建地）": 0.75,
    "水平材（布材）": 1.1,
    "斜材（ブレース）": 0.35,
    "踏板": 0.55,
    "手すり（次世代型）": 0.5,
    "壁つなぎ": 0.12,
    "ジャッキベース": 0.05,
  },
}

function r(n: number, decimals = 1): number {
  const f = Math.pow(10, decimals)
  return Math.round(n * f) / f
}

export function calculate(
  dims: ExtractedDimensions,
  settings: CalculationSettings
): {
  faces: FaceResult[]
  parts: PartResult[]
  legal_check: LegalCheck
  applied_rules: string[]
  calc_breakdown: CalcBreakdown
} {
  // ── 係数 ────────────────────────────────────────────
  const baseScaffoldFactor = settings.frameType === "本足場" ? 1.15 : 1.05
  const baseFactorReason =
    settings.frameType === "本足場"
      ? "本足場：躯体両側に足場を組む（外壁から300mm離隔 × 2）"
      : "一足足場：躯体片側のみ（外壁から300mm離隔 × 1）"

  const factors = []
  if (settings.hasSetback)
    factors.push({ label: "セットバック補正", adj: 0.05, reason: "セットバック部の廻り込みによる増加" })
  if (settings.hasRShape)
    factors.push({ label: "R形状補正", adj: 0.10, reason: "曲面・R壁部の足場延長による増加" })

  const totalAdj = factors.reduce((s, f) => s + f.adj, 0)
  const finalFactor = r(baseScaffoldFactor + totalAdj, 2)

  // ── 足場高さ ─────────────────────────────────────────
  const scaffoldHeightBase = r(dims.building_height + ROOF_EXTRA_HEIGHT, 1)

  // ── 各面 ─────────────────────────────────────────────
  const faceDetails: FaceCalcDetail[] = []
  const faces: FaceResult[] = []

  for (const face of dims.faces) {
    const scaffoldHeight = scaffoldHeightBase
    const bodyArea = r(face.width * scaffoldHeight, 1)
    const scaffoldArea = r(bodyArea * finalFactor, 1)

    faceDetails.push({
      face: face.face,
      width: face.width,
      scaffoldHeight,
      scaffoldHeightFormula: `${dims.building_height}m + ${ROOF_EXTRA_HEIGHT}m（屋上余剰）= ${scaffoldHeight}m`,
      bodyArea,
      bodyAreaFormula: `${face.width}m × ${scaffoldHeight}m = ${bodyArea}㎡`,
      scaffoldFactor: finalFactor,
      scaffoldArea,
      scaffoldAreaFormula: `${bodyArea}㎡ × ${finalFactor}（係数）= ${scaffoldArea}㎡`,
    })

    faces.push({
      face: face.face as FaceResult["face"],
      body_area: bodyArea,
      scaffold_area: scaffoldArea,
    })
  }

  // ── 屋上 ─────────────────────────────────────────────
  const nsFaces = dims.faces.filter((f) => f.face === "北" || f.face === "南")
  const ewFaces = dims.faces.filter((f) => f.face === "東" || f.face === "西")
  const ewWidth =
    nsFaces.length > 0
      ? r(nsFaces.reduce((s, f) => s + f.width, 0) / nsFaces.length, 1)
      : r(dims.faces[0]?.width ?? 10, 1)
  const nsWidth =
    ewFaces.length > 0
      ? r(ewFaces.reduce((s, f) => s + f.width, 0) / ewFaces.length, 1)
      : ewWidth

  const roofBody = r(ewWidth * nsWidth, 1)
  const roofScaffold = r(roofBody * 1.05, 1)

  faces.push({ face: "屋上", body_area: roofBody, scaffold_area: roofScaffold })

  const totalBodyArea = r(faces.reduce((s, f) => s + f.body_area, 0), 1)
  const totalScaffoldArea = r(faces.reduce((s, f) => s + f.scaffold_area, 0), 1)

  // ── 部材 ─────────────────────────────────────────────
  const partsTable = PARTS_PER_SQM[settings.scaffoldType] ?? PARTS_PER_SQM["くさび"]
  const partDetails: PartCalcDetail[] = []
  const parts: PartResult[] = []

  for (const [name, perSqm] of Object.entries(partsTable)) {
    const rawQty = totalScaffoldArea * perSqm
    const quantity = Math.ceil(rawQty)
    partDetails.push({
      name,
      perSqm,
      totalArea: totalScaffoldArea,
      rawQty: r(rawQty, 1),
      quantity,
      formula: `${totalScaffoldArea}㎡ × ${perSqm}本(枚)/㎡ = ${r(rawQty, 1)} → ${quantity}（切り上げ）`,
    })
    parts.push({ name, quantity })
  }

  // ── 法令チェック ──────────────────────────────────────
  const avgFloorHeight = r(dims.building_height / Math.max(dims.floor_count, 1), 2)
  const wallTieLimit = settings.scaffoldType === "くさび" ? 5.4 : 5.0
  const wallTieStatus: "compliant" | "requires_review" =
    avgFloorHeight <= wallTieLimit ? "compliant" : "requires_review"

  const legalDetails: LegalCheckDetail[] = [
    {
      item: "手すり高さ",
      law: "労働安全衛生規則 第563条",
      criterion: "≥ 850mm",
      designValue: "900mm（設計値）",
      status: "compliant",
    },
    {
      item: "壁つなぎ間隔（垂直）",
      law: "労働安全衛生規則 第570条",
      criterion: `≤ ${wallTieLimit}m`,
      designValue: `推定階高 ≈ ${avgFloorHeight}m（${dims.building_height}m ÷ ${dims.floor_count}階）`,
      status: wallTieStatus,
    },
    {
      item: "踏み板幅",
      law: "労働安全衛生規則 第563条",
      criterion: settings.frameType === "本足場" ? "≥ 400mm" : "≥ 200mm",
      designValue: settings.frameType === "本足場" ? "400mm（本足場標準）" : "240mm（一足標準）",
      status: "compliant",
    },
  ]

  const legal_check: LegalCheck = {
    handrail_height: legalDetails[0].status,
    wall_tie_interval: legalDetails[1].status,
    floor_width: legalDetails[2].status,
  }

  const appliedRules = [
    "労働安全衛生規則 第563条（作業床）",
    "労働安全衛生規則 第570条（鋼管足場）",
    "建設工事公衆災害防止対策要綱（足場の壁つなぎ）",
    settings.scaffoldType === "次世代"
      ? "次世代足場基準（中間手すり設置）"
      : "くさび緊結式足場の組立て等に関する技術基準",
  ]

  const calc_breakdown: CalcBreakdown = {
    baseScaffoldFactor,
    baseFactorReason,
    factors,
    finalFactor,
    scaffoldHeightBase,
    faceDetails,
    roofDetail: {
      ewWidth,
      nsWidth,
      bodyArea: roofBody,
      scaffoldArea: roofScaffold,
      formula: `${ewWidth}m（東西）× ${nsWidth}m（南北）= ${roofBody}㎡ × 1.05 = ${roofScaffold}㎡`,
    },
    totalBodyArea,
    totalScaffoldArea,
    partDetails,
    legalDetails,
    appliedRules,
  }

  return { faces, parts, legal_check, applied_rules: appliedRules, calc_breakdown }
}
