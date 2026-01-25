
# Plan: Correcciones y Mejoras Múltiples del Sistema ISP

## Resumen de Problemas Identificados

Tras analizar el código, he identificado los siguientes problemas y sus soluciones:

---

## 1. Prospectos Editables sin Convertir a Cliente

**Problema**: La edición de prospectos ya existe (`EditProspectDialog.tsx`) pero solo está disponible en el historial para prospectos cancelados, no para prospectos pendientes.

**Solución**:
- Agregar botón de edición en la página de Prospectos (`Prospects.tsx`) para prospectos pendientes
- El historial de cambios ya está implementado en `EditProspectDialog.tsx`

**Archivos a modificar**:
- `src/pages/Prospects.tsx` - Agregar botón de editar en la columna de acciones

---

## 2. Asignar Técnico a Prospecto

**Problema**: La tabla `prospects` solo tiene `assigned_date` pero no tiene campo para `assigned_to` (técnico).

**Solución**:
1. Agregar columna `assigned_to` a la tabla `prospects`
2. Actualizar formularios de prospectos para incluir selector de técnico
3. Mostrar técnico asignado en detalle y listados

**Cambios de base de datos**:
```sql
ALTER TABLE public.prospects 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
```

**Archivos a modificar**:
- `src/components/prospects/ProspectFormDialog.tsx` - Agregar selector de técnico
- `src/components/prospects/EditProspectDialog.tsx` - Agregar selector de técnico
- `src/components/prospects/ProspectDetailDialog.tsx` - Mostrar técnico asignado
- `src/types/database.ts` - Actualizar tipo Prospect

---

## 3. Error de Columna `phone3_signer` en Clientes

**Problema**: La tabla `clients` tiene columna `phone3` pero el código usa `phone3_signer` (que es el nombre en la tabla `prospects`).

**Solución**: Corregir todas las referencias en `ClientDetail.tsx` para usar `phone3` en lugar de `phone3_signer`.

**Archivos a modificar**:
- `src/pages/ClientDetail.tsx` - Cambiar `phone3_signer` por `phone3` en:
  - Líneas 312-313 (inicialización)
  - Líneas 428-429 (handleCancelEdit)
  - Líneas 496-497 (handleSave)
  - Línea 743-744 (input de edición)

---

## 4. Apellidos Pegados al Nombre

**Problema**: El código actual muestra correctamente los nombres separados. El problema probablemente está en cómo se importaron/crearon los datos originalmente, no en el código de visualización.

**Verificación**: La línea 794 muestra: `{client.first_name} {client.last_name_paterno} {client.last_name_materno || ''}`

**Acción**: No se requiere cambio de código, pero validar que los formularios de entrada no permitan pegado incorrecto.

---

## 5. Eliminar Cero como Valor Inicial en Cargos Adicionales

**Problema**: El campo de cargos adicionales muestra "0" como valor inicial en modo edición.

**Solución**: Inicializar con cadena vacía en lugar de 0 cuando el valor es 0.

**Archivos a modificar**:
- `src/components/clients/ClientFormDialog.tsx` - Cambiar valor default de `additional_charges`

---

## 6. Formateo de MAC Address (XX:XX:XX:XX:XX:XX)

**Problema**: No hay validación ni formateo automático de direcciones MAC.

**Solución**: Crear función de formateo y componente de input para MAC.

**Cambios**:
1. Crear función `formatMacAddress` en `src/lib/phoneUtils.ts` (o nuevo archivo)
2. Crear componente `MacAddressInput` o modificar inputs existentes
3. Limitar a 12 dígitos hexadecimales
4. Auto-insertar dos puntos cada 2 caracteres

**Archivos a crear/modificar**:
- `src/lib/formatUtils.ts` (nuevo) - Funciones de formateo MAC
- `src/components/shared/MacAddressInput.tsx` (nuevo) - Componente de input
- `src/pages/ClientDetail.tsx` - Usar nuevo componente para MAC de antena/router
- `src/components/clients/ClientFormDialog.tsx` - Usar nuevo componente

---

## 7. Estado de Cuenta - Costos Iniciales y Botón de Cargos Extras

**Problema**: No se muestran los costos iniciales (instalación, prorrateo) y falta botón de agregar cargos extras.

**Solución**: 
1. Agregar sección de resumen con costos iniciales en la pestaña Estado de Cuenta
2. Agregar botón para crear nuevos cargos

**Archivos a modificar**:
- `src/pages/ClientDetail.tsx` - En la sección TabsContent "estado-cuenta":
  - Agregar Card con resumen de costos iniciales (instalación, prorrateo, adicionales)
  - Agregar botón "Agregar Cargo Extra" con diálogo

---

## 8. Homologar Guiones en Teléfonos

**Problema**: El formato XXX-XXX-XXXX ya está implementado en `formatPhoneNumber`.

**Verificación**: La función en `phoneUtils.ts` líneas 25-39 ya maneja esto correctamente.

**Acción**: Asegurar que todos los inputs de teléfono usen el componente `PhoneInput`.

---

## 9. En Estado de Cuenta - Tipo Muestra ID en Lugar de Nombre

**Problema**: En la tabla de pagos, `payment_type` muestra el ID del tipo de pago en lugar del nombre.

**Solución**: Hacer join con la tabla `payment_methods` o resolver el nombre al mostrar.

**Archivos a modificar**:
- `src/pages/ClientDetail.tsx` - En la sección de historial de pagos, mostrar el nombre del método de pago en lugar del ID

---

## 10. Pagos: Conciliar Deudas de Más Antigua a Más Nueva

**Problema**: El código actual ya ordena por `created_at` ascendente (línea 226 de PaymentFormDialog.tsx).

**Verificación**: `.order('created_at', { ascending: true })` ya está implementado.

**Acción**: Verificar que funciona correctamente. Si el problema persiste, agregar ordenamiento adicional por `due_date`.

---

## 11. Saldo Mayor a Deuda - Registrar Mensualidad Adelantada

**Problema**: Cuando el pago excede la deuda actual, debería generar un registro de mensualidad adelantada.

**Solución**: Modificar lógica de pago para:
1. Detectar cuando hay excedente
2. Crear cargo de mensualidad adelantada
3. Aplicar el excedente a ese nuevo cargo

**Archivos a modificar**:
- `src/components/payments/PaymentFormDialog.tsx` - Agregar lógica de mensualidad adelantada

---

## 12. Asignar Planes - Costo del Plan como Valor Inicial

**Problema**: Al asignar/cambiar plan, el costo debería pre-llenarse pero ser editable.

**Solución**: Ya está parcialmente implementado en `ChangePlanDialog.tsx`. Verificar que el campo de tarifa mensual es editable.

**Archivos a modificar**:
- `src/components/clients/ChangePlanDialog.tsx` - Agregar campo editable para monthly_fee

---

## 13. Cerrar Modal de Pago Después de Pagar

**Problema**: El modal no se cierra automáticamente tras pago exitoso.

**Solución**: Agregar `onOpenChange(false)` después del toast de éxito.

**Archivos a modificar**:
- `src/components/payments/PaymentFormDialog.tsx` - Agregar cierre del modal en línea ~288 después de `onSuccess()`

---

## 14. Al Crear Cliente - Pedir Datos Iniciales Una Sola Vez

**Problema**: El flujo de creación desde prospecto (`FinalizeProspectDialog`) no pide los datos de facturación iniciales.

**Solución**: Modificar `FinalizeProspectDialog` para incluir:
1. Tab adicional para datos de facturación
2. Cálculo de prorrateo
3. Creación de cargos iniciales

**Archivos a modificar**:
- `src/components/prospects/FinalizeProspectDialog.tsx` - Agregar formulario de facturación completo

---

## Secuencia de Implementación

### Fase 1: Correcciones Críticas (errores que bloquean funcionalidad)
1. Corregir `phone3_signer` → `phone3` en ClientDetail.tsx
2. Cerrar modal de pago después de pagar

### Fase 2: Mejoras de Base de Datos
3. Agregar columna `assigned_to` a prospects
4. Actualizar formularios de prospectos

### Fase 3: Formateo y Validación
5. Crear componente MacAddressInput
6. Aplicar formateo MAC en formularios

### Fase 4: Estado de Cuenta
7. Agregar resumen de costos iniciales
8. Agregar botón de cargos extras
9. Mostrar nombre de tipo de pago en lugar de ID

### Fase 5: Flujo de Cliente
10. Agregar botón editar en Prospectos pendientes
11. Mejorar FinalizeProspectDialog con datos de facturación
12. Agregar campo editable de tarifa en ChangePlanDialog

### Fase 6: Lógica de Pagos
13. Implementar registro de mensualidad adelantada

---

## Detalles Técnicos

### Nueva Migración de Base de Datos
```sql
-- Agregar campo assigned_to a prospects
ALTER TABLE public.prospects 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- Agregar índice para consultas
CREATE INDEX idx_prospects_assigned_to ON public.prospects(assigned_to);
```

### Nuevo Archivo: src/lib/formatUtils.ts
```typescript
export const formatMacAddress = (value: string): string => {
  // Remover todo excepto hexadecimales
  const hex = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  // Limitar a 12 caracteres
  const limited = hex.slice(0, 12);
  // Insertar : cada 2 caracteres
  const parts = limited.match(/.{1,2}/g) || [];
  return parts.join(':');
};

export const unformatMacAddress = (value: string): string => {
  return value.replace(/:/g, '');
};

export const isValidMacAddress = (value: string): boolean => {
  const unformatted = unformatMacAddress(value);
  return /^[0-9A-Fa-f]{12}$/.test(unformatted);
};
```

### Nuevo Componente: MacAddressInput
```typescript
interface MacAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
```

---

## Resultado Esperado

Después de implementar estos cambios:
- Los prospectos pendientes podrán editarse con historial de cambios
- Se podrá asignar un técnico a cada prospecto
- El teléfono 3 del cliente funcionará correctamente
- Las direcciones MAC tendrán formato XX:XX:XX:XX:XX:XX
- El estado de cuenta mostrará costos iniciales y permitirá agregar cargos
- Los pagos mostrarán el nombre del método, no el ID
- El modal de pago se cerrará automáticamente
- Al finalizar prospecto se pedirán datos de facturación una sola vez
