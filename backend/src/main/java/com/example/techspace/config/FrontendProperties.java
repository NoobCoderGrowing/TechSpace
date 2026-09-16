package com.example.techspace.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 前端自己跑在哪儿。
 *
 * 存在的唯一理由是 GitHub 登录成功后的那一跳：回调是在**后端**的 origin 上发生的，
 * 而用户要回到的是**前端**的路径。302 的 Location 写相对路径时浏览器按当前 origin
 * 解析，也就是后端自己 —— 于是 /blog/xxx 变成后端路由，404。
 * 所以必须拼成绝对地址，而 origin 只能从这里来。
 *
 * **不能用请求里带来的 origin**（returnTo 传完整 URL、或者读 Origin/Referer 头）：
 * 谁都能构造一个指向自己的地址，那就是开放重定向 —— 用户刚在本站登完录，
 * 地址栏里是自己熟悉的域名，然后被送去钓鱼站。前端只被允许说
 * "我要回到站内的哪个路径"（见 AuthController.sanitizeReturnTo），
 * origin 由服务端配置说了算。
 */
@Component
@ConfigurationProperties(prefix = "frontend")
@Data
public class FrontendProperties {

    /**
     * 形如 {@code http://localhost:5173}，**不要带末尾斜杠**（带了也会被
     * AuthController.absolute 去掉，但配置干净点更好读）。
     *
     * 开发和生产的 origin 不同，两个 properties 各写各的：
     *   dev  —— vite dev server，http://localhost:5173
     *   prod —— nginx 上的 https://inforetrieval.com.cn
     * 注意两者都**不是**后端的 origin（7777），前端和后端一直是跨源部署的，
     * 只是同 site，所以 SameSite=Lax 的会话 cookie 照样能带上。
     */
    private String origin;
}
