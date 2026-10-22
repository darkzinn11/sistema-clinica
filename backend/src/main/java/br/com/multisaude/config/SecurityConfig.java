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
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setExposedHeaders(List.of("X-Total-Count", "Retry-After"));
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
                .requestMatchers(HttpMethod.GET, "/api/v1/inicio").hasAuthority("agenda:ler")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes").hasAnyAuthority("pacientes:ler", "pacientes:ler_vinculados")
                .requestMatchers(HttpMethod.POST, "/api/v1/pacientes").hasAuthority("pacientes:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes/prioridades", "/api/v1/pacientes/origens-paciente", "/api/v1/pacientes/duplicados").hasAnyAuthority("pacientes:ler", "pacientes:criar")
                .requestMatchers(HttpMethod.POST, "/api/v1/pacientes/prioridades", "/api/v1/pacientes/origens-paciente").hasAuthority("pacientes:editar")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes/*/historico").hasAuthority("pacientes:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/pacientes/*/inativar", "/api/v1/pacientes/*/reativar").hasAuthority("pacientes:inativar")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes/*/evolucoes").hasAuthority("prontuario:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/agendamentos/*/evolucoes", "/api/v1/evolucoes/*/corrigir").hasAuthority("prontuario:escrever")
                .requestMatchers(HttpMethod.GET, "/api/v1/auditoria/acessos").hasAuthority("auditoria:ler")
                .requestMatchers("/api/v1/prontuario/compartilhamentos", "/api/v1/prontuario/compartilhamentos/*").hasAuthority("prontuario:compartilhar")
                .requestMatchers(HttpMethod.GET, "/api/v1/pacientes/**").hasAnyAuthority("pacientes:ler", "pacientes:ler_vinculados")
                .requestMatchers(HttpMethod.PUT, "/api/v1/pacientes/**").hasAuthority("pacientes:editar")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/pacientes/**").hasAuthority("pacientes:inativar")
                .requestMatchers(HttpMethod.GET, "/api/v1/profissionais", "/api/v1/profissionais/*", "/api/v1/profissionais/*/procedimentos").hasAuthority("profissionais:ler")
                .requestMatchers(HttpMethod.PUT, "/api/v1/profissionais/*", "/api/v1/profissionais/*/procedimentos").hasAuthority("profissionais:editar")
                .requestMatchers(HttpMethod.GET, "/api/v1/especialidades", "/api/v1/especialidades/*").hasAnyAuthority("especialidades:ler", "profissionais:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/especialidades").hasAuthority("especialidades:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/catalogo/especialidades").hasAuthority("especialidades:criar")
                .requestMatchers(HttpMethod.PUT, "/api/v1/especialidades/*").hasAuthority("especialidades:editar")
                .requestMatchers(HttpMethod.POST, "/api/v1/profissionais").hasAuthority("profissionais:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/procedimentos", "/api/v1/procedimentos/*").hasAnyAuthority("procedimentos:ler", "agenda:ler", "agenda:ler_proprios")
                .requestMatchers(HttpMethod.GET, "/api/v1/agendamentos").hasAnyAuthority("agenda:ler", "agenda:ler_proprios")
                .requestMatchers(HttpMethod.POST, "/api/v1/procedimentos").hasAuthority("procedimentos:criar")
                .requestMatchers(HttpMethod.PUT, "/api/v1/procedimentos/*").hasAuthority("procedimentos:editar")
                .requestMatchers(HttpMethod.GET, "/api/v1/procedimentos/*/historico").hasAuthority("procedimentos:editar")
                .requestMatchers(HttpMethod.GET, "/api/v1/catalogo/procedimentos").hasAuthority("procedimentos:criar")
                .requestMatchers(HttpMethod.POST, "/api/v1/agendamentos").hasAuthority("agenda:criar")
                .requestMatchers(HttpMethod.GET, "/api/v1/agendamento-motivos", "/api/v1/agendamentos/*/historico").hasAnyAuthority("agenda:ler", "agenda:ler_proprios")
                .requestMatchers(HttpMethod.POST, "/api/v1/agendamentos/*/status").hasAnyAuthority("agenda:editar", "agenda:atender")
                .requestMatchers(HttpMethod.POST, "/api/v1/agendamentos/*/remarcar").hasAuthority("agenda:remarcar")
                .requestMatchers(HttpMethod.POST, "/api/v1/agendamentos/*/cancelar").hasAuthority("agenda:cancelar")
                .requestMatchers(HttpMethod.GET, "/api/v1/grades", "/api/v1/bloqueios", "/api/v1/agenda/disponibilidade", "/api/v1/agenda/agendamentos", "/api/v1/agenda/ocupacao").hasAnyAuthority("agenda:ler", "agenda:ler_proprios")
                .requestMatchers(HttpMethod.POST, "/api/v1/grades", "/api/v1/grades/copiar", "/api/v1/bloqueios").hasAuthority("agenda:configurar")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/grades/*", "/api/v1/bloqueios/*").hasAuthority("agenda:configurar")
                .requestMatchers(HttpMethod.GET, "/api/v1/tipos-senha", "/api/v1/guiches", "/api/v1/guiches/*/atual", "/api/v1/senhas/fila").hasAuthority("fila:ler")
                .requestMatchers(HttpMethod.POST, "/api/v1/tipos-senha", "/api/v1/guiches").hasAuthority("fila:configurar")
                .requestMatchers(HttpMethod.PUT, "/api/v1/tipos-senha/*", "/api/v1/guiches/*").hasAuthority("fila:configurar")
                .requestMatchers(HttpMethod.POST, "/api/v1/senhas").hasAuthority("fila:gerar")
                .requestMatchers(HttpMethod.GET, "/api/v1/totem/tipos").hasAuthority("totem:usar")
                .requestMatchers(HttpMethod.POST, "/api/v1/totem/senhas").hasAuthority("totem:usar")
                .requestMatchers(HttpMethod.GET, "/api/v1/dispositivos").hasAuthority("fila:configurar")
                .requestMatchers(HttpMethod.POST, "/api/v1/dispositivos").hasAuthority("fila:configurar")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/dispositivos/*").hasAuthority("fila:configurar")
                .requestMatchers(HttpMethod.GET, "/api/v1/senhas/*/identificacao").hasAuthority("fila:chamar")
                .requestMatchers(HttpMethod.POST, "/api/v1/guiches/*/chamar-proxima", "/api/v1/senhas/*/chamar", "/api/v1/senhas/*/rechamar", "/api/v1/senhas/*/identificar",
                    "/api/v1/senhas/*/cadastrar-paciente", "/api/v1/senhas/*/finalizar", "/api/v1/senhas/*/ausente", "/api/v1/senhas/*/cancelar").hasAuthority("fila:chamar")
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
