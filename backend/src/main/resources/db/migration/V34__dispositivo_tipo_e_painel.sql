ALTER TABLE clinica.usuarios
    ADD COLUMN dispositivo_tipo text NOT NULL DEFAULT 'totem'
    CHECK (dispositivo_tipo IN ('totem', 'painel'));

CREATE INDEX usuarios_dispositivo_tipo_idx
    ON clinica.usuarios (tenant_id, dispositivo_tipo)
    WHERE dispositivo;
