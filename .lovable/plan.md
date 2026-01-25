
# Plan: Corregir Campo de Costo de Instalación y Prevenir Guardado Accidental

## Problemas Identificados

### 1. Campo "Costo de Instalación" con 0 inicial
**Ubicación**: `src/components/prospects/FinalizeProspectDialog.tsx`
- Línea 159: `installation_cost: 0` como valor por defecto
- Línea 191: Se resetea a `0` cuando se carga el prospecto
- Líneas 889-895: El input muestra "0" porque el valor es 0

**Problema**: El usuario ve "0" en el campo en lugar de un campo vacío.

### 2. Formulario se guarda automáticamente
**Ubicación**: `src/components/prospects/FinalizeProspectDialog.tsx`
- Línea 525: `<form onSubmit={form.handleSubmit(handleFinalize)}>`
- Línea 1144: El botón "Siguiente" tiene `type="button"` (correcto)
- **Problema**: Si el usuario presiona Enter en cualquier campo de texto (Input), el formulario se envía automáticamente porque es el comportamiento por defecto de HTML forms.

---

## Solución Propuesta

### Parte 1: Eliminar 0 Inicial de Campos Numéricos

**Cambios en defaultValues y reset:**
```typescript
// Línea 159 - Cambiar de 0 a undefined
installation_cost: undefined,
prorated_amount: undefined,
monthly_fee: undefined,

// Línea 191 - Cambiar reset a undefined
installation_cost: undefined,
prorated_amount: undefined,
monthly_fee: 0, // Este sí debe mostrar 0 si no hay plan
```

**Cambios en los inputs numéricos:**
Los inputs de tipo `number` con valor `undefined` mostrarán el campo vacío en lugar de "0".

Modificar el onChange de los inputs para manejar valores vacíos:
```typescript
// Líneas 893-894 - Para installation_cost
onChange={(e) => {
  const value = e.target.value;
  field.onChange(value === '' ? undefined : parseFloat(value));
}}
value={field.value ?? ''}  // Mostrar vacío si es undefined o 0
```

### Parte 2: Prevenir Submit Accidental con Enter

**Opción A - Prevenir Enter en el form (RECOMENDADA):**
```typescript
// En el form, línea 525
<form 
  onSubmit={form.handleSubmit(handleFinalize)} 
  onKeyDown={(e) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  }}
  className="space-y-4"
>
```

Esta solución previene que al presionar Enter en cualquier Input se envíe el formulario. Solo el botón "Finalizar y Crear Cliente" podrá enviar el form.

---

## Cambios Específicos

### Archivo: `src/components/prospects/FinalizeProspectDialog.tsx`

#### 1. Modificar defaultValues (líneas 156-161)
```typescript
defaultValues: {
  // ... otros campos ...
  monthly_fee: undefined,        // era 0
  installation_cost: undefined,  // era 0
  prorated_amount: undefined,    // era 0
}
```

#### 2. Modificar reset en useEffect (líneas 186-193)
```typescript
// Billing defaults
plan_id: '',
monthly_fee: undefined,          // era 0
installation_cost: undefined,    // era 0  
prorated_amount: undefined,      // era 0
```

#### 3. Modificar input de Costo de Instalación (líneas 889-895)
```typescript
<Input
  type="number"
  min="0"
  step="0.01"
  value={field.value ?? ''}
  onChange={(e) => {
    const value = e.target.value;
    field.onChange(value === '' ? undefined : parseFloat(value));
  }}
/>
```

#### 4. Aplicar mismo patrón a otros inputs numéricos
- Mensualidad (líneas 818-826)
- Prorrateo (líneas 921-926)

#### 5. Prevenir submit con Enter (línea 525)
```typescript
<form 
  onSubmit={form.handleSubmit(handleFinalize)} 
  onKeyDown={(e) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  }}
  className="space-y-4"
>
```

#### 6. Actualizar cálculos para manejar undefined
```typescript
// En totalInitialBalance (líneas 269-272)
const totalInitialBalance = 
  (form.watch('installation_cost') || 0) + 
  (form.watch('prorated_amount') || 0) + 
  totalAdditionalCharges;
// Esto ya maneja undefined correctamente con || 0
```

---

## Resultado Esperado

1. **Campo Costo de Instalación**: Aparecerá vacío inicialmente, sin "0"
2. **Campo Prorrateo**: Aparecerá vacío inicialmente, sin "0"  
3. **Guardado accidental**: Presionar Enter en cualquier campo NO enviará el formulario
4. **Solo el botón "Finalizar y Crear Cliente"** podrá guardar el cliente
5. **Los cálculos seguirán funcionando** correctamente tratando undefined como 0

---

## Flujo de Usuario Corregido

1. Usuario abre el modal de conversión
2. Los campos de costo están vacíos (no "0")
3. Usuario navega con "Siguiente" entre tabs
4. Si presiona Enter en cualquier campo, NO se guarda
5. Solo al hacer clic en "Finalizar y Crear Cliente" en el tab Resumen se guarda
