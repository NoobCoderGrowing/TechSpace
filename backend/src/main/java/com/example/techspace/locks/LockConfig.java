package com.example.techspace.locks;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

@Configuration
public class LockConfig {

    @Bean(name = "articleLock")
    public ReadWriteLock articleLockInit(){
        ReadWriteLock articleLock = new ReentrantReadWriteLock(true);
        return articleLock;
    }
}
