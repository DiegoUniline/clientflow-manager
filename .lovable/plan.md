

# Plan: Corrección del Prorrateo y Sistema Completo de Historial de Cambios

## 1. Corrección del Cálculo del Prorrateo

### Problema Actual
El cálculo actual en `src/lib/billing.ts` incluye el día de corte (ej. día 10) en el prorrateo:

```typescript
// Línea 18: daysCharged = billingDay - installDay
// Si instala día 5 y corte es día 10: cobra 5 días (5,6,7,8,9,10)
// INCORRECTO - debe ser 4 días (5,6,7,8,9) - el día 10 ya es mensualidad nueva
```

### Solución
Cambiar la fórmula para NO contar el día de corte:

```typescript
// CASO 1: Instalación antes del día de corte (mismo mes)
// Cobrar desde día de instalación HASTA día 9 (un día antes del corte)
daysCharged = billingDay - installDay - 1 + 1; // = billingDay - installDay
// CORRECCIÓN: daysCharged = billingDay - 1 - installDay + 1 = billingDay - installDay

// Espera, analicemos:
// Si instala día 5, corte día 10:
// - Días del servicio: 5, 6, 7, 8, 9 (5 días, hasta día 9)
// - Fórmula actual: 10 - 5 = 5 ✓ ESTO YA ESTÁ BIEN
// 
// PERO si instala DÍA 10:
// - No debería haber prorrateo (0 días), la mensualidad empieza ese día
// - Fórmula actual: 10 - 10 = 0 ✓ ESTO YA ESTÁ BIEN

// CASO 2: Instalación después del día de corte
// Fórmula actual: (días hasta fin de mes) + billingDay
// Si instala día 15, corte día 10, mes tiene 31 días:
// - Días: 31 - 15 = 16 días restantes + 10 = 26 días
// - INCORRECTO: debería ser 16 + 9 = 25 días (sin contar el día 10)
```

**Cambio en línea 27:**
```typescript
// ANTES:
daysCharged = daysUntilEndOfMonth + billingDay;

// DESPUÉS:
daysCharged = daysUntilEndOfMonth + (billingDay - 1);
```

Esto hace que el prorrateo cuente hasta el día 9 (un día antes del corte), ya que el día 10 inicia la nueva mensualidad.

---

## 2. Sistema Completo de Historial de Cambios

### Estado Actual
- Ya existe la tabla `prospect_change_history` con columnas:
  - `id`, `prospect_id`, `client_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `changed_at`
- Ya se usa para:
  - Edición de prospectos (`EditProspectDialog`)
  - Finalización de prospectos (`FinalizeProspectDialog`)
  - Edición de clientes (`ClientDetail.tsx` - guarda en la misma tabla)

### Lo que FALTA registrar:
1. Edición de cargos (`EditChargeDialog`)
2. Eliminación de cargos (`ClientDetail.tsx`)
3. Edición de pagos (`EditPaymentDialog`)
4. Eliminación de pagos (`ClientDetail.tsx`)
5. Cambios en servicios programados
6. Cambios de equipo
7. Cambios de día de facturación

### Cambios a Realizar

#### A. Actualizar `EditChargeDialog.tsx`
Agregar registro de cambios cuando se edite un cargo:

```typescript
// Después de actualizar el cargo, registrar cambios
const changes = [];
if (formData.description !== charge.description) {
  changes.push({ field: 'Descripción Cargo', old: charge.description, new: formData.description });
}
if (parseFloat(formData.amount) !== charge.amount) {
  changes.push({ field: 'Monto Cargo', old: charge.amount.toString(), new: formData.amount });
}
if (formData.status !== charge.status) {
  changes.push({ field: 'Estatus Cargo', old: charge.status, new: formData.status });
}

if (changes.length > 0) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('prospect_change_history').insert(
    changes.map(c => ({
      client_id: charge.client_id,
      field_name: c.field,
      old_value: c.old,
      new_value: c.new,
      changed_by: user?.id,
    }))
  );
}
```

#### B. Actualizar `EditPaymentDialog.tsx`
Similar al anterior, registrar cambios en pagos.

#### C. Actualizar `ClientDetail.tsx`
1. En `handleDeleteCharge`: Registrar eliminación
2. En `handleDeletePayment`: Registrar eliminación
3. En guardar cambios de cliente: Ya existe (línea 978-986)

#### D. Mostrar Historial en Todas Partes

**En `ProspectDetailDialog.tsx`**: Ya muestra historial (líneas 240-282), pero falta mostrar quién hizo el cambio.

**En `ClientDetail.tsx`**: Agregar sección de historial de cambios visible siempre

**En `EditProspectDialog.tsx`**: Agregar panel de historial al lado del formulario

### Estructura del Historial con Usuario

Modificar la query para incluir el nombre del usuario:

```typescript
const { data, error } = await supabase
  .from('prospect_change_history')
  .select(`
    id, 
    field_name, 
    old_value, 
    new_value, 
    changed_at,
    changed_by,
    profiles:changed_by (full_name)
  `)
  .eq('client_id', clientId)
  .order('changed_at', { ascending: false });
```

### UI del Historial (Componente Reutilizable)

Crear `src/components/shared/ChangeHistoryPanel.tsx`:

```typescript
interface ChangeHistoryPanelProps {
  prospectId?: string;
  clientId?: string;
  compact?: boolean; // Para mostrar versión reducida en dialogs
}

export function ChangeHistoryPanel({ prospectId, clientId, compact }: ChangeHistoryPanelProps) {
  // Fetch y mostrar historial con:
  // - Campo modificado
  // - Valor anterior → Valor nuevo
  // - Fecha y hora
  // - Nombre de quién hizo el cambio
}
```

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/lib/billing.ts` | Corregir fórmula del prorrateo (línea 27) |
| `src/components/charges/EditChargeDialog.tsx` | Agregar registro de historial |
| `src/components/payments/EditPaymentDialog.tsx` | Agregar registro de historial |
| `src/pages/ClientDetail.tsx` | Registrar eliminaciones, mostrar historial |
| `src/components/prospects/ProspectDetailDialog.tsx` | Mostrar nombre del usuario |
| `src/components/prospects/EditProspectDialog.tsx` | Mostrar panel de historial |
| **NUEVO:** `src/components/shared/ChangeHistoryPanel.tsx` | Componente reutilizable |

---

## Sección Técnica

### Modelo de Datos
Se reutiliza `prospect_change_history` ya que tiene estructura flexible con `client_id` y `prospect_id`:

```sql
-- Ya existe esta estructura:
prospect_change_history (
  id uuid,
  prospect_id uuid,     -- Para cambios en prospectos
  client_id uuid,       -- Para cambios en clientes
  field_name text,      -- Ej: "Monto Pago", "Estatus Cargo"
  old_value text,
  new_value text,
  changed_by uuid,      -- FK a profiles.user_id
  changed_at timestamp
)
```

### Formato de Nombres de Campos
Para mantener consistencia:
- `Nombre`, `Apellido Paterno`, etc. (datos personales)
- `Cargo: {descripción}` (cambios en cargos)
- `Pago: ${monto}` (cambios en pagos)
- `Servicio: {título}` (cambios en servicios)

### Resultado Esperado
1. El prorrateo calculará correctamente hasta el día anterior al corte
2. Todo cambio en el sistema quedará registrado con fecha, hora y usuario
3. El historial será visible fácilmente en:
   - Modal de detalle de prospecto
   - Página de detalle de cliente
   - Dialog de edición de prospecto

