package br.com.multisaude.shared;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("erro", "Dados inválidos. Verifique os campos enviados."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", "Cadastro duplicado ou referência inválida."));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    ResponseEntity<?> tooManyRequests(RateLimitExceededException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", String.valueOf(exception.retryAfterSeconds()))
            .body(Map.of("erro", "Muitas consultas em pouco tempo. Aguarde e tente novamente."));
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    ResponseEntity<?> notFound(EmptyResultDataAccessException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Registro não encontrado."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("erro",
            exception.getReason() == null ? "Operação recusada." : exception.getReason()));
    }
}
