import rulesData from "@/data/rules.json"

export interface ScaffoldRule {
  rule_key: string
  category: string
  scaffold_type: string
  vertical_max_m?: number
  horizontal_max_m?: number
  value_numeric?: number
  value_unit?: string
  description?: string
  source: string
}

export function getRule(scaffoldType: string, category: string): ScaffoldRule | null {
  const rules = rulesData.rules as ScaffoldRule[]
  return (
    rules.find(
      (r) =>
        (r.scaffold_type === scaffoldType || r.scaffold_type === "共通") &&
        r.category === category
    ) ?? null
  )
}

export function getRulesByScaffoldType(scaffoldType: string): ScaffoldRule[] {
  const rules = rulesData.rules as ScaffoldRule[]
  return rules.filter(
    (r) => r.scaffold_type === scaffoldType || r.scaffold_type === "共通"
  )
}

export function getAllRules(): ScaffoldRule[] {
  return rulesData.rules as ScaffoldRule[]
}
