package com.example.techspace.service;

import com.example.techspace.config.GithubOAuthProperties;
import com.example.techspace.entity.Commenter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * GitHub OAuth 的两次服务端调用：code 换 token，token 换用户。
 *
 * 用 JDK 自带的 java.net.http.HttpClient，没有引新的 HTTP 客户端依赖。
 * client_secret 只在服务端出现，永远不进浏览器。
 */
@Service
public class GithubOAuthService {

    private static final String AUTHORIZE_ENDPOINT = "https://github.com/login/oauth/authorize";
    private static final String TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
    private static final String USER_ENDPOINT = "https://api.github.com/user";

    private final GithubOAuthProperties properties;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();

    public GithubOAuthService(GithubOAuthProperties properties) {
        this.properties = properties;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                // 换 token 那个接口对某些配置会 302，跟一下更省心；
                // 默认的 NEVER 会让它变成一个空的 302 响应体。
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public boolean isConfigured() {
        return properties.isConfigured();
    }

    /** 跳去 GitHub 授权页的地址。state 由调用方生成并存进 session。 */
    public String authorizeUrl(String state) {
        return AUTHORIZE_ENDPOINT
                + "?client_id=" + urlEncode(properties.getClientId())
                + "&redirect_uri=" + urlEncode(properties.getRedirectUri())
                + "&scope=" + urlEncode(properties.getScope())
                + "&state=" + urlEncode(state);
    }

    /** 用回调带来的 code 换 access_token。 */
    public String exchangeCodeForToken(String code) throws IOException, InterruptedException {
        String form = "client_id=" + urlEncode(properties.getClientId())
                + "&client_secret=" + urlEncode(properties.getClientSecret())
                + "&code=" + urlEncode(code)
                // redirect_uri 要再传一次，且必须和授权时用的完全一致
                + "&redirect_uri=" + urlEncode(properties.getRedirectUri());

        HttpRequest request = HttpRequest.newBuilder(URI.create(TOKEN_ENDPOINT))
                .timeout(Duration.ofSeconds(15))
                // 不加这个，GitHub 默认返回 urlencoded 而不是 JSON
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("GitHub 换 token 返回 HTTP " + response.statusCode());
        }
        JsonNode body = json.readTree(response.body());
        if (body.hasNonNull("error")) {
            throw new IOException("GitHub 拒绝换 token: " + body.path("error").asText()
                    + " / " + body.path("error_description").asText(""));
        }
        String token = body.path("access_token").asText(null);
        if (!StringUtils.hasText(token)) {
            throw new IOException("GitHub 没有返回 access_token");
        }
        return token;
    }

    /** 用 access_token 读当前用户，转成评论身份。 */
    public Commenter fetchUser(String accessToken) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(USER_ENDPOINT))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/vnd.github+json")
                .header("Authorization", "Bearer " + accessToken)
                // GitHub API 强制要求 User-Agent，缺了直接 403
                .header("User-Agent", "TechSpace-Comment")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .GET()
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("GitHub 读用户信息返回 HTTP " + response.statusCode());
        }
        JsonNode body = json.readTree(response.body());

        long id = body.path("id").asLong(0L);
        // 用户名在 GitHub 上只允许字母数字和连字符，这里再兜一次：
        // 它会被当显示名渲染，不该有任何机会带进别的东西。
        String login = body.path("login").asText("").replaceAll("[^A-Za-z0-9-]", "");
        if (id <= 0L || !StringUtils.hasText(login)) {
            throw new IOException("GitHub 返回的用户信息不完整");
        }

        return new Commenter(
                String.valueOf(id),
                login,
                // 头像用数字 id 自己拼，不用响应里的 avatar_url：
                // id 已经确认是正整数，拼出来的一定是安全 URL，
                // 不必把一个外部可控的字符串直接送进页面的 src。
                "https://avatars.githubusercontent.com/u/" + id + "?s=80",
                false);
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
