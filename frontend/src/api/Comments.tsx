/**
 * 评论区的接口层。
 *
 * 这里所有写操作都走 postJson，而不是各自 fetch —— 因为后端有一个
 * 必须统一处理的坑，散在各处早晚会漏。
 */

const baseURL: string = import.meta.env.VITE_BASE_URL

/** 当前登录身份。/api/auth/me 的响应。 */
export type CommentIdentity = {
  authenticated: boolean
  login: string | null
  avatar: string | null
  /** 是否博主（后端把 ROLE_ADMIN 映射成这个布尔） */
  author: boolean
  /** GitHub OAuth 是否配置好了。false 时前端不显示登录按钮 */
  githubEnabled: boolean
  /** 上一次 OAuth 失败的原因：cancelled / state / oauth。一次性，读完就没了 */
  error?: string
}

/** 一条评论。字段名和后端 CommentView 一一对应。 */
export type CommentItem = {
  id: string
  /** 顶层评论为 null；回复都指向自己所属的那条顶层评论 */
  rootId: string | null
  /** 被回复者的显示名；顶层评论为 null */
  replyTo: string | null
  author: string
  avatar: string | null
  byOwner: boolean
  /** 是否自己写的（后端算好的，前端拿不到别人的作者 id） */
  mine: boolean
  /** 已消毒的正文 HTML */
  html: string
  createdAt: string
  // 注意这里没有 deleted：软删除只存在于后端存储层，读接口一律不返回已删除的评论
}

export type CommentList = {
  comments: CommentItem[]
  /** 顶层评论条数达到上限被截断过 */
  truncated: boolean
}

/**
 * 写操作的统一出口。
 *
 * **为什么不能只看 response.ok**：未登录时请求会停在安全过滤器链上，
 * 由 EntryPointHandler 应答，而它只写了 Content-Type 和正文、**没有 setStatus**
 * —— 于是返回的是 HTTP 200，正文是一句英文异常信息。只看 response.ok 的话
 * "登录已过期"会被当成"发布成功"，用户看着评论凭空消失，还不报错。
 * 所以这里校验响应体的形状（{ok:true}），形状不对就当成失败。
 */
async function postJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // 非 JSON 响应（比如反代的 HTML 错误页），下面统一按失败处理
  }

  if (payload !== null && typeof payload === 'object' && (payload as { ok?: unknown }).ok === true) {
    return
  }

  // 后端校验失败时会带一句给人看的 message，优先用它
  const message = (payload as { message?: unknown } | null)?.message
  if (typeof message === 'string' && message) {
    throw new Error(message)
  }
  if (!response.ok) {
    throw new Error(`请求失败（HTTP ${response.status}）`)
  }
  // 走到这里就是上面说的那个 200 + 非预期响应体的情况
  throw new Error('登录状态已失效，请重新登录后再试')
}

/** 当前身份。未登录也是一个正常的 200 对象，不是错误。 */
export async function fetchMe(): Promise<CommentIdentity> {
  const response = await fetch(baseURL + 'api/auth/me', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`fetchMe failed: HTTP ${response.status}`)
  }
  return response.json()
}

export async function fetchComments(articleId: string): Promise<CommentList> {
  const url = baseURL + 'api/comment/list?articleId=' + encodeURIComponent(articleId)
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`fetchComments failed: HTTP ${response.status}`)
  }
  const payload = await response.json()
  return {
    comments: Array.isArray(payload?.comments) ? payload.comments : [],
    truncated: payload?.truncated === true,
  }
}

export function createComment(articleId: string, parentId: string | null, content: string): Promise<void> {
  return postJson(baseURL + 'api/comment/create', { articleId, parentId, content })
}

export function deleteComment(id: string): Promise<void> {
  return postJson(baseURL + 'api/comment/delete', { id })
}

export function logout(): Promise<void> {
  return postJson(baseURL + 'api/auth/logout', {})
}

/**
 * GitHub 登录的跳转地址。这是一个**顶层导航**（赋给 location.href），不是 fetch：
 * OAuth 要用户亲自在 github.com 上点授权，XHR 做不了。
 *
 * returnTo 只传 pathname，不传完整 URL —— 后端只接受站内绝对路径，
 * 传完整 URL 会被判成开放重定向而丢掉，登录完直接被扔回首页。
 */
export function githubLoginUrl(returnTo: string): string {
  return baseURL + 'api/auth/github/login?returnTo=' + encodeURIComponent(returnTo)
}
