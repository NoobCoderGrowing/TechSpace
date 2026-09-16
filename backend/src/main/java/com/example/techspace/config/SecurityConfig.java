package com.example.techspace.config;
import jakarta.annotation.Resource;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;


@Configuration
@EnableWebSecurity
public class SecurityConfig{

    @Resource
    SuccessHandler successHandler;

    @Resource
    FailureHandler failureHandler;

    @Resource
    DenyHandler denyHandler;

    @Resource
    EntryPointHandler entryPointHandler;

    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(){
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider();
        authenticationProvider.setUserDetailsService(userDetailsService());
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        return authenticationProvider;
    }

    @Bean
    UserDetailsService userDetailsService(){
        InMemoryUserDetailsManager users = new InMemoryUserDetailsManager();
        users.createUser(User.withUsername("wenjun").password(
                passwordEncoder().encode("renzhe2zhuzhu")).roles("ADMIN").build());
        return users;
    }

    @Bean
    WebSecurityCustomizer webSecurityCustomizer(){
        return new WebSecurityCustomizer() {
            @Override
            public void customize(WebSecurity web) {
                // web.ignoring 是彻底绕开过滤器链，不是"放行" ——
                // 走这里的路径上 SecurityContextHolder 是空的，所以评论接口
                // 不能挂在 /public 底下，否则没法知道是谁在发言。
                web.ignoring().requestMatchers("/public/**");
            }
        };
    }

    /**
     * 认证信息存在哪儿。
     *
     * 默认是 RequestAttributeSecurityContextRepository 和 HttpSession 的委托组合，
     * 而 AuthController 手工登录（GitHub 回调）时要显式 saveContext，需要一个
     * 确定的仓库，所以这里只留 HttpSession 一个 —— 再由 Spring Session 落进 Redis。
     *
     * 必须是 bean：SecurityFilterChain 和 AuthController 得拿到同一个实例，
     * 写进 A 读不出来 B 就白搭。
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception{
        http
            .csrf(csrf -> csrf.disable())
            .securityContext(context -> context.securityContextRepository(securityContextRepository()))
            .authorizeHttpRequests(auth -> auth
                // 登录表单的处理地址。不显式放行的话，POST /login 会被下面
                // 的 anyRequest 规则拦下来，谁也登不进去。
                .requestMatchers("/login", "/logout").permitAll()
                // OAuth 握手的三个端点：跳转去 GitHub、跳回来、以及查询当前身份。
                // 它们本身就是"你还没登录"时要去访问的东西。
                .requestMatchers("/api/auth/**").permitAll()
                // 读评论不要求登录，写才要求。顺序要紧：先精确匹配 GET /list，
                // 再让 /api/comment/** 兜住 create 和 delete。
                .requestMatchers(HttpMethod.GET, "/api/comment/list").permitAll()
                .requestMatchers("/api/comment/**").authenticated()
                // 其余一律放行，**这是刻意的、和改动前一致的**：
                // 此前整个类里没有 authorizeHttpRequests，等于所有端点都没有
                // URL 级授权，/admin/** 一直只靠方法上的 @PreAuthorize 把关。
                // 在评论这个任务里顺手收紧它，会把失败响应从 403(@PreAuthorize
                // 抛的 AccessDeniedException) 换成入口点的应答，前端还没针对
                // 那种情况写过处理。收紧本身值得做，但要单独做一次并回归。
                .anyRequest().permitAll())
            .formLogin(form -> form
                .loginProcessingUrl("/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .successHandler(successHandler)
                .failureHandler(failureHandler))
            .exceptionHandling(handling -> handling
                .accessDeniedHandler(denyHandler)
                .authenticationEntryPoint(entryPointHandler));
        return http.build();
    }

}

