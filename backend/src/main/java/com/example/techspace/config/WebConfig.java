package com.example.techspace.config;

import jakarta.servlet.FilterRegistration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.Collections;

@Configuration
public class WebConfig {

    @Bean
    public FilterRegistrationBean corsFilter() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        // allow all ip
        corsConfiguration.setAllowedOriginPatterns(Collections.singletonList("*"));
        // all all headers
        corsConfiguration.addAllowedHeader(CorsConfiguration.ALL);
        //all all methods
        corsConfiguration.addAllowedMethod(CorsConfiguration.ALL);
        //all cookies
        corsConfiguration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        CorsFilter corsFilter = new CorsFilter(source);
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(corsFilter);
//        set this filter before security filter which is 100
        bean.setOrder(-101);
        return bean;
    }
}