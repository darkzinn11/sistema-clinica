package br.com.multisaude;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** O navegador só chama PUT e DELETE se a pré-requisição (OPTIONS) deixar; antes só GET e POST passavam. */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
class CorsIntegrationTest {
    @Autowired MockMvc mvc;
    @Value("${app.cors-origin:http://localhost:5173}") String allowedOrigin;

    @Test
    void preflightAllowsPutAndDeleteFromTheConfiguredOrigin() throws Exception {
        for (String method : new String[] {"PUT", "DELETE", "POST", "GET"}) {
            mvc.perform(options("/api/v1/especialidades/" + UUID.randomUUID()).header("Origin", allowedOrigin)
                .header("Access-Control-Request-Method", method).header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", allowedOrigin))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString(method)));
        }
    }

    @Test
    void preflightIsRefusedForAnyOtherOriginOrMethod() throws Exception {
        mvc.perform(options("/api/v1/especialidades/" + UUID.randomUUID()).header("Origin", "https://site-malicioso.example")
            .header("Access-Control-Request-Method", "PUT")).andExpect(status().isForbidden());
        mvc.perform(options("/api/v1/especialidades/" + UUID.randomUUID()).header("Origin", allowedOrigin)
            .header("Access-Control-Request-Method", "PATCH")).andExpect(status().isForbidden());
    }
}
