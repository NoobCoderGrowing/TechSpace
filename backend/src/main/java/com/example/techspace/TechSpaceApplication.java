package com.example.techspace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;

@SpringBootApplication(exclude = { SecurityAutoConfiguration.class})
@EnableRedisHttpSession()
public class TechSpaceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TechSpaceApplication.class, args);
    }

}
