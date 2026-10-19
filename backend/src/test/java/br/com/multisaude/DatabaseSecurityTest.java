package br.com.multisaude;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DatabaseSecurityTest {
    @Autowired DataSource dataSource;
    @LocalServerPort int port;

    @Test
    void healthIsPublicAndBusinessRoutesAreBlocked() throws Exception {
        var client = HttpClient.newHttpClient();
        var health = client.send(HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + port + "/actuator/health")).GET().build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(200, health.statusCode());
        assertTrue(health.body().contains("\"status\":\"UP\""));
        var protectedRoute = client.send(HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + port + "/api/pacientes")).GET().build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(401, protectedRoute.statusCode());
    }

    @Test
    void runtimeRoleCannotSeeOtherTenantsOrCreateTables() throws Exception {
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID first = UUID.randomUUID();
                UUID second = UUID.randomUUID();
                setTenant(connection, first.toString());
                insertTenant(connection, first);
                try (var statement = connection.prepareStatement(
                    "INSERT INTO clinica.unidades (tenant_id, nome) VALUES (?, 'Unidade teste')")) {
                    statement.setObject(1, first);
                    statement.executeUpdate();
                }
                setTenant(connection, second.toString());
                insertTenant(connection, second);
                assertEquals(1, count(connection, "tenants"));
                assertEquals(0, count(connection, "unidades"));

                var savepoint = connection.setSavepoint();
                var isolationError = assertThrows(java.sql.SQLException.class, () -> {
                    try (var statement = connection.prepareStatement(
                        "INSERT INTO clinica.unidades (tenant_id, nome) VALUES (?, 'Inválida')")) {
                        statement.setObject(1, first);
                        statement.executeUpdate();
                    }
                });
                assertEquals("42501", isolationError.getSQLState());
                connection.rollback(savepoint);
                setTenant(connection, "");
                assertEquals(0, count(connection, "tenants"));
                assertEquals(0, count(connection, "unidades"));
                var privilegeError = assertThrows(java.sql.SQLException.class, () -> {
                    try (var statement = connection.createStatement()) {
                        statement.execute("CREATE TABLE clinica.must_not_exist (id integer)");
                    }
                });
                assertEquals("42501", privilegeError.getSQLState());
            } finally {
                connection.rollback();
            }
        }
    }

    private static void setTenant(Connection connection, String tenant) throws Exception {
        try (var statement = connection.prepareStatement("SELECT set_config('app.tenant_id', ?, true)")) {
            statement.setString(1, tenant);
            statement.execute();
        }
    }

    private static void insertTenant(Connection connection, UUID id) throws Exception {
        try (var statement = connection.prepareStatement(
            "INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Tenant de teste')")) {
            statement.setObject(1, id);
            statement.executeUpdate();
        }
    }

    private static int count(Connection connection, String table) throws Exception {
        try (var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT count(*) FROM clinica." + table)) {
            result.next();
            return result.getInt(1);
        }
    }
}
