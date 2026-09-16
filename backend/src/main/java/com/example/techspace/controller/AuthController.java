package com.example.techspace.controller;

import com.example.techspace.config.FrontendProperties;
import com.example.techspace.entity.Commenter;
import com.example.techspace.service.GithubOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 评论区的身份：我是谁、怎么登、怎么退。
 *
 * 站内原本只有表单登录的 ROLE_ADMIN 一种身份（见 SecurityConfig）。
 * 评论要面向任意读者，所以这里加了第二种：GitHub OAuth。
 * 两者共用同一个 session，同一时刻只有一个生效 —— 若站主已用表单登录，
 * 再做 GitHub 登录会保留 ADMIN 权限（见 authenticate）。
 *
 * 这个类**不加 @CrossOrigin**：跨域由 WebConfig 里那个 order=-101 的全局
 * CorsFilter 统一处理。控制器级别的 @CrossOrigin 会和它抢着写响应头，
 * 而且 allowCredentials 与 origins="*" 同时出现本来就会被 Spring 拒掉。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String STATE_ATTR = "github_oauth_state";
    private static final String RETURN_TO_ATTR = "github_oauth_return_to";
    private static final String ERROR_ATTR = "github_oauth_error";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final GithubOAuthService githubOAuthService;
    private final SecurityContextRepository securityContextRepository;
    private final FrontendProperties frontendProperties;

    public AuthController(GithubOAuthService githubOAuthService,
                          SecurityContextRepository securityContextRepository,
                          FrontendProperties frontendProperties) {
        this.githubOAuthService = githubOAuthService;
        this.securityContextRepository = securityContextRepository;
        this.frontendProperties = frontendProperties;
    }

    /**
     * 前端唯一的身份来源。刻意总是返回 200 + 一个对象（而不是未登录时返回 204/null），
     * 这样前端不用区分"没人登录"和"请求失败了"两种 null。
     * githubEnabled=false 时前端就不显示登录按钮，而不是让人点进去撞 GitHub 的报错页。
     */
    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        Commenter me = currentUser();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", me != null);
        body.put("login", me == null ? null : me.login());
        body.put("avatar", me == null ? null : me.avatar());
        // "author" 在评论语境里就是博主，用 owner 这个词和 Commenter 对齐
        body.put("author", me != null && me.owner());
        body.put("githubEnabled", githubOAuthService.isConfigured());

        // 上一次 OAuth 失败的原因。放在 session 里由这里取走，而不是拼在
        // 跳回来的 URL 上 —— 文章页的地址是要被分享的，不该挂着一串错误参数。
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object error = session.getAttribute(ERROR_ATTR);
            if (error != null) {
                session.removeAttribute(ERROR_ATTR);   // 一次性，读完就清
                body.put("error", error);
            }
        }
        return body;
    }

    /**
     * 登录起点。这是个**顶层跳转**的目标（location.href 指过来），不是 fetch，
     * 所以 session cookie 走的是 SameSite=Lax 允许的顶层导航，能带上。
     */
    @GetMapping("/github/login")
    public void githubLogin(@RequestParam(required = false) String returnTo,
                            HttpServletRequest request,
                            HttpServletResponse response) throws IOException {
        if (!githubOAuthService.isConfigured()) {
            response.sendError(HttpStatus.SERVICE_UNAVAILABLE.value(), "GitHub login is not configured");
            return;
        }

        String state = newState();
        // getSession(true)：state 必须存进 session 才能在校验时拿到，
        // 也顺带保证跳去 GitHub 之前 cookie 已经下发。
        HttpSession session = request.getSession(true);
        session.setAttribute(STATE_ATTR, state);
        session.setAttribute(RETURN_TO_ATTR, sanitizeReturnTo(returnTo));

        response.sendRedirect(githubOAuthService.authorizeUrl(state));
    }

    /** GitHub 授权后跳回来。所有失败路径都不抛异常，一律回到站内并留下一个错误码。 */
    @GetMapping("/github/callback")
    public void githubCallback(@RequestParam(required = false) String code,
                               @RequestParam(required = false) String state,
                               @RequestParam(required = false) String error,
                               HttpServletRequest request,
                               HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        String expectedState = session == null ? null : (String) session.getAttribute(STATE_ATTR);
        String returnTo = sanitizeReturnTo(session == null ? null : (String) session.getAttribute(RETURN_TO_ATTR));

        // state 一次性：读出来立刻作废，同一个 state 重放不会第二次生效
        if (session != null) {
            session.removeAttribute(STATE_ATTR);
            session.removeAttribute(RETURN_TO_ATTR);
        }

        if (!githubOAuthService.isConfigured()) {
            response.sendError(HttpStatus.SERVICE_UNAVAILABLE.value(), "GitHub login is not configured");
            return;
        }
        if (StringUtils.hasText(error)) {
            // 用户在 GitHub 页面上点了"取消"
            fail(response, session, returnTo, "cancelled");
            return;
        }
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state) || expectedState == null
                || !MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8),
                                          expectedState.getBytes(StandardCharsets.UTF_8))) {
            // state 对不上就是登录 CSRF 的特征：要么 session 过期了，
            // 要么有人拿别人的 code 来换我们站上的登录态。两者都直接拒。
            fail(response, session, returnTo, "state");
            return;
        }

        try {
            Commenter commenter = githubOAuthService.fetchUser(
                    githubOAuthService.exchangeCodeForToken(code));
            authenticate(request, response, commenter);
            response.sendRedirect(absolute(returnTo));
        } catch (Exception e) {
            // 网络抖动、GitHub 限流、用户已注销应用……都会走到这。
            // 不往页面上抛堆栈，只留一个错误码。
            fail(response, session, returnTo, "oauth");
        }
    }

    /** 退出登录。表单登录和 GitHub 登录共用 session，所以这里是"全都退"。 */
    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("ok", true);
    }

    // ── 内部 ──

    /**
     * 把 GitHub 身份写进 session。
     *
     * 两件事必须按这个顺序做：
     *   1. changeSessionId() —— 会话固定防护。登录前会话可能是攻击者给的 id，
     *      登录后必须换一个。必须在写认证信息**之前**换，否则新 id 上什么都没有。
     *   2. saveContext() —— SecurityContextHolder 只是个 ThreadLocal，
     *      Spring Security 6 的 SecurityContextHolderFilter 不会自动帮你存；
     *      不显式存，这次请求结束认证就没了，下一个请求还是匿名的。
     */
    private void authenticate(HttpServletRequest request,
                              HttpServletResponse response,
                              Commenter github) {
        boolean keepOwner = isOwner(currentAuthentication());

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        Commenter principal = github;
        if (keepOwner) {
            // 站主已经用表单登录进了后台，又点了 GitHub 登录。
            // 不能因为换个身份就把 ADMIN 弄丢 —— 保留权限，但显示名和头像
            // 换成他本人的 GitHub 账号，这样评论上的"博主"标记是真的他。
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            principal = new Commenter(github.id(), github.login(), github.avatar(), true);
        }

        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, authorities));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    private void fail(HttpServletResponse response, HttpSession session, String returnTo, String code)
            throws IOException {
        if (session != null) {
            session.setAttribute(ERROR_ATTR, code);
        }
        response.sendRedirect(absolute(returnTo));
    }

    /** 直接从 SecurityContext 取，不走 @AuthenticationPrincipal —— 后者只给 principal，拿不到 authorities。 */
    private static Authentication currentAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private static Commenter currentUser() {
        return Commenter.of(currentAuthentication());
    }

    private static boolean isOwner(Authentication auth) {
        return auth != null
                && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken)
                && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    /**
     * 只接受站内绝对路径。
     *
     * returnTo 是前端传进来的，直接拿去 sendRedirect 就是一个开放重定向：
     * 攻击者构造 ?returnTo=https://evil.com，用户登录完被丢到钓鱼站，
     * 而且地址栏里刚才是我们自己的域名，看起来非常可信。
     *
     * 三种要挡的形态：
     *   //evil.com  —— 协议相对 URL，浏览器会当成跨站
     *   /\evil.com  —— 部分浏览器把反斜杠归一成斜杠，同样是跨站
     *   含 CR/LF   —— 能在 Location 头里注入额外的头或响应体（响应拆分）
     *
     * 注意这里返回的只是**路径**，送给 sendRedirect 之前必须再过一道
     * {@link #absolute}，否则会落到后端的 origin 上。
     */
    private static String sanitizeReturnTo(String returnTo) {
        if (!StringUtils.hasText(returnTo)
                || !returnTo.startsWith("/")
                || returnTo.startsWith("//")
                || returnTo.startsWith("/\\")
                || returnTo.indexOf('\r') >= 0
                || returnTo.indexOf('\n') >= 0) {
            return "/";
        }
        return returnTo;
    }

    /**
     * 把校验过的站内路径拼成**前端** origin 上的绝对地址。
     *
     * 这一步不能省。sendRedirect 收到相对路径时，浏览器是按当前 origin 解析的，
     * 而回调发生在后端自己的 origin 上（dev 和 prod 都是 :7777）。于是
     * Location: /blog/xxx 会变成 http://localhost:7777/blog/xxx ——
     * /blog/xxx 是**前端**的路由，后端没有，用户登录成功后看到的不是
     * 刚才那篇文章，而是一个 404 白页。
     *
     * 安全性不受影响：origin 来自服务端配置（{@link FrontendProperties}），
     * 路径已经过 {@link #sanitizeReturnTo} 校验，拼出来的地址必然落在前端站内。
     */
    private String absolute(String path) {
        String origin = frontendProperties.getOrigin();
        if (!StringUtils.hasText(origin)) {
            // 没配就只能给相对路径，也就是上面说的那个 404。dev 和 prod 的
            // properties 都写了这个值，走到这里说明配置漏了 ——
            // 不抛异常是因为把登录流程整个搞挂比跳错页面更糟。
            return path;
        }
        origin = origin.trim();
        while (origin.endsWith("/")) {
            origin = origin.substring(0, origin.length() - 1);
        }
        return origin + path;
    }

    /** 32 字节随机数，base64url 无填充。 */
    private static String newState() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
