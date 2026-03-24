export type ScaffoldType = "くさび" | "次世代"
export type FrameType = "本足場" | "一足足場"
export type Face = "北" | "南" | "東" | "西" | "屋上"
export type LegalStatus = "compliant" | "requires_review" | "non_compliant"

export interface CalculationSettings {
  scaffoldType: ScaffoldType
  frameType: FrameType
  hasSetback: boolean
  hasRShape: boolean
  isNarrowSite: boolean
  buildingType?: "住宅" | "マンション" | "商業ビル"
  workType?: "新築" | "改修" | "解体"
  hasCover?: boolean
  hasAsagao?: boolean
  hasRoadOccupation?: boolean
}

export interface FaceResult {
  face: Face
  body_area: number
  scaffold_area: number
}

export interface PartResult {
  name: string
  quantity: number
}

export interface LegalCheck {
  handrail_height: LegalStatus
  wall_tie_interval: LegalStatus
  floor_width: LegalStatus
}

export type NoteType = "注意" | "確認" | "情報"

export interface Note {
  type: NoteType
  text: string
}

export interface ExtractedFace {
  face: Face
  width: number
  height: number
  scale: string
}

export interface ExtractedDimensions {
  floor_count: number
  building_height: number
  faces: ExtractedFace[]
}

// ── 計算内訳 ──────────────────────────────────────────

export interface CalcFactor {
  label: string
  adj: number
  reason: string
}

export interface FaceCalcDetail {
  face: string
  width: number
  scaffoldHeight: number
  scaffoldHeightFormula: string
  bodyArea: number
  bodyAreaFormula: string
  scaffoldFactor: number
  scaffoldArea: number
  scaffoldAreaFormula: string
}

export interface PartCalcDetail {
  name: string
  perSqm: number
  totalArea: number
  rawQty: number
  quantity: number
  formula: string
}

export interface LegalCheckDetail {
  item: string
  law: string
  criterion: string
  designValue: string
  status: LegalStatus
}

export interface CalcBreakdown {
  baseScaffoldFactor: number
  baseFactorReason: string
  factors: CalcFactor[]
  finalFactor: number
  scaffoldHeightBase: number
  faceDetails: FaceCalcDetail[]
  roofDetail: {
    ewWidth: number
    nsWidth: number
    bodyArea: number
    scaffoldArea: number
    formula: string
  }
  totalBodyArea: number
  totalScaffoldArea: number
  partDetails: PartCalcDetail[]
  legalDetails: LegalCheckDetail[]
  appliedRules: string[]
}

export interface CalculationResult {
  extracted_dimensions: ExtractedDimensions
  faces: FaceResult[]
  parts: PartResult[]
  legal_check: LegalCheck
  applied_rules: string[]
  notes: Note[]
  calc_breakdown: CalcBreakdown
}
