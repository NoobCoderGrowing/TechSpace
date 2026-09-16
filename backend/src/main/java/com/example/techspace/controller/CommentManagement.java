package com.example.techspace.controller;

import com.example.techspace.service.LikesService;
import jakarta.annotation.Resource;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping(value = "/comment")
@EnableMethodSecurity
public class CommentManagement {

    @Resource
    LikesService likesService;


    @RequestMapping(value = "/home/getHomeLikes", method = RequestMethod.GET)
    @ResponseBody
    public Map<String, Integer> getHomeLikes(){
        int likesCount = likesService.getHomeLikes();
        HashMap<String, Integer> ret  = new HashMap<>();
        ret.put("likesCount", likesCount);
        return ret;
    }

    @RequestMapping(value = "/home/incHomeLikes", method = RequestMethod.GET)
    @ResponseBody
    public Map<String, Integer> incHomeLikes(){
        int likesCount = likesService.incHomeLikes();
        HashMap<String, Integer> ret  = new HashMap<>();
        ret.put("likesCount", likesCount);
        return ret;
    }

    @RequestMapping(value = "/home/setHomeLikes", method = RequestMethod.GET)
    @ResponseBody
    public int incHomeLikes(@RequestParam int likesCount){
        int ret = likesService.setHomeLikes(likesCount);
        return ret;
    }
}
