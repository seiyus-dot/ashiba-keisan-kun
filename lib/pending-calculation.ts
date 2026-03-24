/**
 * フォームページから結果ページへ fetch Promise を渡すためのモジュール変数
 */
let pendingFetch: Promise<Response> | null = null

export function setPendingFetch(p: Promise<Response>) {
  pendingFetch = p
}

export function takePendingFetch(): Promise<Response> | null {
  const p = pendingFetch
  pendingFetch = null
  return p
}
