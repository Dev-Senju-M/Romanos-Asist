# Comision de Romanos - Bitacora de Asistencia

Sistema de calificacion: A (asistio) = 3 pts, Ex (excusa) = 1 pt, F (no se presento) = 0 pts.

## Pasos para conectar Supabase

1. Crea un proyecto en https://supabase.com/dashboard
2. Ve a SQL Editor -> New query, pega el contenido de sql/schema.sql y ejecutalo.
3. Ve a Project Settings -> API y copia Project URL y anon public key.
4. Abre js/supabaseClient.js y reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con esos valores.
5. Abre index.html en el navegador, o usa Run index.html en IntelliJ.
