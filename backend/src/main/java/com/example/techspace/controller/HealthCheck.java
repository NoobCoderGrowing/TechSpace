package com.example.techspace.controller;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;

@RestController
@CrossOrigin(origins = "*")
public class HealthCheck {

    @RequestMapping(value = "/public/isHealthy", method = {RequestMethod.GET, RequestMethod.POST})
    @ResponseBody
    public HashMap<String, Boolean> isHealthy(){
        HashMap response = new HashMap<String, Boolean>();
        response.put("isHealthy",true);
        return response;
    }
}
