import type {
  ExtractedDimensions,
  FaceResult,
  PartResult,
  CalculationSettings,
} from "@/lib/types"

// 足場は躯体より外側に出るため面積に掛ける係数
const SCAFFOLD_FACTOR = 1.15

// 足場タイプ・構成別の部材単位数量（㎡あたり）
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

export function recalculateFromDimensions(
  dims: ExtractedDimensions,
  settings: CalculationSettings
): { faces: FaceResult[]; parts: PartResult[] } {
  const faces: FaceResult[] = dims.faces.map((f) => {
    const body_area = Math.round(f.width * f.height * 10) / 10
    const scaffold_area = Math.round(body_area * SCAFFOLD_FACTOR * 10) / 10
    return { face: f.face as FaceResult["face"], body_area, scaffold_area }
  })

  // 屋上：建物の平面面積を幅×幅の平均で近似
  const avgWidth =
    dims.faces.reduce((s, f) => s + f.width, 0) / Math.max(dims.faces.length, 1)
  const rooftopBody = Math.round(avgWidth * avgWidth * 10) / 10
  faces.push({
    face: "屋上",
    body_area: rooftopBody,
    scaffold_area: Math.round(rooftopBody * 1.05 * 10) / 10,
  })

  const totalScaffold = faces.reduce((s, f) => s + f.scaffold_area, 0)
  const partsTable = PARTS_PER_SQM[settings.scaffoldType] ?? PARTS_PER_SQM["くさび"]

  const parts: PartResult[] = Object.entries(partsTable).map(([name, rate]) => ({
    name,
    quantity: Math.ceil(totalScaffold * rate),
  }))

  return { faces, parts }
}
