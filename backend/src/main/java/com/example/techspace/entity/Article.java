package com.example.techspace.entity;

import lombok.Data;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "articles")
public class Article {
    String _id;
    String title;
    String date;
    String content;
    String category;
}
