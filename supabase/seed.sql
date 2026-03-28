-- =============================================================================
-- SEED DATA: Nichos (global, workspace_id = NULL)
-- =============================================================================

INSERT INTO nichos (id, workspace_id, nombre, problemas_comunes, ofertas_recomendadas, automatizaciones_tipicas, precio_base_setup, precio_base_mensual, script_base, activo)
VALUES
  (
    gen_random_uuid(), NULL, 'Restaurantes',
    ARRAY['Pierden reservas por no contestar el teléfono fuera de horario', 'No tienen sistema de fidelización ni recogen datos de clientes', 'Gestionan pedidos online de forma manual y cometen errores', 'No recogen reseñas en Google de forma proactiva'],
    ARRAY['Agente IA para reservas por WhatsApp 24/7', 'Sistema automático de reseñas post-visita', 'Chatbot web para carta, alérgenos y pedidos', 'Automatización de campañas de fidelización por email'],
    ARRAY['Confirmación automática de reservas por WhatsApp', 'Solicitud de reseña 2h después de la visita', 'Recordatorio de reserva 24h antes', 'Envío de ofertas semanales por email a la base de datos'],
    497, 197, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Clínicas dentales',
    ARRAY['Pacientes no acuden a revisiones periódicas y se pierden', 'La recepción está saturada respondiendo llamadas repetitivas', 'No hacen seguimiento post-tratamiento', 'Presupuestos enviados por email sin seguimiento ni recordatorio'],
    ARRAY['Agente IA para citas y consultas frecuentes por WhatsApp', 'Sistema de reactivación de pacientes inactivos', 'Automatización de seguimiento post-tratamiento', 'Recordatorios inteligentes de revisiones periódicas'],
    ARRAY['Recordatorio de cita 48h y 2h antes por WhatsApp', 'Seguimiento automático 7 días post-tratamiento', 'Campaña de reactivación a pacientes sin visita en 6+ meses', 'Envío automático de presupuesto y seguimiento a los 3 días'],
    697, 247, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Inmobiliarias',
    ARRAY['Pierden leads porque no responden rápido a portales (Idealista, Fotocasa)', 'No califican leads antes de agendar visitas y pierden tiempo', 'Seguimiento manual de interesados que se olvida', 'No nutren a compradores que aún no están listos'],
    ARRAY['Agente IA de respuesta instantánea a leads de portales', 'Chatbot de cualificación de compradores/inquilinos', 'Sistema de seguimiento automático de interesados', 'Campañas de nurturing con nuevas propiedades que encajan'],
    ARRAY['Respuesta automática en <2 min a leads de Idealista/Fotocasa', 'Cualificación automática por WhatsApp (presupuesto, zona, tipo)', 'Seguimiento a los 3, 7 y 14 días si no hay respuesta', 'Alerta al agente cuando un lead cualificado responde'],
    597, 227, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Centros de estética',
    ARRAY['Clientes no vuelven después del primer tratamiento', 'La agenda tiene muchos huecos por cancelaciones de última hora', 'No comunican promociones ni nuevos servicios de forma efectiva', 'Dependen de Instagram pero no convierten seguidores en citas'],
    ARRAY['Sistema de fidelización con recordatorios de mantenimiento', 'Agente IA para gestión de citas por WhatsApp e Instagram', 'Automatización de lista de espera para huecos de agenda', 'Chatbot web con recomendaciones personalizadas de tratamientos'],
    ARRAY['Recordatorio de mantenimiento según tipo de tratamiento', 'Oferta de hueco libre a clientes en lista de espera', 'Felicitación de cumpleaños con descuento personalizado', 'Seguimiento 48h después de cada tratamiento'],
    497, 197, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Abogados',
    ARRAY['Pierden consultas potenciales fuera de horario de oficina', 'Dedican demasiado tiempo a consultas iniciales que no convierten', 'No hacen seguimiento sistemático de presupuestos enviados', 'Clientes llaman constantemente para preguntar el estado de su caso'],
    ARRAY['Agente IA para filtrar y cualificar consultas 24/7', 'Chatbot web con FAQ legales y captación de datos del caso', 'Automatización de seguimiento de presupuestos', 'Portal de estado del caso con notificaciones automáticas'],
    ARRAY['Cualificación automática de consultas por formulario web', 'Seguimiento de presupuesto a los 2, 5 y 10 días', 'Notificación al cliente cuando hay novedades en su caso', 'Recordatorio de renovación de contratos/documentos'],
    597, 227, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Gimnasios',
    ARRAY['Alta tasa de bajas en los primeros 3 meses', 'No detectan miembros en riesgo de abandonar', 'La comunicación con socios es genérica, no personalizada', 'No convierten pruebas gratuitas en altas de forma efectiva'],
    ARRAY['Sistema de detección temprana de riesgo de baja', 'Agente IA de bienvenida y onboarding de nuevos socios', 'Automatización de campañas de reactivación de socios inactivos', 'Chatbot para horarios, clases y reservas'],
    ARRAY['Secuencia de onboarding automática durante 30 días', 'Alerta interna cuando un socio reduce frecuencia de asistencia', 'Campaña de reactivación cuando un socio no viene en 2+ semanas', 'Seguimiento automático post-prueba gratuita a las 24h y 72h'],
    497, 177, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Autoescuelas',
    ARRAY['Los alumnos se frustran y abandonan antes de presentarse', 'Coordinación de clases prácticas por teléfono muy ineficiente', 'No tienen visibilidad del progreso real de cada alumno', 'Dependen del boca a boca y no generan reseñas activamente'],
    ARRAY['Agente IA para gestión de reservas de clases prácticas', 'Sistema de motivación y seguimiento del progreso del alumno', 'Automatización de solicitud de reseñas tras aprobar', 'Chatbot web para consultas de precios, horarios y matrícula'],
    ARRAY['Recordatorio de clase práctica 24h antes con documentación necesaria', 'Mensaje motivacional automático según progreso del alumno', 'Solicitud de reseña en Google tras aprobar el examen', 'Seguimiento a leads que preguntaron precio pero no se matricularon'],
    397, 157, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Clínicas veterinarias',
    ARRAY['Dueños olvidan vacunas, desparasitaciones y revisiones periódicas', 'Urgencias fuera de horario sin información clara para el dueño', 'No hacen seguimiento post-cirugía ni post-tratamiento', 'Pierden clientes que se van a clínicas con mejor comunicación'],
    ARRAY['Sistema de recordatorios veterinarios personalizados por mascota', 'Agente IA para triaje de urgencias y consultas frecuentes', 'Automatización de seguimiento post-intervención', 'Chatbot con información de servicios, precios y primeros auxilios'],
    ARRAY['Recordatorio automático de vacunas y desparasitaciones según calendario', 'Seguimiento post-cirugía a las 24h, 72h y 7 días', 'Felicitación de cumpleaños de la mascota con oferta de revisión', 'Recordatorio de revisión anual 30 días antes'],
    497, 197, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Academias de idiomas',
    ARRAY['Alta tasa de abandono tras los primeros 2-3 meses', 'No personalizan la comunicación según nivel y objetivos del alumno', 'Períodos de matrícula con picos de consultas que no gestionan bien', 'No miden ni comunican el progreso del alumno de forma motivante'],
    ARRAY['Sistema de retención con seguimiento del progreso y motivación', 'Agente IA para gestión de matrículas y consultas en períodos punta', 'Automatización de informes de progreso para alumnos y padres', 'Chatbot web con test de nivel y recomendación de curso'],
    ARRAY['Informe de progreso automático mensual por email/WhatsApp', 'Secuencia de bienvenida y onboarding durante primera semana', 'Campaña de rematrícula 30 días antes de fin de curso', 'Seguimiento de leads que hicieron test de nivel pero no se apuntaron'],
    447, 177, NULL, true
  ),
  (
    gen_random_uuid(), NULL, 'Talleres mecánicos',
    ARRAY['Clientes no vuelven para mantenimientos periódicos (ITV, aceite, filtros)', 'Comunicación telefónica ineficiente para avisar de presupuestos y recogidas', 'No tienen sistema de citas y se acumulan vehículos sin planificación', 'Pierden clientes por falta de transparencia en precios y plazos'],
    ARRAY['Sistema de recordatorios de mantenimiento e ITV', 'Agente IA para citas y consultas de estado de reparación', 'Automatización de presupuestos y aprobaciones por WhatsApp', 'Chatbot web para citas, servicios y precios orientativos'],
    ARRAY['Recordatorio de ITV 45 días antes de la fecha', 'Aviso automático por WhatsApp cuando el coche está listo', 'Recordatorio de cambio de aceite según km/fecha estimada', 'Envío de presupuesto por WhatsApp con botón de aprobación'],
    447, 177, NULL, true
  );


-- =============================================================================
-- SEED DATA: Plantillas de automatización (global, workspace_id = NULL)
-- =============================================================================

INSERT INTO plantillas_automatizacion (id, workspace_id, nombre, nicho, categoria, descripcion, trigger_desc, pasos, integraciones, n8n_template, make_template)
VALUES
  (
    gen_random_uuid(), NULL,
    'Captación de leads desde formulario web',
    NULL,
    'captacion_leads',
    'Captura leads desde un formulario web, los cualifica automáticamente y los añade al CRM con una notificación al equipo comercial.',
    'Cuando se envía un formulario de contacto en la web',
    '[{"orden":1,"descripcion":"Recibir datos del formulario vía webhook","herramienta":"Webhook"},{"orden":2,"descripcion":"Validar y enriquecer datos del lead","herramienta":"IA (Claude)"},{"orden":3,"descripcion":"Crear contacto en el CRM","herramienta":"CRM / Supabase"},{"orden":4,"descripcion":"Enviar email de bienvenida personalizado","herramienta":"Email (Resend)"},{"orden":5,"descripcion":"Notificar al comercial por Slack/WhatsApp","herramienta":"Slack / WhatsApp"}]'::jsonb,
    ARRAY['Webhook', 'Claude API', 'Supabase', 'Resend', 'Slack'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Seguimiento automático post-venta',
    NULL,
    'seguimiento_clientes',
    'Envía una secuencia de mensajes después de una venta para garantizar la satisfacción, pedir reseña y ofrecer servicios adicionales.',
    'Cuando se marca una venta como completada en el CRM',
    '[{"orden":1,"descripcion":"Detectar venta completada en el CRM","herramienta":"Supabase (trigger)"},{"orden":2,"descripcion":"Esperar 24h y enviar mensaje de agradecimiento","herramienta":"Delay + WhatsApp"},{"orden":3,"descripcion":"A los 7 días, pedir valoración del servicio","herramienta":"WhatsApp / Email"},{"orden":4,"descripcion":"Si la valoración es positiva, pedir reseña en Google","herramienta":"WhatsApp con enlace directo"},{"orden":5,"descripcion":"A los 30 días, ofrecer servicio complementario","herramienta":"Email (Resend)"}]'::jsonb,
    ARRAY['Supabase', 'WhatsApp API', 'Resend', 'Google Business'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Reactivación de clientes inactivos',
    NULL,
    'reactivacion_clientes',
    'Detecta clientes que llevan más de 60 días sin interacción y lanza una campaña personalizada de reactivación con oferta especial.',
    'Ejecución programada diaria a las 9:00',
    '[{"orden":1,"descripcion":"Consultar clientes sin actividad en 60+ días","herramienta":"Supabase (query)"},{"orden":2,"descripcion":"Generar mensaje personalizado según historial","herramienta":"IA (Claude)"},{"orden":3,"descripcion":"Enviar WhatsApp con oferta de reactivación","herramienta":"WhatsApp API"},{"orden":4,"descripcion":"Si no responde en 3 días, enviar email de seguimiento","herramienta":"Resend"},{"orden":5,"descripcion":"Registrar resultado en el CRM","herramienta":"Supabase"}]'::jsonb,
    ARRAY['Supabase', 'Claude API', 'WhatsApp API', 'Resend'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Agente WhatsApp de atención al cliente',
    NULL,
    'agente_whatsapp',
    'Agente conversacional en WhatsApp que responde preguntas frecuentes, gestiona citas y escala a un humano cuando es necesario.',
    'Cuando se recibe un mensaje de WhatsApp',
    '[{"orden":1,"descripcion":"Recibir mensaje entrante de WhatsApp","herramienta":"WhatsApp Webhook"},{"orden":2,"descripcion":"Clasificar intención del mensaje","herramienta":"IA (Claude)"},{"orden":3,"descripcion":"Si es FAQ, responder automáticamente","herramienta":"IA (Claude) + Base de conocimiento"},{"orden":4,"descripcion":"Si es cita, consultar disponibilidad y agendar","herramienta":"Google Calendar / CRM"},{"orden":5,"descripcion":"Si no puede resolver, escalar a humano con contexto","herramienta":"Slack + CRM"}]'::jsonb,
    ARRAY['WhatsApp API', 'Claude API', 'Google Calendar', 'Supabase', 'Slack'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Respuesta instantánea a leads de portales inmobiliarios',
    'Inmobiliarias',
    'captacion_leads',
    'Responde automáticamente a leads de Idealista y Fotocasa en menos de 2 minutos, cualifica al interesado y agenda una visita.',
    'Cuando se recibe un email de notificación de Idealista o Fotocasa',
    '[{"orden":1,"descripcion":"Monitorizar bandeja de entrada para emails de portales","herramienta":"Email (IMAP)"},{"orden":2,"descripcion":"Extraer datos del lead y la propiedad de interés","herramienta":"IA (Claude)"},{"orden":3,"descripcion":"Enviar WhatsApp de respuesta personalizado en <2 min","herramienta":"WhatsApp API"},{"orden":4,"descripcion":"Hacer preguntas de cualificación (presupuesto, financiación, plazo)","herramienta":"WhatsApp API + IA"},{"orden":5,"descripcion":"Si cualificado, proponer horarios de visita","herramienta":"Google Calendar"},{"orden":6,"descripcion":"Crear lead en CRM con toda la información","herramienta":"Supabase"}]'::jsonb,
    ARRAY['Email IMAP', 'Claude API', 'WhatsApp API', 'Google Calendar', 'Supabase'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Pipeline de ventas automatizado',
    NULL,
    'crm_pipeline',
    'Automatiza las transiciones del pipeline de ventas: mueve leads entre etapas, programa seguimientos y genera alertas cuando un deal se estanca.',
    'Cuando un lead cambia de etapa en el pipeline',
    '[{"orden":1,"descripcion":"Detectar cambio de etapa del lead","herramienta":"Supabase (trigger)"},{"orden":2,"descripcion":"Ejecutar acciones según la nueva etapa","herramienta":"Lógica condicional"},{"orden":3,"descripcion":"Programar próximo seguimiento automático","herramienta":"Supabase + Cron"},{"orden":4,"descripcion":"Si lleva 7+ días sin avanzar, alertar al comercial","herramienta":"Slack / Email"},{"orden":5,"descripcion":"Actualizar métricas del dashboard","herramienta":"Supabase"}]'::jsonb,
    ARRAY['Supabase', 'Slack', 'Resend'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Campaña de email marketing segmentada',
    NULL,
    'email_marketing',
    'Crea y envía campañas de email segmentadas por nicho, etapa del pipeline o intereses, con contenido generado por IA.',
    'Ejecución programada semanal o manual',
    '[{"orden":1,"descripcion":"Segmentar base de datos según criterios definidos","herramienta":"Supabase (query)"},{"orden":2,"descripcion":"Generar contenido personalizado por segmento","herramienta":"IA (Claude)"},{"orden":3,"descripcion":"Crear email con plantilla HTML","herramienta":"Resend + Template"},{"orden":4,"descripcion":"Enviar campaña con control de rate limiting","herramienta":"Resend"},{"orden":5,"descripcion":"Trackear aperturas y clics","herramienta":"Resend Analytics"},{"orden":6,"descripcion":"Actualizar engagement score de cada contacto","herramienta":"Supabase"}]'::jsonb,
    ARRAY['Supabase', 'Claude API', 'Resend'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Recordatorio de citas por WhatsApp',
    'Clínicas dentales',
    'seguimiento_clientes',
    'Envía recordatorios automáticos de citas a pacientes con opción de confirmar, cancelar o reprogramar directamente por WhatsApp.',
    'Ejecución programada diaria a las 8:00',
    '[{"orden":1,"descripcion":"Consultar citas del día siguiente y en 48h","herramienta":"Google Calendar / CRM"},{"orden":2,"descripcion":"Enviar recordatorio por WhatsApp con botones","herramienta":"WhatsApp API"},{"orden":3,"descripcion":"Procesar respuesta del paciente (confirma/cancela/reprograma)","herramienta":"WhatsApp Webhook + IA"},{"orden":4,"descripcion":"Si cancela, ofrecer hueco a pacientes en lista de espera","herramienta":"WhatsApp API + CRM"},{"orden":5,"descripcion":"Actualizar estado de la cita en el sistema","herramienta":"Google Calendar / CRM"}]'::jsonb,
    ARRAY['Google Calendar', 'WhatsApp API', 'Claude API', 'Supabase'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Onboarding automatizado de nuevos clientes',
    NULL,
    'seguimiento_clientes',
    'Secuencia de bienvenida para nuevos clientes que incluye presentación, guía de uso, check-in de satisfacción y solicitud de feedback.',
    'Cuando se registra un nuevo cliente en el CRM',
    '[{"orden":1,"descripcion":"Detectar nuevo cliente en el sistema","herramienta":"Supabase (trigger)"},{"orden":2,"descripcion":"Enviar email de bienvenida con guía de inicio","herramienta":"Resend"},{"orden":3,"descripcion":"A las 48h, enviar WhatsApp con tips personalizados","herramienta":"WhatsApp API + IA"},{"orden":4,"descripcion":"A los 7 días, hacer check-in de satisfacción","herramienta":"WhatsApp API"},{"orden":5,"descripcion":"A los 14 días, pedir feedback y ofrecer sesión de ayuda","herramienta":"Email + Calendly"}]'::jsonb,
    ARRAY['Supabase', 'Resend', 'WhatsApp API', 'Claude API', 'Calendly'],
    NULL, NULL
  ),
  (
    gen_random_uuid(), NULL,
    'Asistente de voz para consultas telefónicas',
    NULL,
    'agente_voz',
    'Agente de voz que atiende llamadas telefónicas, responde preguntas frecuentes, toma mensajes y transfiere a un humano si es necesario.',
    'Cuando se recibe una llamada telefónica al número del negocio',
    '[{"orden":1,"descripcion":"Recibir llamada entrante y saludar","herramienta":"Vapi / Twilio"},{"orden":2,"descripcion":"Identificar intención del llamante por voz","herramienta":"IA (Claude) + Speech-to-text"},{"orden":3,"descripcion":"Si es consulta simple, responder con información","herramienta":"IA + Base de conocimiento"},{"orden":4,"descripcion":"Si quiere cita, consultar disponibilidad y agendar","herramienta":"Google Calendar"},{"orden":5,"descripcion":"Si requiere atención humana, transferir con resumen del contexto","herramienta":"Twilio transfer + Slack"},{"orden":6,"descripcion":"Guardar transcripción y resumen en el CRM","herramienta":"Supabase"}]'::jsonb,
    ARRAY['Vapi', 'Twilio', 'Claude API', 'Google Calendar', 'Slack', 'Supabase'],
    NULL, NULL
  );
