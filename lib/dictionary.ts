export type Language = 'es' | 'en'

export const dictionary = {
    es: {
        nav: {
            trainings: 'Entrenamientos',
            gallery: 'Galería',
            contact: 'Contacto',
            dashboard: 'Mi Cuenta',
            signin: 'Iniciar Sesión',
            join: 'Únete Ahora',
            pricing: 'Planes'
        },
        footer: {
            description: 'Transforma tu cuerpo y mente con nuestras clases dirigidas por expertos e instalaciones de vanguardia.',
            quick_links: 'Enlaces Rápidos',
            connect: 'Conectar',
            rights: 'Todos los derechos reservados.'
        },
        view_options: {
            list: 'Lista',
            grid: 'Cuadrícula',
            calendar: 'Calendario'
        },
        hero: {
            title: 'Eleva Tu Potencial en Olimpo',
            description: 'Únete a la comunidad de élite comprometida con la fuerza, resistencia y bienestar integral. Experimenta entrenamiento funcional, yoga y preparación para Hyrox de clase mundial.',
            cta_primary: 'Comienza Tu Viaje',
            cta_secondary: 'Ver Horario',
            premium_badge: 'Experiencia Fitness Premium',
        },
        features: {
            title: 'Entrena Con Propósito',
            subtitle: 'Entrenamientos Diseñados para Resultados',
            description: 'Ya sea que busques fuerza, movilidad o competir, tenemos un entrenamiento para ti.',
            cards: {
                functional: {
                    name: 'Entrenamiento Funcional',
                    description: 'Entrenamiento de alta intensidad enfocado en fuerza del core, resistencia y patrones de movimiento funcional.'
                },
                yoga: {
                    name: 'Yoga',
                    description: 'Restaura el equilibrio y la flexibilidad con nuestras sesiones guiadas por expertos.'
                },
                hyrox: {
                    name: 'Preparación Hyrox',
                    description: 'Entrenamiento especializado para competencias Hyrox. Construye la resistencia necesaria para dominar.'
                }
            }
        },
        gallery: {
            title: 'Nuestras Instalaciones',
            subtitle: 'Un vistazo dentro de Olimpo. Donde se hace el trabajo.'
        },
        contact: {
            title: 'Contáctanos',
            subtitle: '¿Tienes preguntas? Escríbenos o visítanos.',
            form: {
                name: 'Nombre',
                email: 'Correo',
                message: 'Mensaje',
                submit: 'Enviar Mensaje'
            }
        },
        auth: {
            signin_title: 'Inicia sesión en tu cuenta',
            signup_title: 'Crea una cuenta',
            no_account: '¿No tienes cuenta?',
            have_account: '¿Ya tienes cuenta?',
            signin_btn: 'Entrar',
            signup_btn: 'Registrarse',
            remember_me: 'Recuérdame',
            errors: {
                invalid_login: 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.',
                email_not_found: 'Correo electrónico no encontrado.',
                email_taken: 'Este correo ya está registrado.',
                weak_password: 'La contraseña debe tener al menos 6 caracteres.',
                rate_limit: 'Demasiados intentos. Por favor espera un momento.',
                unknown: 'Ocurrió un error. Por favor inténtalo de nuevo.',
                session_expired: 'Tu sesión ha expirado. Por favor, ingresa de nuevo.',
                session_terminated: 'Sesión finalizada por seguridad.',
                server_error: 'Hubo un problema con el servidor, reintente en un momento.',
                generic: 'Ha ocurrido un error inesperado.'
            }
        },
        trainings: {
            title: 'Calendario de Entrenamientos',
            subtitle: 'Encuentra un entrenamiento que se ajuste a tu horario y objetivos.',
            loading: 'Cargando horario...',
            alert_signin: '¡Inicia sesión para reservar!'
        },
        calendar: {
            all_trainings: 'Todos los Entrenamientos',
            today: 'Hoy',
            loading: 'Cargando calendario...',
            no_trainings: 'No hay clases programadas para este día.',
            instructor: 'Instructor',
            book_now: 'Reservar Ahora',
            booked_undo: 'Reservado (Cancelar)',
            processing: 'Procesando...',
            training_completed: 'Clase finalizada',
            booking_confirmed: '¡Reserva confirmada!',
            booking_failed: 'Error al reservar.',
            cancel_confirmed: 'Reserva cancelada.',
            cancel_failed: 'Error al cancelar la reserva.',
            edit_admin: 'Editar Clase (Admin)',
            full: 'AGOTADO'
        },
        about: {
            title: 'No Solo un Gimnasio',
            description: 'Olimpo es una comunidad. Creemos en superar los límites juntos. Nuestros entrenadores certificados brindan orientación personalizada en un entorno grupal motivador.',
            features: {
                trainers: 'Entrenadores Expertos',
                equipment: 'Equipamiento Premium',
                events: 'Eventos Comunitarios',
                nutrition: 'Guía Nutricional'
            }
        },
        faq: {
            title: 'Preguntas Frecuentes',
            items: [
                { q: '¿Debo ser un atleta para formar parte de Olimpo?', a: 'No, Olimpo está diseñado para desarrollar capacidades corporales de personas con distintos niveles atléticos. No importa el punto de inicio; con tu constancia y nuestro acompañamiento podrás lograr tus objetivos.' },
                { q: '¿Puedo entrenar a cualquier hora o hay horarios fijos?', a: 'Hay horarios establecidos para distintas clases y entrenamientos donde puedes seleccionar el que más te convenga.' },
                { q: '¿Qué pasa si nunca he hecho Yoga o Pilates?', a: 'Aquí puedes aprender y disfrutar de estas maravillosas prácticas desde cero.' },
                { q: '¿Cuántas personas hay por clase?', a: 'Tenemos un límite de 20 personas por sesión, garantizando que los que están agendados contarán con su espacio sin tener que esperar por alguna máquina o equipamiento.' },
                { q: '¿Puedo probar una clase antes de inscribirme?', a: '¡Claro que sí! Podrás agendar tu clase de cortesía e incluso venir con un acompañante.' },
                { q: '¿Qué incluye la membresía de Olimpo?', a: 'Depende del plan: VIP incluye todo (personalizado, fisio, clases, estacionamiento), ACCESO incluye todas las clases y estacionamiento, y BASIC incluye 12 clases/mes.' },
                { q: '¿Tienen entrenadores todo el día o solo en clases?', a: 'Todos nuestros planes incluyen acompañamiento de entrenadores certificados.' },
                { q: '¿Qué significa "Horario personalizado"?', a: 'Significa que quienes optan por ese plan podrán tener sesiones de entrenamiento separadas del grupo, con rutinas diseñadas específicamente según sus metas individuales.' },
                { q: '¿Si no soy deportista y me da miedo hacer algunos ejercicios, existen variaciones?', a: '¡Claro que sí! Cada ejercicio tiene modificaciones adecuadas a las condiciones atléticas de cada persona, permitiendo un progreso progresivo y seguro.' }
            ]
        },
        pricing: {
            title: 'Planes y Suscripciones',
            subtitle: 'Elige el plan que mejor se adapte a tu juego.',
            note: 'Nota: Precios sujetos a cambio según la tasa del día.',
            plans: {
                vip: {
                    name: 'PROFESSIONAL',
                    price: '$150',
                    promo: 'Acceso Ilimitado',
                    features: ['Reservas prioritarias (7 días antes)', 'Sin cargo por cancelación', 'Descuento en torneos', 'Store Credit mensual $20']
                },
                access: {
                    name: 'AMATEUR',
                    price: '$80',
                    promo: 'Jugador Frecuente',
                    features: ['Reservas anticipadas (3 días)', 'Descuento en alquiler de palas', 'Participación en ligas internas']
                },
                basic: {
                    name: 'ROOKIE',
                    price: 'Gratis',
                    promo: 'Pago por uso',
                    features: ['Reserva con pago inmediato', 'Acceso a historial de partidos']
                }
            },
            monthly: 'Mensual',
            get_started: 'Comenzar',
            choose_plan: 'Elegir plan',
            whats_included: 'Beneficios'
        },
        schedule: {
            section_title: 'Horarios de Clase',
            functional: {
                title: 'Entrenamiento Funcional',
                morning: 'Turno mañana: 6:30 am y 7:30 am.',
                afternoon: 'Turno tarde: 5:30 pm, 6:30 pm y 7:30 pm.'
            },
            personalized: {
                title: 'Horarios Clases Personalizadas',
                morning: '8:30 am a 12:00 pm',
                afternoon: '2:00 pm a 5:00 pm'
            }
        },
        dashboard: {
            sidebar: {
                my_trainings: 'Mis Entrenamientos',
                book_training: 'Reservar Clase',
                settings: 'Configuración',
                overview: 'Resumen',
                manage_trainings: 'Gestionar Clases',
                clients: 'Clientes',
                notifications: 'Notificaciones',
                signout: 'Cerrar Sesión',
                payments: 'Pagos',
                history: 'Historial de Pagos',
                coaches: 'Entrenadores',
                analytics: 'Estadísticas'
            },
            client: {
                title: 'Mi Calendario',
                back_home: 'Volver al Inicio',
                loading: 'Cargando...',
                no_trainings: 'No tienes clases próximas.',
                book_now: '¡Reserva una ahora!',
                confirmed: 'Confirmado',
                cancel: 'Cancelar',
                cancel_error: 'Error al cancelar la reserva',
                book_title: 'Reservar Clase',
                confirm_booking_msg: '¿Estás seguro de que deseas hacer check-in para esta clase?',
                confirm_cancel_msg: '¿Estás seguro de que deseas cancelar esta clase?',
                login_alert: 'Debes iniciar sesión',
                booking_error: 'Fallo en la reserva',
                booking_success: '¡Reserva exitosa!',
                already_registered: 'Ya estás registrado para esta clase.'
            },
            admin: {
                overview: 'Resumen de Admin',
                total_users: 'Usuarios Totales',
                upcoming_trainings: 'Próximos Entrenamientos',
                total_bookings: 'Reservas Totales',
                view_all: 'Ver todos',
                view_schedule: 'Ver horario',
                previous_trainings: 'Entrenamientos Anteriores',
                recent_bookings: 'Reservas Recientes',
                payment_modal: {
                    title: 'Detalles del Pago',
                    amount: 'Monto',
                    date: 'Fecha de Pago',
                    reference: 'Referencia',
                    method: 'Método',
                    proof: 'Comprobante',
                    sender: 'Remitente',
                    id: 'Cédula / ID',
                    notes: 'Notas',
                    grant_membership: 'Otorgar Membresía',
                    grant_note: 'Aprobar otorgará este nivel por 1 mes comenzando hoy.',
                    deny: 'Rechazar',
                    approve: 'Aprobar y Otorgar Membresía',
                    status_approved: 'APROBADO',
                    status_rejected: 'RECHAZADO',
                    deny_reason_placeholder: 'Indique la razón del rechazo (Requerido)...'
                }
            },
            users: {
                title: 'Gestión de Usuarios',
                search_placeholder: 'Buscar usuarios...',
                filter_all: 'Todos los Roles',
                filter_admin: 'Admin',
                filter_client: 'Cliente',
                table: {
                    name: 'Nombre',
                    role: 'Rol',
                    bookings: 'Reservas',
                    status: 'Estado',
                    actions: 'Acciones'
                },
                status: {
                    new: 'Nuevo',
                    occasional: 'Ocasional',
                    recurrent: 'Recurrente'
                },
                history: 'Historial',
                delete: 'Eliminar',
                delete_confirm: '¿Estás seguro? Esto eliminará al usuario y todos sus datos.',
                delete_confirm_final: '⚠️ ADVERTENCIA: Esta acción es irreversible. Se eliminarán permanentemente todos los datos, reservas y pagos del usuario. ¿Confirmas la eliminación definitiva?',
                make_admin: 'Hacer Admin',
                revoke_admin: 'Quitar Admin',
                promote_confirm: '¿Hacer Admin a este usuario?',
                revoke_confirm: '¿Quitar privilegios de Admin a este usuario?',
                membership: 'Membresía',
                no_users: 'No se encontraron usuarios.',
                no_plan: 'Sin Plan',
                errors: {
                    delete: 'Error eliminando usuario: ',
                    role: 'Error actualizando rol: ',
                    membership: 'Error actualizando membresía: '
                },
                history_modal: {
                    title: 'Historial',
                    unknown_training: 'Entrenamiento Desconocido',
                    date_unknown: 'Fecha Desconocida',
                    no_history: 'No se encontró historial de reservas.',
                    close: 'Cerrar'
                },
                membership_modal: {
                    title: 'Otorgar Membresía Manual',
                    description: 'Otorgando membresía para',
                    description_2: 'Esto activará su cuenta por 1 mes comenzando desde la Fecha de Pago.',
                    tier_label: 'Nivel de Membresía',
                    date_label: 'Fecha de Pago (Inicio)',
                    expiration_note: 'La expiración será calculada como [Fecha] + 1 Mes.',
                    cancel: 'Cancelar',
                    saving: 'Guardando...'
                },
                invoice: {
                    title: 'Factura / Recibo',
                    number: 'N° Factura',
                    status: 'Estado',
                    reason_denial: 'Razón del Rechazo',
                    amount: 'Monto',
                    method: 'Método',
                    date: 'Fecha',
                    reference: 'Referencia',
                    sender: 'Remitente',
                    close: 'Cerrar',
                    details: 'Detalles',
                    notes: 'Notas del Cliente'
                },
                tiers: {
                    not_a_member: 'Sin Membresía'
                }
            },
            payment_history: {
                title: 'Historial de Pagos',
                no_payments: 'No hay pagos registrados',
                status: {
                    approved: 'Aprobado',
                    rejected: 'Rechazado',
                    pending: 'Pendiente'
                }
            },
            notifications: {
                title: 'Notificaciones',
                mark_all_read: 'Marcar todas como leídas',
                delete_all: 'Borrar todas',
                delete: 'Borrar',
                empty: 'No se encontraron notificaciones.',
                loading: 'Cargando notificaciones...'
            },
            payments: {
                title: 'Reportar Pago',
                submit_success_title: '¡Pago Enviado!',
                submit_success_msg: 'Tu pago está siendo revisado por un administrador.',
                submit_another: 'Enviar Otro Pago',
                form: {
                    method: 'Método de Pago',
                    date: 'Fecha del Pago',
                    amount: 'Monto ($)',
                    reference: 'Número de Referencia',
                    sender_name: 'Nombre del Titular',
                    cedula: 'Cédula de Identidad',
                    phone: 'Número de Teléfono',
                    notes: 'Notas / Comentarios',
                    proof_cash: 'Foto del efectivo entregado / recibo (Opcional)',
                    proof_digital: 'Comprobante de Pago (Captura)',
                    upload_placeholder: 'Subir archivo',
                    upload_drag: 'o arrastrar y soltar',
                    submit_btn: 'Enviar Pago',
                    submitting: 'Enviando...',
                },
                errors: {
                    proof_required: 'El comprobante es requerido.',
                    amount_required: 'El monto es requerido.',
                    ref_required: 'El número de referencia es requerido.',
                    name_required: 'El nombre del titular es requerido.',
                    cedula_required: 'La cédula es requerida.',
                    phone_required: 'El teléfono es requerido.',
                    submit_error: 'Error enviando el pago: ',
                    file_too_large: 'La imagen es muy pesada (Max 5MB).',
                    timeout: 'Error de conexión. Inténtalo de nuevo.',
                    upload_issue: 'La imagen es muy pesada (Max 5MB) o la conexión falló. Inténtalo de nuevo.'
                }
            },
            profile: {
                title: 'Mi Perfil',
                account_info: 'Información de la Cuenta',
                email: 'Correo Electrónico',
                user_id: 'ID de Usuario'
            },
            coaches: {
                title: 'Gestionar Entrenadores',
                add_coach: 'Añadir Entrenador',
                no_coaches: 'No se encontraron entrenadores.',
                edit_modal: {
                    title_edit: 'Editar Entrenador',
                    title_add: 'Añadir Nuevo Entrenador',
                    name: 'Nombre',
                    specialties: 'Especialidades',
                    select_all: 'Selecciona todas las que apliquen.',
                    saving: 'Guardando cambios...',
                    update_btn: 'Actualizar Entrenador',
                    save_btn: 'Guardar Entrenador'
                },
                errors: {
                    select_specialty: 'Por favor selecciona al menos una especialidad.',
                    save: 'Error guardando entrenador: ',
                    delete_confirm: '¿Estás seguro de que deseas eliminar este entrenador?',
                    delete: 'Error eliminando entrenador: '
                }
            },
            manage_trainings: {
                title: 'Gestionar Entrenamientos',
                announce_whatsapp: 'Anunciar en WhatsApp',
                add_training: 'Añadir Entrenamiento',
                delete: 'Eliminar Clase',
                calendar_hint: 'Haz clic en un día para ver/editar entrenamientos.',
                modal: {
                    title: 'Añadir Nuevo Entrenamiento',
                    training_title: 'Título del Entrenamiento',
                    start_time: 'Hora de Inicio',
                    duration: 'Duración (mins)',
                    instructor: 'Entrenador / Instructor',
                    select_coach: 'Seleccionar Entrenador',
                    capacity: 'Capacidad',
                    create_btn: 'Crear Entrenamiento'
                },
                errors: {
                    create: 'Error creando entrenamiento: ',
                    conflict_error: 'Ya existe una clase programada en este horario. Solo se permite una clase por hora.',
                    delete_confirm: '¿Eliminar este entrenamiento?',
                    delete: 'Error: '
                }
            }
        }
    },
    en: {
        nav: {
            trainings: 'Training',
            gallery: 'Gallery',
            contact: 'Contact',
            dashboard: 'Dashboard',
            signin: 'Sign In',
            join: 'Join Now',
            pricing: 'Plans'
        },
        footer: {
            description: 'Transform your body and mind with our expert-led classes and state-of-the-art facilities.',
            quick_links: 'Quick Links',
            connect: 'Connect',
            rights: 'All rights reserved.'
        },
        view_options: {
            list: 'List',
            grid: 'Grid',
            calendar: 'Calendar'
        },
        hero: {
            title: 'Elevate Your Potential at Olimpo',
            description: 'Join the elite community committed to strength, endurance, and holistic wellness. Experience world-class functional training, yoga, and Hyrox preparation.',
            cta_primary: 'Start Your Journey',
            cta_secondary: 'View Schedule',
            premium_badge: 'Premium Fitness Experience',
        },
        features: {
            title: 'Train With Purpose',
            subtitle: 'Training Designed for Results',
            description: 'Whether you are building strength, improving mobility, or training for competition, we have a training session for you.',
            cards: {
                functional: {
                    name: 'Functional Training',
                    description: 'High-intensity interval training focusing on core strength, endurance, and functional movement patterns.'
                },
                yoga: {
                    name: 'Yoga',
                    description: 'Restore balance and flexibility with our expert-led yoga sessions designed to complement your strength training.'
                },
                hyrox: {
                    name: 'Hyrox Prep',
                    description: 'Specialized training for Hyrox fitness racing. Build the stamina and strength needed to dominate the competition.'
                }
            }
        },
        gallery: {
            title: 'Our Facility',
            subtitle: 'A look inside Olimpo. Where the work gets done.'
        },
        contact: {
            title: 'Get in touch',
            subtitle: 'Have questions? Reach out to us directly or visit our gym.',
            form: {
                name: 'Name',
                email: 'Email',
                message: 'Message',
                submit: 'Send Message'
            }
        },
        auth: {
            signin_title: 'Sign in to your account',
            signup_title: 'Create an account',
            no_account: "Don't have an account?",
            have_account: 'Already have an account?',
            signin_btn: 'Sign in',
            signup_btn: 'Sign up',
            remember_me: 'Remember me',
            errors: {
                invalid_login: 'Invalid email or password. Please try again.',
                email_not_found: 'Email not found.',
                email_taken: 'This email is already registered.',
                weak_password: 'Password must be at least 6 characters.',
                rate_limit: 'Too many attempts. Please wait a moment.',
                unknown: 'An unexpected error occurred. Please try again.',
                session_expired: 'Your session has expired. Please sign in again.',
                session_terminated: 'Session terminated for security.',
                server_error: 'There was a server issue, please try again.',
                generic: 'An unexpected error occurred.'
            }
        },
        trainings: {
            title: 'Training Schedule',
            subtitle: 'Find a training that fits your schedule and goals.',
            loading: 'Loading schedule...',
            alert_signin: 'Sign in to book!'
        },
        calendar: {
            all_trainings: 'All Training',
            today: 'Today',
            loading: 'Loading calendar...',
            no_trainings: 'No trainings scheduled for this day.',
            instructor: 'Instructor',
            book_now: 'Book Now',
            booked_undo: 'Booked (Undo)',
            processing: 'Processing...',
            training_completed: 'Training completed',
            booking_confirmed: 'Booking confirmed!',
            booking_failed: 'Failed to book training.',
            cancel_confirmed: 'Booking cancelled.',
            cancel_failed: 'Failed to cancel booking.',
            edit_admin: 'Edit Training (Admin)',
            full: 'FULL'
        },
        about: {
            title: 'Not Just a Gym',
            description: 'Olimpo is a community. We believe in pushing limits together. Our certified trainers provide personalized guidance in a motivating group environment.',
            features: {
                trainers: 'Expert Trainers',
                equipment: 'Premium Equipment',
                events: 'Community Events',
                nutrition: 'Nutrition Guidance'
            }
        },
        faq: {
            title: 'Frequently Asked Questions',
            items: [
                { q: 'Do I have to be an athlete to join Olimpo?', a: 'No, Olimpo is designed to develop physical capabilities for people of all athletic levels. Your starting point doesn\'t matter; with consistency and our guidance, you can achieve your goals.' },
                { q: 'Can I train at any time or are there fixed schedules?', a: 'There are established schedules for different classes and trainings so you can choose what suits you best.' },
                { q: 'What if I have never done Yoga or Pilates?', a: 'Here you can learn and enjoy these wonderful practices from scratch.' },
                { q: 'How many people are there per class?', a: 'We have a limit of 20 people per session, guaranteeing that everyone booked has their own space and equipment.' },
                { q: 'Can I try a class before signing up?', a: 'Yes! You can book a courtesy class and even bring a companion.' },
                { q: 'What does the membership include?', a: 'Depends on the plan: VIP includes everything (personalized, physio, classes, parking), ACCESS includes all classes and parking, and BASIC includes 12 classes/month.' },
                { q: 'Do you have trainers all day or only in classes?', a: 'All our plans include guidance from certified trainers.' },
                { q: 'What does "Personalized Schedule" mean?', a: 'It means that those who choose that plan can have training sessions separate from the group, with routines designed specifically for their individual goals.' },
                { q: 'If I am not an athlete and afraid of exercises, are there variations?', a: 'Yes! Every exercise has modifications suitable for each person\'s athletic condition, allowing for progressive and safe improvement.' }
            ]
        },
        pricing: {
            title: 'Plans & Subscriptions',
            subtitle: 'Choose the plan that fits your game.',
            note: 'Note: Prices subject to change.',
            plans: {
                vip: {
                    name: 'PROFESSIONAL',
                    price: '$150',
                    promo: 'Unlimited Access',
                    features: ['Priority booking (7 days in advance)', 'No cancellation fees', 'Tournament discounts', '$20 Monthly Store Credit']
                },
                access: {
                    name: 'AMATEUR',
                    price: '$80',
                    promo: 'Frequent Player',
                    features: ['Advance booking (3 days)', 'Racket rental discount', 'Internal league participation']
                },
                basic: {
                    name: 'ROOKIE',
                    price: 'Free',
                    promo: 'Pay as you go',
                    features: ['Instant payment booking', 'Match history access']
                }
            },
            monthly: 'Monthly',
            get_started: 'Get started',
            choose_plan: 'Choose plan',
            whats_included: "Benefits"
        },
        schedule: {
            section_title: 'Class Schedules',
            functional: {
                title: 'Functional Training',
                morning: 'Morning: 6:30 am & 7:30 am.',
                afternoon: 'Afternoon: 5:30 pm, 6:30 pm & 7:30 pm.'
            },
            personalized: {
                title: 'Personalized Class Schedules',
                morning: '8:30 am - 12:00 pm',
                afternoon: '2:00 pm - 5:00 pm'
            }
        },
        dashboard: {
            sidebar: {
                my_trainings: 'My Trainings',
                book_training: 'Book Class',
                settings: 'Settings',
                overview: 'Overview',
                manage_trainings: 'Manage Classes',
                clients: 'Clients',
                notifications: 'Notifications',
                signout: 'Sign Out',
                payments: 'Payments',
                history: 'Payment History',
                coaches: 'Coaches',
                analytics: 'Analytics'
            },
            client: {
                title: 'My Schedule',
                back_home: 'Back to Home',
                loading: 'Loading...',
                no_trainings: 'No upcoming classes.',
                book_now: 'Book one now!',
                confirmed: 'Confirmed',
                cancel: 'Cancel',
                cancel_error: 'Error cancelling booking',
                book_title: 'Book Class',
                confirm_booking_msg: 'Are you sure you want to check in for this class?',
                confirm_cancel_msg: 'Are you sure you want to cancel this class?',
                login_alert: 'You must sign in',
                booking_error: 'Booking failed',
                booking_success: 'Booking successful!',
                already_registered: 'You are already registered for this training session.'
            },
            admin: {
                overview: 'Admin Overview',
                total_users: 'Total Users',
                upcoming_trainings: 'Upcoming Trainings',
                total_bookings: 'Total Bookings',
                view_all: 'View all',
                view_schedule: 'View schedule',
                previous_trainings: 'Previous Trainings',
                recent_bookings: 'Recent Bookings',
                payment_modal: {
                    title: 'Payment Details',
                    amount: 'Amount',
                    date: 'Date Paid',
                    reference: 'Reference',
                    method: 'Method',
                    proof: 'Payment Proof',
                    sender: 'Sender',
                    id: 'ID',
                    notes: 'Notes',
                    grant_membership: 'Grant Membership Tier',
                    grant_note: 'Approving will grant this tier for 1 month starting today.',
                    deny: 'Deny',
                    approve: 'Approve & Grant Membership',
                    status_approved: 'APPROVED',
                    status_rejected: 'REJECTED',
                    deny_reason_placeholder: 'Reason for denial (Required)...'
                }
            },
            users: {
                title: 'User Management',
                search_placeholder: 'Search users...',
                filter_all: 'All Roles',
                filter_admin: 'Admin',
                filter_client: 'Client',
                table: {
                    name: 'Name',
                    role: 'Role',
                    bookings: 'Bookings',
                    status: 'Status',
                    actions: 'Actions'
                },
                status: {
                    new: 'New',
                    occasional: 'Occasional',
                    recurrent: 'Recurrent'
                },
                history: 'History',
                delete: 'Delete',
                delete_confirm: 'Are you sure? This will delete the user and all their data.',
                delete_confirm_final: '⚠️ WARNING: This action is irreversible. It will permanently delete all user data, bookings, and payments. Do you confirm final deletion?',
                make_admin: 'Make Admin',
                revoke_admin: 'Revoke Admin',
                promote_confirm: 'Promote this user to Admin?',
                revoke_confirm: 'Revoke Admin privileges from this user?',
                membership: 'Membership',
                no_users: 'No users found.',
                no_plan: 'No Plan',
                errors: {
                    delete: 'Error deleting user: ',
                    role: 'Error updating role: ',
                    membership: 'Error updating membership: '
                },
                history_modal: {
                    title: 'History',
                    unknown_training: 'Unknown Training',
                    date_unknown: 'Date Unknown',
                    no_history: 'No booking history found.',
                    close: 'Close'
                },
                membership_modal: {
                    title: 'Manual Membership Grant',
                    description: 'Granting membership for',
                    description_2: 'This will activate their account for 1 month starting from the Payment Date.',
                    tier_label: 'Membership Tier',
                    date_label: 'Payment Date (Start Date)',
                    expiration_note: 'Expiration will be calculated as [Date] + 1 Month.',
                    cancel: 'Cancel',
                    saving: 'Saving...'
                },
                invoice: {
                    title: 'Invoice / Receipt',
                    number: 'Invoice #',
                    status: 'Status',
                    reason_denial: 'Denial Reason',
                    amount: 'Amount',
                    method: 'Method',
                    date: 'Date',
                    reference: 'Reference',
                    sender: 'Sender',
                    close: 'Close',
                    details: 'Details',
                    notes: 'Client Notes'
                },
                tiers: {
                    not_a_member: 'Not a Member'
                }
            },
            payment_history: {
                title: 'Payment History',
                no_payments: 'No payments found',
                status: {
                    approved: 'Approved',
                    rejected: 'Rejected',
                    pending: 'Pending'
                }
            },
            notifications: {
                title: 'Notifications',
                mark_all_read: 'Mark all as read',
                delete_all: 'Clear all',
                delete: 'Delete',
                empty: 'No notifications found.',
                loading: 'Loading notifications...'
            },
            payments: {
                title: 'Report Payment',
                submit_success_title: 'Payment Submitted!',
                submit_success_msg: 'Your payment is being reviewed by an admin.',
                submit_another: 'Submit Another Payment',
                form: {
                    method: 'Payment Method',
                    date: 'Payment Date',
                    amount: 'Amount ($)',
                    reference: 'Reference Number',
                    sender_name: 'Sender Name',
                    cedula: 'Sender ID (Cédula)',
                    phone: 'Phone Number',
                    notes: 'Notes / Comments',
                    proof_cash: 'Photo of cash given/receipt (Optional)',
                    proof_digital: 'Payment Screenshot (Required)',
                    upload_placeholder: 'Upload payment proof',
                    upload_drag: 'or drag and drop',
                    submit_btn: 'Submit Payment',
                    submitting: 'Submitting...',
                },
                errors: {
                    proof_required: 'Proof of payment is required.',
                    amount_required: 'Amount is required.',
                    ref_required: 'Reference number is required.',
                    name_required: 'Sender name is required.',
                    cedula_required: 'Sender ID is required.',
                    phone_required: 'Sender phone is required.',
                    submit_error: 'Error submitting payment: ',
                    file_too_large: 'Image too large (Max 5MB).',
                    timeout: 'Connection error. Please try again.',
                    upload_issue: 'Image too large (Max 5MB) or connection failed. Please try again.'
                }
            },
            profile: {
                title: 'My Profile',
                account_info: 'Account Information',
                email: 'Email',
                user_id: 'User ID'
            },
            coaches: {
                title: 'Manage Coaches',
                add_coach: 'Add Coach',
                no_coaches: 'No coaches found.',
                edit_modal: {
                    title_edit: 'Edit Coach',
                    title_add: 'Add New Coach',
                    name: 'Name',
                    specialties: 'Specialties',
                    select_all: 'Select all that apply.',
                    saving: 'Saving changes...',
                    update_btn: 'Update Coach',
                    save_btn: 'Save Coach'
                },
                errors: {
                    select_specialty: 'Please select at least one specialty.',
                    save: 'Error saving coach: ',
                    delete_confirm: 'Are you sure you want to delete this coach?',
                    delete: 'Error deleting coach: '
                }
            },
            manage_trainings: {
                title: 'Manage Training',
                announce_whatsapp: 'Announce on WhatsApp',
                add_training: 'Add Training',
                delete: 'Delete Training',
                calendar_hint: 'Click on a day to view/edit trainings.',
                modal: {
                    title: 'Add New Training',
                    training_title: 'Training Title',
                    start_time: 'Start Time',
                    duration: 'Duration (mins)',
                    instructor: 'Coach / Instructor',
                    select_coach: 'Select a Coach',
                    capacity: 'Capacity',
                    create_btn: 'Create Training'
                },
                errors: {
                    create: 'Error creating training: ',
                    conflict_error: 'A class is already scheduled for this time slot. Only one class per hour is allowed.',
                    delete_confirm: 'Delete this training?',
                    delete: 'Error: '
                }
            }
        }
    }
}

