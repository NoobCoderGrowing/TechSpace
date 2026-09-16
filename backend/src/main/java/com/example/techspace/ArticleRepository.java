package com.example.techspace;

import com.example.techspace.entity.Article;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ArticleRepository extends MongoRepository<Article, String> {
    public Article findByTitle(String title);
}
