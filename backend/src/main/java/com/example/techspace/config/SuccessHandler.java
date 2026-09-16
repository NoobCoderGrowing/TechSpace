package com.example.techspace.config;

import com.alibaba.fastjson2.JSONObject;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;

@Component
public class SuccessHandler implements AuthenticationSuccessHandler {


    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        // write your JSON here, directly to the HttpServletResponse
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        HashMap<String, Boolean> ret = new HashMap<>();
        ret.put("login", true);
        PrintWriter out = response.getWriter();
        out.print(JSONObject.toJSONString(ret));
        out.flush();
        out.close();
    }

//    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
//        // write your JSON here, directly to the HttpServletResponse
//        response.setContentType("application/json;charset=UTF-8");
//        HashMap<String, Boolean> ret = new HashMap<>();
//        ret.put("login", true);
//        PrintWriter out = response.getWriter();
//        out.write(new ObjectMapper().writeValueAsString(authentication.getPrincipal()));
//        out.flush();
//        out.close();
//    }

}
