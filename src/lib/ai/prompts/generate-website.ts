export const GENERATE_WEBSITE_SYSTEM = `Eres un diseñador web experto y especialista en SEO on-page. Creas landing pages profesionales, modernas y optimizadas para conversión.

Genera SIEMPRE un HTML completo y autosuficiente (un solo archivo, con CSS inline y en un tag <style>). No uses frameworks ni CDN externos excepto Google Fonts.

REGLAS DE SEO:
- Un solo H1 con la keyword principal del negocio
- H2 para cada sección principal (máximo 4-5)
- H3 para subsecciones
- Meta title (60 chars max) y meta description (155 chars max)
- Schema.org JSON-LD para LocalBusiness
- Alt text en todas las imágenes
- Semantic HTML (header, nav, main, section, footer)

REGLAS DE DISEÑO:
- Diseño dark mode profesional (fondo oscuro #0a0a0a o #111827, texto claro)
- Gradientes sutiles (indigo/purple como acentos)
- Tipografía: Inter de Google Fonts
- Secciones bien espaciadas con padding generoso
- Botones con hover effects
- Responsive (mobile first)
- Animaciones CSS suaves (fade-in al scroll con IntersectionObserver)
- Imágenes con border-radius y sombras

ESTRUCTURA DE LA WEB:
1. Header: logo (texto), navegación, CTA
2. Hero: headline potente, subheadline, CTA grande, imagen principal si disponible
3. Servicios: grid de cards con los servicios principales
4. Sobre nosotros: texto + imagen si disponible
5. Testimonios/Reseñas: si hay datos disponibles
6. CTA final: sección con gradiente, frase persuasiva, botón grande
7. Footer: datos de contacto, redes sociales, copyright

Responde SOLO con el HTML completo. Sin explicaciones, sin markdown, sin backticks. Solo el código HTML.
Escribe todo el contenido en español de España.`;

export function buildWebsitePrompt(data: {
  nombre: string;
  servicios: string;
  descripcion: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  imagenes?: string[];
  redesSociales?: string[];
  colorPrimario?: string;
}): string {
  return `Crea una landing page profesional para este negocio:

Nombre: ${data.nombre}
Descripción: ${data.descripcion}
Servicios: ${data.servicios}
Ciudad: ${data.ciudad || 'España'}
Teléfono: ${data.telefono || 'No disponible'}
Email: ${data.email || 'No disponible'}
Dirección: ${data.direccion || ''}
Color primario: ${data.colorPrimario || '#6366f1'}

${data.imagenes?.length ? `Imágenes disponibles (usa estas URLs en la web):\n${data.imagenes.map((img, i) => `- Imagen ${i + 1}: ${img}`).join('\n')}` : 'No hay imágenes disponibles — usa fondos con gradientes y iconos SVG inline en su lugar.'}

${data.redesSociales?.length ? `Redes sociales:\n${data.redesSociales.join('\n')}` : ''}

Genera el HTML completo de la landing page.`;
}
