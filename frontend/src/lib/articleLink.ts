/**
 * 站内文章永久链接的拼法。
 *
 * 抽到 lib 里是因为有两处要用：文章目录（TableEntry）和首页的 Top 5
 * （Gallery）。这段逻辑原先内联在 TableEntry 里，靠一条注释强调"必须逐段编码"
 * —— 那种约定只要有人复制一次就会失效，做成函数才守得住。
 */

/**
 * `/blog/:id` 或 `/blog/:id/:title`。
 *
 * **逐段 encodeURIComponent，不能对拼好的整串做**：整串编码会把分隔符 `/`
 * 也变成 `%2F`，整条路径塌成一段，路由匹配不上。标题里的中文、`#`、`?`、`/`
 * 全靠它兜住。
 *
 * 标题段是装饰性的：后端只按 id 查，不校验也不解析标题
 * （见 ArticlePage 里 useParams 的注释 —— 标题在库层无唯一约束，还能改，
 * 存下来的必然过期）。所以没有标题时只给 `/blog/:id` 也是合法链接。
 */
export function articlePath(id: string, title?: string | null): string {
  return '/blog/' + encodeURIComponent(id) + (title ? '/' + encodeURIComponent(title) : '')
}
