package com.example.techspace.config;

import com.alibaba.fastjson2.JSONObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;

@Component
public class FailureHandler implements AuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        // write your JSON here, directly to the HttpServletResponse
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        HashMap<String, Boolean> ret = new HashMap<>();
        ret.put("login", false);
        PrintWriter out = response.getWriter();
        out.print(JSONObject.toJSONString(ret));
        out.flush();
        out.close();
    }
}
