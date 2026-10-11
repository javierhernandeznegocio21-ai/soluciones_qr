---
name: playwright-testing
description: Automatización de pruebas end-to-end (E2E), verificación de flujos UI, pruebas de integración frontend y captura de evidencias visuales con Playwright.
---

# Procedimientos y Estándares de Automatización E2E con Playwright

## Objetivo

Guiar la creación, ejecución, auto-adaptación y mantenimiento de pruebas automatizadas End-to-End (E2E) con Playwright para verificar la estabilidad de las vistas, formularios, modales interactivos (SweetAlert2, Select2) y peticiones AJAX en la plataforma web.

---

## 1. Instalación y Configuración del Entorno

### Inicialización en el Proyecto

Para configurar Playwright en el entorno local:

```bash
# Inicializar paquete npm e instalar Playwright Test
npm init -y
npm install -D @playwright/test

# Instalar navegadores soportados (Chromium, Firefox, WebKit) y dependencias del sistema
npx playwright install --with-deps
```

### Configuración Estándar (`playwright.config.js`)

```javascript
// @ts-check
const baseURL = process.env.BASE_URL || "http://172.17.0.2/syspv/conciliacion/";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: baseURL,
      },
    },
  ],
});
```

---

## 2. Patrones de Prueba y Selectores Clave

### A. Autenticación y Manejo de Sesión

El sistema utiliza el formulario de acceso en `index.php` con campos `username` y `password`. Las credenciales de prueba predeterminadas son `desarrollador` / `Temporal01$`.

```javascript
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers/auth");

test.describe("Módulo de Pruebas", () => {
  test.beforeEach(async ({ page }) => {
    // Inicia sesión automáticamente con las credenciales de prueba
    await login(page, "desarrollador", "Temporal01$");
  });

  test("Acceso al dashboard", async ({ page }) => {
    await page.goto("dashboard.php");
    await expect(page).toHaveURL(/.*dashboard\.php/);
  });
});
```

### B. Validación de Combos y Funcionalidad de Select2

#### 1. Verificación de Carga de Opciones y Estado Inicial
```javascript
test("Validar carga de valores y Select2 en combo", async ({ page }) => {
  // Verificar que el select original tenga opciones cargadas
  const select = page.locator("#branch_filter");
  await expect(select).toBeAttached();
  const options = select.locator("option");
  expect(await options.count()).toBeGreaterThanOrEqual(5);

  // Verificar que Select2 lo haya inicializado (clase generada por la librería)
  await expect(select).toHaveClass(/select2-hidden-accessible/);

  // Verificar que el contenedor visual (.select2-container) esté visible en pantalla
  const container = page.locator("select#branch_filter + .select2-container");
  await expect(container).toBeVisible();
});
```

#### 2. Interacción con Dropdown Estático y Selección
```javascript
test("Abrir Select2 estático y seleccionar opción", async ({ page }) => {
  const container = page.locator("select#branch_filter + .select2-container");
  await container.click();

  // El dropdown debe abrirse en el body
  const dropdown = page.locator(".select2-dropdown");
  await expect(dropdown).toBeVisible();

  // Seleccionar la opción deseada
  const option = dropdown.locator(".select2-results__option", { hasText: "Cerdo en Pie" });
  await option.click();

  // Validar que el valor del select original se actualice
  await expect(page.locator("#branch_filter")).toHaveValue("CEP");
});
```

#### 3. Búsqueda Dinámica Asíncrona AJAX
```javascript
test("Seleccionar cliente en Select2 con búsqueda AJAX", async ({ page }) => {
  // Abrir el dropdown de Select2
  await page.locator("select#client_selector + .select2-container").click();

  // Escribir en el campo de búsqueda de Select2
  const searchInput = page.locator(".select2-search__field");
  await searchInput.fill("CARVIC");

  // Esperar el resultado y hacer clic en la opción coincidente
  const option = page.locator(".select2-results__option", { hasText: "CARVIC" });
  await option.first().waitFor({ state: "visible", timeout: 5000 });
  await option.first().click();
});
```

### C. Manejo de Alertas SweetAlert2

```javascript
test("Confirmar acción en SweetAlert2", async ({ page }) => {
  // Disparar acción que abre el modal
  await page.click("#btn-facturar");

  // Validar presencia del modal de SweetAlert2
  const swalModal = page.locator(".swal2-popup");
  await expect(swalModal).toBeVisible();

  // Confirmar acción
  await page.click(".swal2-confirm");

  // Validar respuesta de éxito
  await expect(page.locator(".swal2-icon-success")).toBeVisible();
});
```

### D. Tablas AJAX con Paginación y Filtros

```javascript
test("Filtrar tabla AJAX y validar respuesta", async ({ page }) => {
  await page.goto("/facturas_ppd.php?branch=Obrador");

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("ajax/facturas_ajax.php") && res.status() === 200,
    ),
    page.fill("#q", "FAC-001"),
  ]);

  const body = await response.text();
  expect(body).toContain("FAC-001");
});
```

### E. Modales Bootstrap y Selección Múltiple / Agrupación

Cuando una vista permita seleccionar múltiples elementos mediante checkboxes (`.check_ppd_item`, `#check_all_ppd`) para disparar una barra flotante de resumen y abrir un modal de procesamiento agrupado (`#modalPagoPPD`):

```javascript
test("Selección múltiple, activación de barra flotante y apertura de modal", async ({
  page,
}) => {
  await page.goto("facturas_ppd.php?branch=Obrador");

  // 1. Simular o esperar carga de checkboxes
  const checkboxes = page.locator(".check_ppd_item");
  await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });

  // 2. Marcar primer elemento y validar que la barra flotante se active
  await checkboxes.first().check();
  const floatingBar = page.locator("#barSeleccionPPD");
  await expect(floatingBar).toHaveClass(/activa/);
  await expect(page.locator("#txtSeleccionadasCount")).toHaveText("1");

  // 3. Abrir el modal Bootstrap desde la barra de acción
  const btnPagar = page.locator("#btnPagarSeleccionadas");
  await expect(btnPagar).toBeEnabled();
  await btnPagar.click();

  // 4. Validar visualización y elementos del modal
  const modal = page.locator("#modalPagoPPD");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".modal-title")).toContainText(
    /Complemento de Pago/i,
  );

  // 5. Cerrar modal con botón cancelar o data-dismiss
  await modal.locator('button[data-dismiss="modal"]').first().click();
  await expect(modal).not.toBeVisible();
});
```

---

## 3. Comandos de Ejecución

Proporcionar siempre al desarrollador los comandos para ejecución manual:

```bash
# Ejecutar todas las pruebas E2E
npx playwright test

# Ejecutar una prueba específica en modo visual (Headed)
npx playwright test tests/e2e/facturas_ppd.spec.js --headed

# Modo interactivo con UI
npx playwright test --ui

# Generar y abrir el reporte HTML
npx playwright show-report
```

---

## 4. Reglas de Calidad y Buenas Prácticas

1. **Evitar esperas fijas (`page.waitForTimeout`):** Utilizar siempre esperas basadas en estado (`expect(locator).toBeVisible()`, `waitForResponse()`, `page.waitForLoadState('networkidle')`).
2. **Aislamiento de Pruebas:** Cada test debe ser autónomo y no depender del estado dejado por tests previos.
3. **Captura de Evidencias:** Configurar capturas de pantalla y trazas automáticas en caso de fallo para agilizar el diagnóstico.

---

## 5. Protocolo de Auto-Adaptación y Mantenimiento ante Cambios en Vistas

Cada vez que un agente o desarrollador realice modificaciones en las interfaces (vistas PHP, scripts AJAX, submenús, inputs o tablas):

1. **Detección de Impacto:**
   - Si se añade un nuevo submenú en `sidebar.php`, verificar la navegación en `tests/e2e/`.
   - Si se agregan o cambian IDs de inputs, parámetros GET/POST o nombres de clases CSS, ubicar el test spec correspondiente en `tests/e2e/`.
2. **Auto-Corrección y Actualización de Tests:**
   - Actualizar los selectores y aserciones en el archivo `.spec.js` respectivo para reflejar los nuevos requerimientos y evitar pruebas obsoletas.
   - Crear un nuevo archivo de test si la vista o flujo es completamente nuevo (ej. `tests/e2e/<modulo>.spec.js`).
3. **Evolución del Skill:**
   - Si surge un patrón interactivo no documentado (modales Bootstrap, loaders personalizados, exportaciones CSV/PDF), agregar el snippet de ejemplo en la sección 2 de este archivo (`SKILL.md`).
