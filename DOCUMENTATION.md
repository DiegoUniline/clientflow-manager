# 📚 Documentación Técnica Completa - Sistema ISP

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Base de Datos](#base-de-datos)
   - [Diagrama de Relaciones](#diagrama-de-relaciones)
   - [Tablas](#tablas)
   - [Enums](#enums)
   - [Funciones](#funciones)
   - [Triggers](#triggers)
5. [Autenticación y Permisos](#autenticación-y-permisos)
6. [Políticas RLS](#políticas-rls)
7. [Edge Functions](#edge-functions)
8. [Instalación](#instalación)
9. [Variables de Entorno](#variables-de-entorno)

---

## 📖 Descripción General

Sistema de gestión integral para proveedores de servicios de internet (ISP) que permite:

- ✅ Gestión de prospectos (clientes potenciales)
- ✅ Gestión de clientes activos y cancelados
- ✅ Control de equipos instalados (antenas, routers)
- ✅ Facturación y cobros mensuales
- ✅ Registro de pagos
- ✅ Programación de servicios técnicos
- ✅ Sistema de chat interno
- ✅ Gestión de usuarios y permisos
- ✅ Reportes y estadísticas

---

## 🛠 Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 18.3.1 | Biblioteca de UI |
| TypeScript | - | Tipado estático |
| Vite | - | Build tool |
| Tailwind CSS | - | Framework CSS |
| shadcn/ui | - | Componentes UI |
| React Router | 6.30.1 | Navegación SPA |
| TanStack Query | 5.83.0 | Gestión de estado servidor |
| React Hook Form | 7.61.1 | Manejo de formularios |
| Zod | 3.25.76 | Validación de esquemas |

### Backend (Supabase)
| Componente | Descripción |
|------------|-------------|
| PostgreSQL | Base de datos relacional |
| Auth | Autenticación de usuarios |
| Storage | Almacenamiento de archivos |
| Edge Functions | Funciones serverless (Deno) |
| Realtime | Suscripciones en tiempo real |

---

## 📁 Estructura del Proyecto

```
├── public/                    # Archivos estáticos
├── src/
│   ├── components/
│   │   ├── auth/             # Componentes de autenticación
│   │   ├── clients/          # Componentes de clientes
│   │   ├── layout/           # Layout principal
│   │   ├── payments/         # Componentes de pagos
│   │   ├── prospects/        # Componentes de prospectos
│   │   ├── shared/           # Componentes compartidos
│   │   └── ui/               # Componentes shadcn/ui
│   ├── hooks/                # Custom hooks
│   ├── integrations/
│   │   └── supabase/         # Cliente y tipos de Supabase
│   ├── lib/                  # Utilidades
│   ├── pages/                # Páginas de la aplicación
│   └── types/                # Tipos TypeScript
├── supabase/
│   ├── functions/            # Edge Functions
│   └── migrations/           # Migraciones SQL
└── ...
```

---

## 🗄 Base de Datos

### Diagrama de Relaciones

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    prospects    │────▶│     clients     │────▶│    equipment    │
│   (Prospectos)  │     │    (Clientes)   │     │    (Equipos)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
          ┌─────────────┐ ┌───────────┐ ┌─────────────┐
          │client_billing│ │  payments │ │client_notes │
          │(Facturación) │ │  (Pagos)  │ │   (Notas)   │
          └──────┬───────┘ └───────────┘ └─────────────┘
                 │
                 ▼
          ┌─────────────┐
          │service_plans│
          │  (Planes)   │
          └─────────────┘

┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────▶│    profiles     │
│   (Usuarios)    │     │   (Perfiles)    │
└────────┬────────┘     └─────────────────┘
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────┐
│   user_roles    │              │user_permissions │
│    (Roles)      │              │   (Permisos)    │
└─────────────────┘              └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│scheduled_services│    │  client_charges │
│(Serv. Program.) │     │(Cargos Extras)  │
└─────────────────┘     └─────────────────┘
```

---

### 📊 Tablas

#### 1. `profiles` - Perfiles de Usuario

Almacena información adicional de los usuarios registrados.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único del perfil |
| `user_id` | uuid | No | - | ID del usuario (auth.users) |
| `full_name` | text | No | - | Nombre completo |
| `email` | text | Sí | - | Correo electrónico |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Relación:** `user_id` → `auth.users.id`

---

#### 2. `user_roles` - Roles de Usuario

Define el rol de cada usuario en el sistema.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `user_id` | uuid | No | - | ID del usuario |
| `role` | app_role | No | 'employee' | Rol del usuario |
| `created_at` | timestamptz | No | now() | Fecha de creación |

**Valores de `role`:** `admin`, `employee`

---

#### 3. `user_permissions` - Permisos de Usuario

Permisos específicos por módulo para cada usuario.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `user_id` | uuid | No | - | ID del usuario |
| `module` | text | No | - | Nombre del módulo |
| `can_view` | boolean | Sí | false | Puede ver |
| `can_create` | boolean | Sí | false | Puede crear |
| `can_edit` | boolean | Sí | false | Puede editar |
| `can_delete` | boolean | Sí | false | Puede eliminar |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Módulos disponibles:**
- `dashboard` - Panel principal
- `prospects` - Prospectos
- `clients` - Clientes
- `payments` - Pagos
- `services` - Servicios programados
- `reports` - Reportes
- `catalogs` - Catálogos
- `settings` - Configuración
- `permissions` - Permisos
- `chat` - Chat interno
- `mensualidades` - Mensualidades

---

#### 4. `prospects` - Prospectos

Clientes potenciales antes de ser instalados.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `first_name` | text | No | - | Nombre |
| `last_name_paterno` | text | No | - | Apellido paterno |
| `last_name_materno` | text | Sí | - | Apellido materno |
| `phone1` | text | No | - | Teléfono principal |
| `phone2` | text | Sí | - | Teléfono secundario |
| `phone3_signer` | text | Sí | - | Teléfono del firmante |
| `street` | text | No | - | Calle |
| `exterior_number` | text | No | - | Número exterior |
| `interior_number` | text | Sí | - | Número interior |
| `neighborhood` | text | No | - | Colonia |
| `city` | text | No | - | Ciudad |
| `postal_code` | text | Sí | - | Código postal |
| `work_type` | text | Sí | - | Tipo de trabajo |
| `request_date` | date | No | CURRENT_DATE | Fecha de solicitud |
| `assigned_date` | date | Sí | - | Fecha asignada para instalación |
| `ssid` | text | Sí | - | SSID de la red |
| `antenna_ip` | text | Sí | - | IP de la antena |
| `notes` | text | Sí | - | Notas adicionales |
| `status` | prospect_status | No | 'pending' | Estado del prospecto |
| `finalized_at` | timestamptz | Sí | - | Fecha de finalización |
| `cancelled_at` | timestamptz | Sí | - | Fecha de cancelación |
| `cancellation_reason` | text | Sí | - | Motivo de cancelación |
| `created_by` | uuid | Sí | - | Usuario que creó |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Estados (`prospect_status`):** `pending`, `finalized`, `cancelled`

---

#### 5. `clients` - Clientes

Clientes activos con servicio instalado.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `first_name` | text | No | - | Nombre |
| `last_name_paterno` | text | No | - | Apellido paterno |
| `last_name_materno` | text | Sí | - | Apellido materno |
| `phone1` | text | No | - | Teléfono principal |
| `phone2` | text | Sí | - | Teléfono secundario |
| `phone3` | text | Sí | - | Teléfono terciario |
| `street` | text | No | - | Calle |
| `exterior_number` | text | No | - | Número exterior |
| `interior_number` | text | Sí | - | Número interior |
| `neighborhood` | text | No | - | Colonia |
| `city` | text | No | - | Ciudad |
| `postal_code` | text | Sí | - | Código postal |
| `status` | client_status | No | 'active' | Estado del cliente |
| `cancelled_at` | timestamptz | Sí | - | Fecha de cancelación |
| `cancellation_reason` | text | Sí | - | Motivo de cancelación |
| `ine_subscriber_front` | text | Sí | - | URL INE titular (frente) |
| `ine_subscriber_back` | text | Sí | - | URL INE titular (reverso) |
| `ine_other_front` | text | Sí | - | URL INE otro (frente) |
| `ine_other_back` | text | Sí | - | URL INE otro (reverso) |
| `contract_page1` | text | Sí | - | URL contrato página 1 |
| `contract_page2` | text | Sí | - | URL contrato página 2 |
| `prospect_id` | uuid | Sí | - | ID del prospecto original |
| `created_by` | uuid | Sí | - | Usuario que creó |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Estados (`client_status`):** `active`, `cancelled`

**Relación:** `prospect_id` → `prospects.id`

---

#### 6. `equipment` - Equipos

Equipos instalados en cada cliente.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `antenna_mac` | text | Sí | - | MAC de la antena |
| `antenna_brand` | text | Sí | - | Marca de la antena |
| `antenna_model` | text | Sí | - | Modelo de la antena |
| `antenna_serial` | text | Sí | - | Serie de la antena |
| `antenna_ip` | text | Sí | - | IP de la antena |
| `antenna_ssid` | text | Sí | - | SSID de la antena |
| `router_mac` | text | Sí | - | MAC del router |
| `router_brand` | text | Sí | - | Marca del router |
| `router_model` | text | Sí | - | Modelo del router |
| `router_serial` | text | Sí | - | Serie del router |
| `router_ip` | text | Sí | - | IP del router |
| `router_network_name` | text | Sí | - | Nombre de red WiFi |
| `router_password` | text | Sí | - | Contraseña WiFi |
| `installer_name` | text | Sí | - | Nombre del instalador |
| `installation_date` | date | Sí | - | Fecha de instalación |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Relación:** `client_id` → `clients.id` (uno a uno)

---

#### 7. `client_billing` - Facturación del Cliente

Información de facturación y saldo de cada cliente.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `installation_cost` | numeric | No | 0 | Costo de instalación |
| `monthly_fee` | numeric | No | - | Mensualidad |
| `installation_date` | date | No | - | Fecha de instalación |
| `first_billing_date` | date | No | - | Primera fecha de cobro |
| `billing_day` | integer | Sí | 10 | Día de cobro mensual |
| `balance` | numeric | No | 0 | Saldo pendiente (deuda) |
| `plan_id` | uuid | Sí | - | ID del plan de servicio |
| `prorated_amount` | numeric | Sí | 0 | Monto prorrateado |
| `additional_charges` | numeric | Sí | 0 | Cargos adicionales |
| `additional_charges_notes` | text | Sí | - | Notas de cargos |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Relaciones:**
- `client_id` → `clients.id` (uno a uno)
- `plan_id` → `service_plans.id`

---

#### 8. `payments` - Pagos

Registro de todos los pagos recibidos.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `amount` | numeric | No | - | Monto del pago |
| `payment_date` | date | No | CURRENT_DATE | Fecha del pago |
| `payment_type` | text | No | - | Tipo de pago |
| `period_month` | integer | Sí | - | Mes del período pagado |
| `period_year` | integer | Sí | - | Año del período pagado |
| `payer_name` | text | Sí | - | Nombre de quien paga |
| `payer_phone` | text | Sí | - | Teléfono de quien paga |
| `receipt_number` | text | Sí | - | Número de recibo |
| `bank_type` | text | Sí | - | Banco (si aplica) |
| `notes` | text | Sí | - | Notas del pago |
| `created_by` | uuid | Sí | - | Usuario que registró |
| `created_at` | timestamptz | No | now() | Fecha de creación |

**Relación:** `client_id` → `clients.id` (uno a muchos)

---

#### 9. `service_plans` - Planes de Servicio

Catálogo de planes de internet disponibles.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `name` | text | No | - | Nombre del plan |
| `monthly_fee` | numeric | No | - | Costo mensual |
| `speed_download` | text | Sí | - | Velocidad de descarga |
| `speed_upload` | text | Sí | - | Velocidad de subida |
| `description` | text | Sí | - | Descripción del plan |
| `is_active` | boolean | Sí | true | Plan activo |
| `created_at` | timestamptz | Sí | now() | Fecha de creación |
| `updated_at` | timestamptz | Sí | now() | Fecha de actualización |

---

#### 10. `scheduled_services` - Servicios Programados

Servicios técnicos programados (instalaciones, reparaciones, etc).

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | Sí | - | ID del cliente (si aplica) |
| `prospect_id` | uuid | Sí | - | ID del prospecto (si aplica) |
| `title` | text | No | - | Título del servicio |
| `description` | text | Sí | - | Descripción |
| `service_type` | service_type | No | 'other' | Tipo de servicio |
| `status` | service_status | No | 'scheduled' | Estado del servicio |
| `scheduled_date` | date | No | - | Fecha programada |
| `scheduled_time` | time | Sí | - | Hora programada |
| `estimated_duration` | integer | Sí | 60 | Duración estimada (min) |
| `assigned_to` | uuid | No | - | Técnico asignado |
| `completed_at` | timestamptz | Sí | - | Fecha de completado |
| `completed_notes` | text | Sí | - | Notas de completado |
| `charge_amount` | numeric | Sí | 0 | Monto a cobrar |
| `charge_id` | uuid | Sí | - | ID del cargo generado |
| `created_by` | uuid | Sí | - | Usuario que creó |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Tipos de servicio (`service_type`):** `installation`, `repair`, `maintenance`, `relocation`, `equipment_change`, `other`

**Estados (`service_status`):** `scheduled`, `in_progress`, `completed`, `cancelled`

**Relaciones:**
- `client_id` → `clients.id`
- `prospect_id` → `prospects.id`
- `assigned_to` → `auth.users.id`

---

#### 11. `client_charges` - Cargos Extras

Cargos adicionales aplicados a clientes.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `charge_catalog_id` | uuid | Sí | - | ID del catálogo de cargo |
| `description` | text | No | - | Descripción del cargo |
| `amount` | numeric | No | - | Monto del cargo |
| `status` | text | No | 'pending' | Estado del cargo |
| `due_date` | date | Sí | - | Fecha de vencimiento |
| `paid_date` | date | Sí | - | Fecha de pago |
| `payment_id` | uuid | Sí | - | ID del pago asociado |
| `created_by` | uuid | Sí | - | Usuario que creó |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Estados:** `pending`, `paid`, `cancelled`

**Relaciones:**
- `client_id` → `clients.id`
- `charge_catalog_id` → `charge_catalog.id`
- `payment_id` → `payments.id`

---

#### 12. `charge_catalog` - Catálogo de Cargos

Catálogo de tipos de cargos disponibles.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `name` | text | No | - | Nombre del cargo |
| `description` | text | Sí | - | Descripción |
| `default_amount` | numeric | No | 0 | Monto por defecto |
| `is_active` | boolean | No | true | Cargo activo |
| `created_at` | timestamptz | No | now() | Fecha de creación |

---

#### 13. `banks` - Bancos

Catálogo de bancos para registro de pagos.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `name` | text | No | - | Nombre del banco |
| `short_name` | text | Sí | - | Nombre corto |
| `is_active` | boolean | Sí | true | Banco activo |
| `created_at` | timestamptz | Sí | now() | Fecha de creación |
| `updated_at` | timestamptz | Sí | now() | Fecha de actualización |

---

#### 14. `payment_methods` - Métodos de Pago

Catálogo de métodos de pago disponibles.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `name` | text | No | - | Nombre del método |
| `description` | text | Sí | - | Descripción |
| `is_active` | boolean | Sí | true | Método activo |
| `created_at` | timestamptz | Sí | now() | Fecha de creación |
| `updated_at` | timestamptz | Sí | now() | Fecha de actualización |

---

#### 15. `client_notes` - Notas de Cliente

Notas adicionales sobre clientes.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `note` | text | No | - | Contenido de la nota |
| `created_by` | uuid | Sí | - | Usuario que creó |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

**Relación:** `client_id` → `clients.id` (uno a muchos)

---

#### 16. `equipment_history` - Historial de Equipos

Registro de cambios en equipos de clientes.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `equipment_id` | uuid | Sí | - | ID del equipo |
| `change_type` | text | No | - | Tipo de cambio |
| `old_values` | jsonb | Sí | - | Valores anteriores |
| `new_values` | jsonb | Sí | - | Valores nuevos |
| `charge_id` | uuid | Sí | - | ID del cargo asociado |
| `notes` | text | Sí | - | Notas del cambio |
| `created_by` | uuid | Sí | - | Usuario que registró |
| `created_at` | timestamptz | Sí | now() | Fecha de creación |

**Tipos de cambio:** `installation`, `antenna_change`, `router_change`, `relocation`

---

#### 17. `plan_change_history` - Historial de Cambios de Plan

Registro de cambios de plan de clientes.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `client_id` | uuid | No | - | ID del cliente |
| `old_plan_id` | uuid | Sí | - | Plan anterior |
| `new_plan_id` | uuid | Sí | - | Plan nuevo |
| `old_monthly_fee` | numeric | Sí | - | Mensualidad anterior |
| `new_monthly_fee` | numeric | Sí | - | Mensualidad nueva |
| `effective_date` | date | No | - | Fecha efectiva |
| `notes` | text | Sí | - | Notas del cambio |
| `created_by` | uuid | Sí | - | Usuario que registró |
| `created_at` | timestamptz | Sí | now() | Fecha de creación |

---

#### 18. `chat_messages` - Mensajes de Chat

Sistema de chat interno entre usuarios.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `sender_id` | uuid | No | - | ID del remitente |
| `recipient_id` | uuid | Sí | - | ID del destinatario (null = broadcast) |
| `message` | text | No | - | Contenido del mensaje |
| `is_read` | boolean | Sí | false | Mensaje leído |
| `file_url` | text | Sí | - | URL del archivo adjunto |
| `file_name` | text | Sí | - | Nombre del archivo |
| `file_type` | text | Sí | - | Tipo MIME del archivo |
| `created_at` | timestamptz | No | now() | Fecha de creación |

---

#### 19. `push_subscriptions` - Suscripciones Push

Suscripciones para notificaciones push.

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | ID único |
| `user_id` | uuid | No | - | ID del usuario |
| `endpoint` | text | No | - | URL del endpoint push |
| `p256dh` | text | No | - | Clave pública |
| `auth` | text | No | - | Clave de autenticación |
| `created_at` | timestamptz | No | now() | Fecha de creación |
| `updated_at` | timestamptz | No | now() | Fecha de actualización |

---

### 📝 Enums

#### `app_role`
```sql
CREATE TYPE app_role AS ENUM ('admin', 'employee');
```

#### `prospect_status`
```sql
CREATE TYPE prospect_status AS ENUM ('pending', 'finalized', 'cancelled');
```

#### `client_status`
```sql
CREATE TYPE client_status AS ENUM ('active', 'cancelled');
```

#### `service_status`
```sql
CREATE TYPE service_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
```

#### `service_type`
```sql
CREATE TYPE service_type AS ENUM ('installation', 'repair', 'maintenance', 'relocation', 'equipment_change', 'other');
```

---

### ⚡ Funciones de Base de Datos

#### `has_role(user_id, role)`
Verifica si un usuario tiene un rol específico.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### `is_admin(user_id)`
Verifica si un usuario es administrador.

```sql
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean AS $$
  SELECT public.has_role(_user_id, 'admin')
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### `has_permission(user_id, module, action)`
Verifica si un usuario tiene un permiso específico.

```sql
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean AS $$
DECLARE
  _result BOOLEAN;
BEGIN
  -- Admins have all permissions
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT 
    CASE _action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      ELSE false
    END INTO _result
  FROM public.user_permissions
  WHERE user_id = _user_id AND module = _module;

  RETURN COALESCE(_result, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

#### `handle_new_user()`
Trigger que crea automáticamente el perfil al registrar un usuario.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `update_updated_at_column()`
Actualiza automáticamente el campo `updated_at`.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 🔐 Políticas RLS (Row Level Security)

Todas las tablas tienen RLS habilitado. Patrón general:

| Acción | Admin | Employee |
|--------|-------|----------|
| SELECT | ✅ Todos | ✅ Según módulo |
| INSERT | ✅ | ✅ (Autenticados) |
| UPDATE | ✅ | ❌ |
| DELETE | ✅ | ❌ |

**Ejemplo de políticas para `clients`:**

```sql
-- Usuarios autenticados pueden ver
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT USING (true);

-- Usuarios autenticados pueden insertar
CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT WITH CHECK (true);

-- Solo admins pueden actualizar
CREATE POLICY "Only admins can update clients"
ON public.clients FOR UPDATE USING (is_admin(auth.uid()));

-- Solo admins pueden eliminar
CREATE POLICY "Only admins can delete clients"
ON public.clients FOR DELETE USING (is_admin(auth.uid()));
```

---

## 🔑 Autenticación y Permisos

### Flujo de Autenticación

1. Usuario se registra con email/password
2. Se crea automáticamente un `profile` (trigger)
3. Admin asigna rol en `user_roles` (admin/employee)
4. Admin configura permisos en `user_permissions`

### Sistema de Permisos

```typescript
// Módulos disponibles
type Module = 
  | 'dashboard'
  | 'prospects'
  | 'clients'
  | 'payments'
  | 'services'
  | 'reports'
  | 'catalogs'
  | 'settings'
  | 'permissions'
  | 'chat'
  | 'mensualidades';

// Acciones
type Action = 'view' | 'create' | 'edit' | 'delete';
```

---

## 🌐 Edge Functions

### `create-user`

Permite a administradores crear nuevos usuarios.

**Endpoint:** `POST /functions/v1/create-user`

**Headers:**
```
Authorization: Bearer <token_del_admin>
```

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "full_name": "Nombre Completo",
  "role": "employee"
}
```

**Respuesta:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com"
  }
}
```

---

## 📦 Storage Buckets

### `client-documents`
- **Público:** No
- **Uso:** Documentos de clientes (INE, contratos)
- **Acceso:** Solo usuarios autenticados

### `chat-files`
- **Público:** Sí
- **Uso:** Archivos compartidos en chat
- **Acceso:** Público (URLs firmadas)

---

## 🚀 Instalación

### Opción 1: Usando Supabase (Recomendado)

1. **Crear proyecto en Supabase**
   - Ir a [supabase.com](https://supabase.com)
   - Crear nuevo proyecto
   - Guardar las credenciales

2. **Ejecutar el esquema SQL**
   - Ir a SQL Editor en Supabase Dashboard
   - Ejecutar el archivo `schema.sql` (incluido abajo)

3. **Configurar el frontend**
   ```bash
   # Clonar repositorio
   git clone <repo-url>
   cd <proyecto>
   
   # Instalar dependencias
   npm install
   
   # Configurar variables de entorno
   cp .env.example .env
   # Editar .env con las credenciales de Supabase
   
   # Iniciar desarrollo
   npm run dev
   ```

4. **Desplegar frontend**
   - Vercel: Conectar repo y configurar variables
   - Netlify: Conectar repo y configurar variables
   - Cualquier hosting estático

### Opción 2: Desplegar en Hosting Propio

El frontend es estático y puede desplegarse en cualquier servidor:

```bash
# Build de producción
npm run build

# Los archivos quedan en /dist
# Subir contenido de /dist al servidor web
```

---

## 🔧 Variables de Entorno

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...tu-anon-key
VITE_SUPABASE_PROJECT_ID=tu-project-id
```

### Edge Functions (Supabase)

Las siguientes variables están disponibles automáticamente:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## 📊 Esquema SQL Completo

Para instalar la base de datos desde cero, ejecutar en orden los archivos de migración ubicados en `supabase/migrations/`.

El orden de ejecución es por fecha (nombre del archivo).

---

## 🔒 Consideraciones de Seguridad

1. **RLS habilitado** en todas las tablas
2. **Políticas restrictivas** - Solo admins pueden editar/eliminar
3. **Funciones SECURITY DEFINER** para verificación de permisos
4. **Tokens JWT** para autenticación
5. **Storage privado** para documentos sensibles

---

## 📞 Soporte

Para dudas técnicas sobre la implementación, revisar:

1. [Documentación de Supabase](https://supabase.com/docs)
2. [Documentación de React](https://react.dev)
3. [Documentación de shadcn/ui](https://ui.shadcn.com)

---

## 📄 Licencia

Este proyecto fue desarrollado específicamente para [Nombre del Cliente].

---

*Documentación generada el 16 de Enero de 2026*
