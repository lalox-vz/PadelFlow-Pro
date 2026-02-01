# PadelFlow 🎾

> **Domina la Cancha. Gestiona tu Pasión.**

**PadelFlow** no es solo un software; es la infraestructura digital definitiva para el ecosistema del Pádel en Venezuela. Diseñado para ofrecer una experiencia **Premium**, **Rápida** y **Segura**, conectando Clubes y Academias con una comunidad de jugadores apasionados.

---

## 🌟 Funcionalidades Épicas (Versión 1.0)

Hemos construido una base sólida con características de nivel empresarial:

### 1. 🛡️ Sistema de Permisos Modulares (Línea Roja)
Seguridad de doble capa para la gestión de equipos.
- **Granularidad Total**: Define exactamente qué puede hacer cada miembro del Staff (Recepción, Gerencia, Mantenimiento).
- **Protección UI/UX**: El Sidebar se reconfigura dinámicamente; lo que no puedes ver, no existe.
- **Firewall de Rutas**: Middelware inteligente que redirige cualquier intento de acceso no autorizado a zonas seguras.

### 2. 💰 Simulador de Precios Dinámico
Maximiza la rentabilidad del club con una estrategia de precios inteligente.
- **Reglas Flexibles**: Configura tarifas por hora, día de la semana, o franjas horarias específicas (Prime Time).
- **Visualización Inmediata**: Ve cómo impactan tus reglas en el calendario antes de publicar.

### 3. 🎨 Live Identity Preview
Tu marca, tu estilo.
- **Personalización en Tiempo Real**: Ajusta el logotipo, banner, descripción y colores de tu club.
- **Vista Previa Instantánea**: Observa exactamente cómo verán los jugadores tu perfil en la App mientras editas.

### 4. ✅ Cierre de Turno "Punto de Set"
Convierte la tarea administrativa en una victoria.
- **Auditoría de Caja**: Registro detallado de efectivo, transferencias y puntos de venta.
- **Feedback Emocional**: Animaciones de celebración (Confetti) al cerrar un turno exitosamente.

---

## 🛠️ Stack Tecnológico de Vanguardia

Construido sobre hombros de gigantes para garantizar escalabilidad y rendimiento:

*   **Core**: [Next.js 14](https://nextjs.org/) (App Router) - El framework de React para producción.
*   **Backend & Auth**: [Supabase](https://supabase.com/) - La alternativa Open Source a Firebase. PostgreSQL con esteroides.
*   **Estilos**: [TailwindCSS](https://tailwindcss.com/) - Diseño rápido, consistente y moderno.
*   **UI Components**: [Shadcn/ui](https://ui.shadcn.com/) - Componentes accesibles y personalizables.
*   **Iconografía**: [Lucide React](https://lucide.dev/) - Iconos Vectoriales SVG limpios.

---

## 🔒 Arquitectura de Seguridad

Operamos bajo el principio de **"Zonas de Confianza"**:
1.  **Zona Pública**: Landing y Exploración (Optimizada para SEO).
2.  **Zona de Jugador**: Perfil, Reservas y Comunidad.
3.  **Zona de Negocio**: Dashboard Administrativo protegido por **RLS (Row Level Security)** en base de datos y verificaciones de rol en cliente.

---

## 📦 Instalación y Despliegue

1.  **Clonar**:
    ```bash
    git clone https://github.com/lalox-vz/PadelFlowSaaS.git
    ```
2.  **Configurar Entorno**:
    Copia `.env.example` a `.env.local` y añade tus credenciales de Supabase.
3.  **Instalar**:
    ```bash
    npm install
    ```
4.  **Ejecutar**:
    ```bash
    npm run dev
    ```

---

**© 2026 PadelFlow Inc.** | *Hecho con ❤️ y 🎾 para Venezuela.*
