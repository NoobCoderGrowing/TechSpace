import { ArticleMap } from '../components/TypeDefinition'

/** 面板里最多显示几条。超出的部分由调用方用 hits.length 提示"请细化关键词"。 */
export const MAX_RESULTS = 8

/** [start, end)，下标基于**原始字符串**（不是 toLowerCase 的结果，见 hitRanges）。 */
export type TitleRange = [number, number]

export type SearchHit = {
  id: string
  title: string
  category: string
  date: string
  score: number
  titleRanges: TitleRange[]
  categoryRanges: TitleRange[]
}

/**
 * 转义正则元字符。
 *
 * **这不是可选的**：查询串直接进 `new RegExp` 的话，用户打一个 `(` 就会抛
 * SyntaxError，把整个渲染搞崩 —— 白屏，而且看起来跟搜索毫无关系。
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 查询 → 词元。小写化、按空白切、丢掉空串，**并且去重**。
 *
 * 去重是正确性要求：同一个词出现两次会让它被计两次分，还会产生两组完全重叠的
 * 高亮区间（虽然 mergeRanges 能合并，但分数会不公平地翻倍）。
 */
export function tokenize(query: string): string[] {
  const tokens: string[] = []
  const seen = new Set<string>()
  for (const raw of query.trim().toLowerCase().split(/\s+/)) {
    if (!raw || seen.has(raw)) continue
    seen.add(raw)
    tokens.push(raw)
  }
  return tokens
}

/**
 * 把所有词元的命中区间**合并**成有序、互不重叠的一组。
 *
 * 必须合并：词元 `ab` 和 `bc` 在 `abc` 上分别是 [0,2) 和 [1,3)，重叠。拿去切片的话
 * 会切出重复的 `b` 和一段 `slice(2,1)` 得到的空串。
 * `cur[0] <= last[1]` 里的 `<=`（而不是 `<`）把**首尾相接**的区间也并掉 ——
 * end 是开区间，所以 `[0,2)` 和 `[2,4)` 相邻，分开切会在中间插一个空片段。
 */
function mergeRanges(ranges: TitleRange[]): TitleRange[] {
  if (ranges.length < 2) return ranges
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: TitleRange[] = [[sorted[0][0], sorted[0][1]]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]
    if (current[0] <= last[1]) {
      if (current[1] > last[1]) last[1] = current[1]
    } else {
      merged.push([current[0], current[1]])
    }
  }
  return merged
}

/**
 * 在**原始字符串**上扫出所有词元的命中位置。
 *
 * 不能在 `text.toLowerCase()` 上扫出下标再拿去切原串：小写化在个别字符上会改变长度
 * （`'İ'.toLowerCase()` 是两个字符），下标从此错位，高亮会框住错误的字。
 * 所以匹配用大小写不敏感的正则跑在原串上 —— 正则的 `i` 标志不会改变下标。
 */
function hitRanges(text: string, tokens: string[]): TitleRange[] {
  const ranges: TitleRange[] = []
  for (const token of tokens) {
    const pattern = new RegExp(escapeRegExp(token), 'gi')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      ranges.push([match.index, match.index + match[0].length])
      // 空匹配不会推进 lastIndex，会死循环。词元非空且已转义，正常走不到这里，
      // 但少这一行的代价是浏览器卡死，不值得省。
      if (match.index === pattern.lastIndex) pattern.lastIndex++
    }
  }
  return mergeRanges(ranges)
}

/** 日期取时间戳，坏日期兜成 0 而不是 NaN（NaN 的比较结果会让 sort 顺序不可控）。 */
function dateValue(date: string): number {
  const time = new Date(date).valueOf()
  return Number.isNaN(time) ? 0 : time
}

type Scored = { score: number; titleRanges: TitleRange[]; categoryRanges: TitleRange[] }

/**
 * 给一篇文章打分；**所有**词元都得命中（标题或分类任一）否则返回 null（出局）。
 *
 * 打分而不是只过滤是必要的：只过滤的话结果顺序就是 Object.keys 的顺序，
 * 等于没排序 —— 命中标题的排在只命中分类的后面，用户会以为搜索坏了。
 *
 * 标题命中永远优于分类命中：`title` 精确等于词元 > 以词元开头 > 在位置 i 命中
 * （越靠前越高，位置惩罚封顶 50，免得长标题被压到跟分类命中一个量级）> 仅分类命中。
 */
function scoreOf(title: string, category: string, tokens: string[], query: string): Scored | null {
  // 归一化副本只用来算分（这里的下标差异不影响分数），高亮区间走 hitRanges 单独算。
  const titleLower = title.toLowerCase()
  const categoryLower = category.toLowerCase()

  let score = 0
  for (const token of tokens) {
    if (titleLower === token) {
      score += 200
    } else if (titleLower.startsWith(token)) {
      score += 150
    } else {
      const index = titleLower.indexOf(token)
      if (index >= 0) {
        score += 100 - Math.min(index, 50)
      } else if (categoryLower.includes(token)) {
        score += 30
      } else {
        return null
      }
    }
  }

  // 整串加成只在多词时给：它奖励的是"这几个词在标题里连在一起"，
  // 单词查询时 "整串包含" 等同于 "词元命中"，只会给所有标题命中统一加一笔常量，
  // 白白拉大标题命中与分类命中的差距，没有信息量。
  if (tokens.length > 1) {
    if (titleLower === query) score += 300
    else if (titleLower.includes(query)) score += 100
  }

  return {
    score,
    titleRanges: hitRanges(title, tokens),
    categoryRanges: hitRanges(category, tokens),
  }
}

/**
 * 在 articleMap 上搜标题和分类，按相关度排序返回**全部**命中（不截断 ——
 * 调用方需要 hits.length 才知道该不该提示"请细化关键词"，自己 slice(0, MAX_RESULTS)）。
 *
 * 纯函数，**绝不原地改 map**（store 里的 reducer 自己用就地赋值，别学那个习惯）。
 */
export function searchArticles(map: ArticleMap, query: string): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const normalized = query.trim().toLowerCase()
  const hits: SearchHit[] = []

  for (const category of Object.keys(map || {})) {
    const titles = map[category]
    if (!titles) continue
    for (const title of Object.keys(titles)) {
      const leaf = titles[title]
      if (!leaf) continue
      const scored = scoreOf(title, category, tokens, normalized)
      if (!scored) continue
      hits.push({
        id: leaf.id,
        title,
        category,
        date: leaf.date,
        score: scored.score,
        titleRanges: scored.titleRanges,
        categoryRanges: scored.categoryRanges,
      })
    }
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      dateValue(b.date) - dateValue(a.date) ||
      a.title.localeCompare(b.title)
  )
  return hits
}

/**
 * 按（已合并、已排序的）命中区间把文本切成"命中/未命中"的片段，给 React 渲染成
 * `<mark>`。不走 dangerouslySetInnerHTML —— 标题是用户内容，没有理由让它过一遍 HTML。
 */
export function splitByRanges(
  text: string,
  ranges: TitleRange[]
): { text: string; hit: boolean }[] {
  if (ranges.length === 0) return [{ text, hit: false }]

  const segments: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), hit: false })
    segments.push({ text: text.slice(start, end), hit: true })
    cursor = end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false })
  return segments
}
