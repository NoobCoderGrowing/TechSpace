package com.example.techspace.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * GitHub OAuth App 的三件套。
 *
 * **client-secret 绝对不能写进 application-*.properties** —— 那两个文件是
 * 进 git 的（同一个坑，证书私钥已经踩过一次了）。properties 里写的是
 * ${GITHUB_CLIENT_SECRET} 占位，值从环境变量来。
 *
 * clientId / clientSecret 任一为空时整个 GitHub 登录视为未配置，
 * 前端会收到 githubEnabled=false 并不显示登录按钮 ——
 * 比让用户点进去撞一个 GitHub 的 400 页面要好。
 */
@Component
@ConfigurationProperties(prefix = "github.oauth")
@Data
public class GithubOAuthProperties {

    private String clientId;

    private String clientSecret;

    /**
     * 必须和 GitHub OAuth App 后台登记的 callback URL 完全一致（含端口和路径），
     * 差一个字符 GitHub 就报 redirect_uri_mismatch。
     * 开发和生产的域名不同，所以在 properties 里各写各的。
     */
    private String redirectUri;

    /** 只要读公开资料就够了，不要申请 repo 之类的权限。 */
    private String scope = "read:user";

    public boolean isConfigured() {
        return StringUtils.hasText(clientId)
                && StringUtils.hasText(clientSecret)
                && StringUtils.hasText(redirectUri);
    }
}
