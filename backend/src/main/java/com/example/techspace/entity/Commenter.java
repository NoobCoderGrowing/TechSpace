package com.example.techspace.entity;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.security.Principal;

/**
 * 一条评论的作者身份。既是 SecurityContext 里的 principal，也是写评论时抄进
 * {@link Comment} 的来源。
 *
 * 站内本来只有一种身份：表单登录的 ROLE_ADMIN。评论要面向任意读者，
 * 所以引入了第二种（GitHub OAuth）。两者的差别就是 {@link #owner} 这一个布尔：
 * 它决定评论上有没有"博主"标记，也决定能否删别人的评论。
 *
 * ★ 这里的 {@link Serializable} 不是装饰，少了它 GitHub 登录会 500。
 * principal 会被塞进 SecurityContext，而会话是存在 Redis 里的
 * （spring.session.store-type=redis），Spring Session 默认用 JDK 序列化把它写出去。
 * 关键在于**写出发生在什么时候**：saveContext() 只是把它放进内存里的
 * MapSession，真正的序列化在过滤器链回卷之后的会话提交阶段，
 * 也就是 AuthController 那个 try/catch 够不着的地方。于是表现不是
 * "登录失败，请重试"，而是一个 500 白页 —— 排查时很容易往 OAuth 那边找错方向。
 * 表单登录一直没事纯属巧合：它的 principal 是 Spring Security 的 User，
 * 本来就实现了 Serializable，这条路径从来没有被验证过。
 *
 * 顺带一提，这里**不**声明 serialVersionUID：record 的序列化按类名和分量适配，
 * 根本不读它（实测：UID 1 写进去、UID 2 读出来照样成功）。
 *
 * @param id     稳定标识。GitHub 是数字 id，站主是 "admin:<用户名>"。
 *               不要用 login —— GitHub 用户名可以改，改完历史评论的作者就认不出来了。
 * @param login  显示名
 * @param avatar 头像地址；站主没有，为 null
 * @param owner  是否站长
 */
public record Commenter(String id, String login, String avatar, boolean owner)
        implements Principal, Serializable {

    @Override
    public String getName() {
        return login;
    }

    /**
     * 从当前认证信息解析出评论身份，匿名/未登录返回 null。
     *
     * 这里显式排掉 AnonymousAuthenticationToken：它的 isAuthenticated() 也是 true，
     * 只看那个布尔会把所有游客都当成已登录用户。
     */
    public static Commenter of(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Commenter commenter) {
            return commenter;
        }
        // 表单登录进来的站主，principal 是 Spring Security 的 User。
        if (principal instanceof UserDetails user) {
            boolean isOwner = auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
            return new Commenter("admin:" + user.getUsername(), user.getUsername(), null, isOwner);
        }
        return null;
    }
}
