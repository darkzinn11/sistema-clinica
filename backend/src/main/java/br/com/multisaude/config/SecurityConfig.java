package br.com.multisaude.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import java.util.List;
import br.com.multisaude.identidade.IdentityService;
import br.com.multisaude.identidade.SessionAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, IdentityService identity,
        @Value("${app.cors-origin:http://localhost:5173}") String corsOrigin) throws Exception {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(corsOrigin));
        cors.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return http
            // API exclusivamente Bearer: não aceita cookie de sessão nem autenticação HTTP Basic.
            .csrf(csrf -> csrf.disable())
            .cors(config -> config.configurationSource(source))
            .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(new SessionAuthenticationFilter(identity), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/auth/me", "/api/v1/auth/logout", "/api/v1/unidades").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes").hasAuthority("pacientes:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/pacientes").hasAuthority("pacientes:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes/**").hasAuthority("pacientes:ler")
                .requestMatchers(HttpMethod.PUT, "/api/v1/pacientes/**").hasAuthority("pacientes:editar")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/pacientes/**").hasAuthority("pacientes:inativar")
                .requestMatchers(HttpMethod.GET, "/api/v1/profissionais", "/api/v1/especialidades").hasAuthority("profissionais:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/profissionais").hasAuthority("profissionais:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/procedimentos", "/api/v1/agendamentos").hasAuthority("agenda:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/procedimentos", "/api/v1/agendamentos").hasAuthority("agenda:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/usuarios", "/api/v1/papeis").hasAuthority("usuarios:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/usuarios").hasAuthority("usuarios:criar")
                .anyRequest().denyAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .build();
    }

    // Não habilitar usuário/senha padrão nem HTTP Basic.
    @Bean
    UserDetailsService userDetailsService() {
        return username -> { throw new UsernameNotFoundException("Usuário não encontrado"); };
    }
}
