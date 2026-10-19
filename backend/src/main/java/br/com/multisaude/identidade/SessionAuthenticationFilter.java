package br.com.multisaude.identidade;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

// Instanciado apenas na cadeia do Spring Security, não como filtro global do servlet.
public class SessionAuthenticationFilter extends OncePerRequestFilter {
    private final IdentityService service;
    public SessionAuthenticationFilter(IdentityService service) { this.service = service; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            var session = service.authenticate(header.substring(7));
            if (session.isEmpty()) {
                response.setStatus(401);
                return;
            }
            var principal = session.get();
            var authorities = principal.identity().permissoes().stream().map(SimpleGrantedAuthority::new).toList();
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, authorities));
            SecurityContextHolder.setContext(context);
        }
        chain.doFilter(request, response);
    }
}
