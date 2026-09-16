import { memo, useEffect, useMemo, useState } from 'react'
import { Button, Popconfirm, Spin, message } from 'antd'
import parse, { domToReact, DOMNode } from 'html-react-parser'
import { asEl, textOf } from '../lib/domNode'
import { highlightCode } from '../lib/highlight'
import classes from './CommentSection.module.css'
import type { CommentIdentity, CommentItem } from '../api/Comments'
import {
  createComment,
  deleteComment,
  fetchComments,
  fetchMe,
  githubLoginUrl,
  logout,
} from '../api/Comments'

type props = {
  articleId: string
}

/** GitHub 回调失败时后端留在 session 里的错误码，只读得到一次。 */
const OAUTH_ERROR_TEXT: Record<string, string> = {
  cancelled: '已取消 GitHub 授权',
  state: '登录校验失败，会话可能已过期，请重试',
  oauth: 'GitHub 登录失败，请稍后重试',
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function formatTime(iso: string): string {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return ''
  const diff = Date.now() - at
  // 未来时间（客户端的钟比服务端快）会算出负数，当成"刚刚"而不是"-3 分钟前"
  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} 天前`
  // 超过一个月，相对时间已经没有信息量了，直接给日期
  const at_ = new Date(at)
  const mm = String(at_.getMonth() + 1).padStart(2, '0')
  const dd = String(at_.getDate()).padStart(2, '0')
  return `${at_.getFullYear()}-${mm}-${dd}`
}

/**
 * 评论正文的渲染接管。定义在组件外：只依赖 domNode，放里面每次渲染都会新建引用，
 * 让下面 CommentBody 的 memo 失效。
 */
function replaceCommentNode(domNode: DOMNode) {
  const el = asEl(domNode)
  if (!el) return

  // ── 外链开新标签页 ──
  // 评论区点一个链接就离开文章、丢掉阅读位置，很讨厌。后端已经给所有链接
  // 加了 rel="nofollow"，这里补 target，并**必须**同时补 noopener ——
  // 带 target="_blank" 的链接如果不加，新页面能通过 window.opener
  // 反过来操纵本页（把原页面导航去钓鱼站）。
  if (el.name === 'a') {
    return (
      <a href={el.attribs.href} target="_blank" rel="noopener noreferrer nofollow">
        {domToReact(el.children, { replace: replaceCommentNode })}
      </a>
    )
  }

  // ── 代码块 ──
  // 和 ArticleView 里那段是同一件事、同一份工具（lib/highlight + lib/domNode）：
  // 后端保留了 code 上的 language-* class（白名单里专门放行的），
  // 不在这里重新高亮的话，评论区里贴着代码的评论会比它上面的正文黯淡一截。
  if (el.name === 'pre') {
    const code = el.children.map(asEl).find((child) => child?.name === 'code')
    if (!code) return
    const lang = /language-([\w-]+)/.exec(code.attribs.class ?? '')?.[1]
    return (
      <pre>
        <code
          className={['hljs', code.attribs.class].filter(Boolean).join(' ')}
          dangerouslySetInnerHTML={{ __html: highlightCode(textOf(code), lang) }}
        />
      </pre>
    )
  }

  // 其余节点返回 undefined，交回 html-react-parser 的默认处理
  return
}

/**
 * 单条评论的正文。
 *
 * 单独抽成一个 memo 组件，是因为下面回复框的每次按键都会重渲染整个列表：
 * 不 memo 的话，每敲一个字都要把所有评论的 HTML 重新 parse 一遍
 * （里面还夹着 highlight.js），几十条评论就会明显卡顿。
 * 依赖只有 html 这个字符串，所以只有内容真变了才会重算。
 */
const CommentBody = memo(function CommentBody({ html }: { html: string }) {
  return (
    // 挂两个 class：.article-content 复用正文那套排版（见 ArticleContent.css），
    // .comment-body 只负责把字号压低一档。两者都是全局类名。
    <div className="article-content comment-body">
      {parse(html, { replace: replaceCommentNode })}
    </div>
  )
})

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <img
        className={classes.avatar}
        src={src}
        alt=""
        loading="lazy"
        // 别把文章地址通过 Referer 漏给 GitHub
        referrerPolicy="no-referrer"
      />
    )
  }
  // 站主走表单登录时没有头像地址，退化成首字母圆牌
  return (
    <span className={`${classes.avatar} ${classes.avatarFallback}`} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}

export default function CommentSection({ articleId }: props) {
  const [messageApi, contextHolder] = message.useMessage()

  const [me, setMe] = useState<CommentIdentity | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)

  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([fetchMe(), fetchComments(articleId)])
      .then(([identity, list]) => {
        if (cancelled) return
        setMe(identity)
        setComments(list.comments)
        setTruncated(list.truncated)
        if (identity.error) {
          messageApi.warning(OAUTH_ERROR_TEXT[identity.error] ?? '登录失败，请重试')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        messageApi.error(error instanceof Error ? error.message : '评论加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // 只依赖 articleId。messageApi 不放进依赖：它每次渲染的引用不保证稳定，
    // 放进去会让这个 effect 反复重跑。用闭包里的旧引用发提示没有副作用。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId])

  // 顶层评论 + 挂在它底下的全部回复。后端返回的是已经排好序的扁平列表
  // （每条顶层后面紧跟它的回复），这里只做分组，不重排。
  const threads = useMemo(() => {
    const out: { root: CommentItem; replies: CommentItem[] }[] = []
    for (const item of comments) {
      if (!item.rootId) {
        out.push({ root: item, replies: [] })
        continue
      }
      const current = out[out.length - 1]
      // 后端既保证了顺序，也保证每条回复的顶层都在它前面（被删的顶层连同
      // 它整条线程一起被滤掉了）。这个判空纯粹是防御：宁可少显示一条，
      // 也不要把整个界面搞崩。
      if (current) current.replies.push(item)
    }
    return out
  }, [comments])

  // 后端不返回已删除的评论，所以列表里每一条都是要显示的
  const total = comments.length

  async function reloadComments() {
    const list = await fetchComments(articleId)
    setComments(list.comments)
    setTruncated(list.truncated)
  }

  /** 只重拉身份。写操作失败后调一次：很可能只是登录过期了。 */
  async function refreshIdentity() {
    try {
      setMe(await fetchMe())
    } catch {
      // 身份都拉不到就别动界面了，原来的状态至少还能看
    }
  }

  async function handlePost() {
    const content = draft.trim()
    if (!content) {
      messageApi.warning('评论不能为空')
      return
    }
    setPosting(true)
    try {
      await createComment(articleId, null, content)
      setDraft('')
      await reloadComments()
      messageApi.success('已发布')
    } catch (error: unknown) {
      // 失败可能只是登录过期。不刷新身份的话，输入框还开着、按钮还能点，
      // 用户会对着一个永远发不出去的按钮反复点。
      await refreshIdentity()
      messageApi.error(error instanceof Error ? error.message : '发布失败')
    } finally {
      setPosting(false)
    }
  }

  async function handleReply() {
    if (!replyTarget) return
    const content = replyDraft.trim()
    if (!content) {
      messageApi.warning('回复不能为空')
      return
    }
    setReplying(true)
    try {
      await createComment(articleId, replyTarget.id, content)
      setReplyDraft('')
      setReplyTarget(null)
      await reloadComments()
      messageApi.success('已回复')
    } catch (error: unknown) {
      await refreshIdentity()
      messageApi.error(error instanceof Error ? error.message : '回复失败')
    } finally {
      setReplying(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteComment(id)
      await reloadComments()
      messageApi.success('已删除')
    } catch (error: unknown) {
      await refreshIdentity()
      messageApi.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // 本地会话清不掉也得把界面退回未登录态 —— 服务端的会话总会过期，
      // 让用户卡在"显示已登录但什么都做不了"才是最糟的
    }
    setReplyTarget(null)
    setDraft('')
    setReplyDraft('')
    // refreshIdentity 自己吞异常；reloadComments 不会，所以这条要接住
    await refreshIdentity()
    await reloadComments().catch(() => undefined)
  }

  function handleGithubLogin() {
    // 顶层跳转，不是 fetch —— OAuth 需要用户在 github.com 上亲自点授权，XHR 做不到。
    // 只传 pathname：后端只接受站内绝对路径，传完整 URL 会被当成开放重定向丢掉。
    window.location.href = githubLoginUrl(window.location.pathname)
  }

  function toggleReply(item: CommentItem) {
    if (replyTarget?.id === item.id) {
      setReplyTarget(null)
      return
    }
    setReplyTarget(item)
    setReplyDraft('')
  }

  function renderIdentity() {
    if (me === null) return null

    if (me.authenticated) {
      return (
        <div className={classes.identity}>
          <Avatar src={me.avatar} name={me.login ?? '?'} />
          <span className={classes.author}>{me.login}</span>
          {me.author && <span className={classes.badge}>博主</span>}
          <span className={classes.identityGrow} />
          <button type="button" className={classes.linkButton} onClick={handleLogout}>
            退出
          </button>
        </div>
      )
    }

    return (
      <div className={classes.identity}>
        <span className={classes.identityGrow}>
          {me.githubEnabled
            ? '用 GitHub 账号登录后即可评论和回复'
            : '评论区的登录入口还没配置好'}
        </span>
        {/* githubEnabled 为 false 时不显示按钮，而不是让人点进去撞 GitHub 的报错页 */}
        {me.githubEnabled && (
          <div className={classes.antdScope}>
            <Button onClick={handleGithubLogin}>用 GitHub 登录</Button>
          </div>
        )}
      </div>
    )
  }

  function renderComposer() {
    return (
      <div className={classes.composer}>
        <textarea
          className={classes.textarea}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="写下你的看法…"
          // 和后端 CommentService.MAX_LENGTH 对齐
          maxLength={10000}
        />
        <div className={classes.hint}>
          支持 Markdown：**粗体**、*斜体*、`行内代码`、```代码块```、&gt; 引用、- 列表、
          [链接](url)、~~删除线~~。标题会降级成粗体，图片会显示成链接 ——
          评论区不直接加载外部图片。
        </div>
        <div className={`${classes.composerActions} ${classes.antdScope}`}>
          <Button type="primary" loading={posting} onClick={handlePost}>
            发表
          </Button>
        </div>
      </div>
    )
  }

  function renderReplyComposer() {
    if (!replyTarget) return null
    return (
      <div className={classes.replyComposer}>
        <textarea
          className={`${classes.textarea} ${classes.textareaSmall}`}
          value={replyDraft}
          onChange={(event) => setReplyDraft(event.target.value)}
          placeholder={`回复 @${replyTarget.author}`}
          maxLength={10000}
        />
        <div className={`${classes.composerActions} ${classes.antdScope}`}>
          <button type="button" className={classes.linkButton} onClick={() => setReplyTarget(null)}>
            取消
          </button>
          <Button type="primary" size="small" loading={replying} onClick={handleReply}>
            回复
          </Button>
        </div>
      </div>
    )
  }

  /** childCount 只对顶层有意义：删顶层会连带它的回复一起消失，确认框要说明这一点。 */
  function renderComment(item: CommentItem, isReply: boolean, childCount = 0) {
    return (
      <div className={classes.comment} key={item.id}>
        <Avatar src={item.avatar} name={item.author} />
        <div className={classes.commentMain}>
          <div className={classes.meta}>
            <span className={classes.author}>{item.author}</span>
            {item.byOwner && <span className={classes.badge}>博主</span>}
            {/* 回复的回复被平铺到了第二层（见 Comment.rootId），
                靠这个前缀说明它到底在回谁 */}
            {isReply && item.replyTo && (
              <span className={classes.replyTo}>
                回复 <span className={classes.replyToName}>@{item.replyTo}</span>
              </span>
            )}
            <span className={classes.time}>{formatTime(item.createdAt)}</span>
          </div>

          <CommentBody html={item.html} />

          <div className={classes.commentActions}>
            {me?.authenticated && (
              <button type="button" className={classes.linkButton} onClick={() => toggleReply(item)}>
                {replyTarget?.id === item.id ? '收起' : '回复'}
              </button>
            )}
            {/* mine 是后端算好的：前端拿不到别人的作者 id，无从自行判断 */}
            {item.mine && (
              <Popconfirm
                // 删顶层会连带底下所有回复一起消失（后端把整条线程滤掉），
                // 这个后果必须提前说清楚：确认框上只写"删除这条评论？"的话，
                // 点下去会连带别人写的回复一起不见，而那是不可撤销的。
                title={
                  childCount > 0
                    ? `删除这条评论？它底下的 ${childCount} 条回复也会一起消失。`
                    : '删除这条评论？'
                }
                okText="删除"
                cancelText="取消"
                onConfirm={() => handleDelete(item.id)}
              >
                <button type="button" className={`${classes.linkButton} ${classes.danger}`}>
                  删除
                </button>
              </Popconfirm>
            )}
          </div>

          {replyTarget?.id === item.id && renderReplyComposer()}
        </div>
      </div>
    )
  }

  return (
    <section className={classes.section}>
      {contextHolder}

      <h2 className={classes.heading}>
        评论
        {total > 0 && <span className={classes.count}>{total}</span>}
      </h2>

      {renderIdentity()}
      {me?.authenticated && renderComposer()}

      {loading ? (
        <div className={classes.empty}>
          <Spin />
        </div>
      ) : threads.length === 0 ? (
        <div className={classes.empty}>还没有评论，来说第一句？</div>
      ) : (
        threads.map((thread) => (
          <div className={classes.thread} key={thread.root.id}>
            {renderComment(thread.root, false, thread.replies.length)}
            {thread.replies.length > 0 && (
              // 两层显示的"第二层"：所有回复平铺在这一个盒子里，靠左边那条
              // 竖线表达从属关系，不会再嵌套
              <div className={classes.replyList}>
                {thread.replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        ))
      )}

      {truncated && <div className={classes.truncated}>评论较多，这里只显示了最近的一部分。</div>}
    </section>
  )
}
