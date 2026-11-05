# Guía Práctica de Pruebas de Software: Aplicación Task Manager
**Materia:** Desarrollo Móvil Integral — Unidad II  
**Carrera:** Ingeniería en Desarrollo y Gestión de Software — UTNG  
**Aplicación bajo prueba:** Task Manager (Frontend Flutter + Backend Node.js/Express + PostgreSQL + JWT con Refresh Tokens)  
**Autor:** Andy (Estudiante de Ingeniería)  
**Fecha:** Noviembre 2026  

---

## Índice General
1. [Mentalidad de Tester, Pirámide de Pruebas y Criterios de Aceptación](#1-mentalidad-de-tester-y-plan-de-pruebas)
2. [Diseño de Casos de Prueba y Reporte Profesional de Defectos (Bugs)](#2-casos-de-prueba-y-reportes-de-bugs)
3. [Pruebas Exploratorias con Misión (Charter) y Bitácora de Sesión](#3-pruebas-exploratorias-con-charter)
4. [Pruebas Unitarias Aisladas (Backend Jest y Flutter Test)](#4-pruebas-unitarias-en-aislamiento)
5. [Pruebas de Componentes y Widgets en Flutter](#5-pruebas-de-widgets-flutter)
6. [Pruebas de Integración de API y Backend (Supertest)](#6-pruebas-de-api-y-backend-integrado)
7. [Pruebas de Flujos Completos de Usuario (End-to-End / Journey)](#7-pruebas-de-flujos-completos-end-to-end)
8. [Técnicas de Diseño: Particiones de Equivalencia y Valores Límite (BVA)](#8-particiones-de-equivalencia-y-valores-límite)
9. [Pruebas Negativas y Seguridad de APIs (OWASP API Security Top 10)](#9-pruebas-negativas-y-seguridad-básica)
10. [Pruebas de Rendimiento y Carga Segura con k6](#10-pruebas-de-rendimiento-y-carga-con-k6)
11. [Pruebas de Usabilidad y Accesibilidad Móvil](#11-usabilidad-y-accesibilidad)
12. [Pruebas de Compatibilidad Multiplataforma y Dispositivos](#12-compatibilidad-de-dispositivos-y-plataformas)
13. [Estrategia de Smoke Tests, Regresión y Manejo de Datos de Prueba](#13-smoke-tests-regresion-y-gestion-de-datos)
14. [Integración Continua (CI/CD) con GitHub Actions y Cobertura de Código](#14-automatizacion-en-ci-y-cobertura)
15. [Estrategia de Dobles de Prueba (Mocks) vs Integración y Mitigación de Flaky Tests](#15-mocks-cuidadosos-y-pruebas-inestables)
16. [Plan de Pruebas Maestro (Master Test Plan)](#16-plan-de-pruebas-maestro)

---

## 1. Mentalidad de Tester y Plan de Pruebas

### 1.1 El Enfoque del Tester Profesional
El objetivo de un tester no es demostrar que una aplicación "funciona", sino cuestionar sus supuestos, explorar sus límites, modelar el comportamiento de usuarios reales y adversarios, y verificar que el software falle de manera elegante y segura.

```
                    ┌─────────────────────────┐
                    │    Pruebas E2E / UI     │  Pocas, lentas, costosas,
                    │    (User Journeys)      │  alta fidelidad visual
                    ├─────────────────────────┤
                    │   Integración y API     │  Medio volumen, velocidad media,
                    │   (Supertest / DB)      │  verifican contratos y seguridad
                    ├─────────────────────────┤
                    │    Pruebas Unitarias    │  Muchas, ultra rápidas, baratas,
                    │   (Jest / flutter_test) │  lógica pura y validaciones
                    └─────────────────────────┘
```

### 1.2 Ejercicio Práctico: Criterios de Aceptación para "Creación de Tareas"
Se tomó como base la funcionalidad **Creación de Tareas (Task Creation)** por parte de un usuario autenticado.

#### Criterio 1: Éxito Típico (Happy Path)
* **Escenario:** Creación exitosa de una tarea con datos válidos.
* **Dado que** el usuario "andy_tester" ha iniciado sesión con un token JWT válido,
* **Cuando** envía una solicitud `POST /api/v1/tasks` con el cuerpo `{"title": "Terminar reporte de pruebas unitarias", "description": "Completar la suite de Jest"}`,
* **Entonces** el servidor debe responder con un código HTTP `201 Created`, retornar el objeto de la tarea con un `id` único generado, fecha de creación `createdAt`, estatus `completed: false`, y dicha tarea debe persistirse asociada únicamente al `userId` del token y reflejarse de inmediato en su lista de tareas.

#### Criterio 2: Entrada Inválida (Invalid Input / Negative Case)
* **Escenario:** Rechazo de tarea con título compuesto exclusivamente por espacios en blanco.
* **Dado que** el usuario "andy_tester" cuenta con sesión activa,
* **Cuando** intenta guardar una tarea con el título `"     "` (tres o más espacios en blanco),
* **Entonces** el sistema debe rechazar la creación antes de insertar en base de datos, retornando un código HTTP `400 Bad Request` con una respuesta JSON estructurada: `{"error": "VALIDATION_ERROR", "message": "El título de la tarea no puede estar vacío ni contener solo espacios."}`, y no debe alterarse el conteo de tareas del usuario.

#### Criterio 3: Límite de Permisos y Frontera de Seguridad (Permission Boundary / IDOR Prevention)
* **Escenario:** Inyección de identificador de propietario arbitrario (`ownerId`) en la creación.
* **Dado que** el usuario autenticado tiene el identificador `user_id = "usr-100"`,
* **Cuando** el usuario envía una solicitud maliciosa `POST /api/v1/tasks` conteniendo un cuerpo manipulado: `{"title": "Tarea ajena", "ownerId": "usr-999-victim"}`,
* **Entonces** el backend debe desestimar o rechazar el campo `ownerId` del cliente, asignando de forma estricta y forzosa la tarea al identificador extraído del payload del token JWT verificado (`usr-100`), garantizando que ningún usuario pueda atribuir tareas a cuentas de terceros ni alterar permisos de propiedad.

---

## 2. Casos de Prueba y Reportes de Bugs

### 2.1 Caso de Prueba: Creación y Visualización de Tarea
| Campo | Detalle |
| :--- | :--- |
| **ID y Título** | `TC-TASK-001`: Validación de creación y persistencia de tarea con caracteres alfanuméricos |
| **Precondiciones** | 1. Usuario `tester_qa@utng.edu.mx` registrado.<br>2. Base de datos de pruebas inicializada.<br>3. Aplicación móvil abierta en pantalla principal. |
| **Pasos de Ejecución** | 1. Iniciar sesión con credenciales sintéticas válidas.<br>2. Presionar el botón flotante `+` (Crear Tarea).<br>3. Escribir en el campo título: `"Revisar PR #42 de autenticación"`.<br>4. Presionar el botón "Guardar". |
| **Datos de Prueba** | Email: `tester_qa@utng.edu.mx` \| Password: `TestPassword#2026!` \| Título: `"Revisar PR #42 de autenticación"` |
| **Resultado Esperado** | La aplicación muestra un SnackBar de confirmación `"Tarea creada exitosamente"`, se cierra el diálogo modal y la nueva tarea aparece al inicio de la lista con estado pendiente. |
| **Resultado Actual** | Se crea correctamente y aparece en la lista. |
| **Ambiente** | Flutter 3.24 (Android 14 Emulator Pixel 7), Node.js v24.12, PostgreSQL 16 local. |

---

### 2.2 Ejercicio Práctico: Reporte de Bug Profesional
**Escenario:** *Una tarea desaparece de la interfaz inmediatamente después de ser marcada como completada sin que el filtro de "Mostrar completadas" esté desactivado.*

```
================================================================================
REPORTE FORMAL DE DEFECTO (DEFECT/BUG REPORT)
================================================================================
ID: BUG-TASK-089
TÍTULO: La tarea desaparece permanentemente de la vista activa tras marcar el checkbox de completado
ESTADO: Nuevo / Abierto
MÓDULO: mobile/lib/screens/task_list_screen.dart (Gestión de Estado BLoC/Provider)
SEVERIDAD: ALTA (High) - Pérdida de visibilidad de datos e inconsistencia grave de estado.
PRIORIDAD: ALTA (High) - Impacta el flujo central de valor del producto.
REPORTERO: Andy - QA Automation Engineer
ASIGNADO A: Tech Lead / Flutter Mobile Team
================================================================================
```

#### Descripción Resumida
Al tocar el checkbox para marcar una tarea pendiente como "completada", el elemento sufre una animación de desvanecimiento y desaparece inmediatamente de la pantalla, en lugar de permanecer visible con tachado y estado completado. Al reiniciar la app, la tarea continúa sin mostrarse a menos que se fuerce una recarga limpia de caché.

#### Ambiente de Pruebas
* **Dispositivo:** Emulador Android Google Pixel 7 Pro (API 34).
* **Versión de la App Móvil:** v1.2.0-beta.3 (Build 104).
* **Backend API:** v1.1.0 ejecutándose localmente en Node.js v24 con PostgreSQL 16.
* **Red:** Conexión local Wi-Fi / loopback sin latencia simulada.

#### Precondiciones
* Usuario de prueba `qa_user_alpha@utng.test` con sesión iniciada.
* Existencia de al menos dos tareas en estado `pending`:
  * Tarea A: `"Estudiar para examen de redes"` (ID: `a1b2c3d4-0001`)
  * Tarea B: `"Subir práctica de testing"` (ID: `a1b2c3d4-0002`)
* El filtro visual de la barra superior está configurado en **"Todas las tareas"** (All Tasks).

#### Pasos para Reproducir
1. Abrir la aplicación Task Manager y navegar a la lista principal de tareas.
2. Localizar la Tarea A (`"Estudiar para examen de redes"`).
3. Presionar una sola vez sobre el `Checkbox` ubicado a la izquierda del título.
4. Observar la pantalla y la lista de tareas.

#### Resultado Esperado
1. El checkbox debe cambiar su estado visual a marcado (`checked`).
2. El texto del título de la tarea debe formatearse con línea tachada (`TextDecoration.lineThrough`) y color atenuado.
3. Se envía la petición `PATCH /api/v1/tasks/a1b2c3d4-0001` con `{"completed": true}`.
4. La tarea debe **permanecer en la lista** en su posición actual, indicando claramente al usuario que fue completada.

#### Resultado Actual
1. Se dispara la petición HTTP `PATCH` y el servidor responde correctamente con `HTTP 200 OK {"id": "...", "completed": true}`.
2. Sin embargo, en el estado local de Flutter, el manejador de la lista ejecuta un filtrado erróneo:
   `state.tasks.removeWhere((t) => t.id == completedId);` en vez de actualizar la propiedad `task.isCompleted = true`.
3. La tarea desaparece instantáneamente de la vista, provocando la sensación en el usuario de que su tarea fue borrada por accidente.

#### Evidencia Técnica y Logs
```json
// Log capturado en consola de depuración de Flutter:
[VERBOSE-2:ui_dart_state.cc] [TASK_BLOC] Emitted event: TaskStatusUpdated(id: a1b2c3d4-0001, isCompleted: true)
[VERBOSE-2:ui_dart_state.cc] [TASK_STATE] TaskListState mutated: items count changed from 2 to 1! 
[VERBOSE-2:ui_dart_state.cc] [CRITICAL] Item a1b2c3d4-0001 was dropped from display list due to strict pendingFilter active by default in filterReducer.
```

#### Análisis de Causa Raíz (Root Cause Analysis - RCA Preliminar)
En el archivo `task_list_cubit.dart`, el selector de la vista está reutilizando incorrectamente la función de filtro de la pestaña "Solo Pendientes" (`tasks.where((t) => !t.isCompleted)`), causando que cualquier cambio a `completed: true` expulse al elemento del array reactivo de la vista actual.

---

## 3. Pruebas Exploratorias con Charter

### 3.1 Misión de Exploración (Charter)
> **Charter:** "Explorar exhaustivamente el flujo de creación y edición de tareas, sometiendo el sistema a condiciones extremas de validación de texto, pulsaciones concurrentes y cortes repentinos de conectividad, con el fin de detectar anomalías de duplicidad, pérdida de datos o inconsistencias de sincronización offline/online."
> 
> **Tiempo límite (Timebox):** 15 minutos  
> **Tester:** Andy  
> **Ambiente:** App Flutter en emulador Android + API Node.js local.

### 3.2 Ejercicio Práctico: Bitácora de Sesión Exploratoria (Session Notes)

| Tiempo | Acción / Condición Inducida | Observación Detallada | Hallazgo / Sorpresa / Seguimiento |
| :---: | :--- | :--- | :--- |
| **00:00 - 03:00** | **Título excesivamente largo (>120 caracteres):**<br>Se ingresa una cadena de 250 caracteres alfanuméricos en el campo de título al crear tarea. | El campo en la app móvil no tiene límite de caracteres definido (`maxLength`). Permite escribir los 250 caracteres. Al presionar "Guardar", la API rechaza la petición con `HTTP 400 TypeError: Enter a valid title`. | **Sorpresa:** La app móvil no muestra un mensaje claro al usuario; la pantalla se queda congelada con el botón de carga en bucle infinito porque el bloque `catch` en Flutter no deserializa el mensaje de error de la API. Requiere issue para agregar `maxLength: 120` en el `TextField` y parsear el error 400. |
| **03:01 - 06:30** | **Título en blanco y con espacios:**<br>Se introducen 10 espacios `"          "` en el título y se presiona "Guardar". | El botón "Guardar" está habilitado (no valida `trim().isEmpty`). Al dar tap, el cliente envía la petición. La API responde 400. La app despliega un diálogo genérico "Ocurrió un error inesperado". | **Oportunidad de mejora:** Validación del lado cliente inmediata. El botón "Guardar" debe permanecer deshabilitado mientras `titleController.text.trim().isEmpty`. Ahorra llamadas innecesarias al backend. |
| **06:31 - 10:00** | **Toques rápidos repetidos (Rapid Repeated Taps / Double Submit):**<br>Se escribe un título válido `"Comprar servidor NAS"` y se presiona el botón "Guardar" 6 veces muy rápidamente (spam de taps). | El botón de guardar no se desactiva inmediatamente tras el primer tap. Se enviaron 4 solicitudes `POST /api/v1/tasks` concurrentes antes de que la pantalla se cerrara. | **¡Fallo Crítico Encontrado!** El servidor insertó 4 tareas duplicadas exactamente iguales con milisegundos de diferencia en la base de datos PostgreSQL. **Solución requerida:** Debounce/throttle en el botón móvil y bloqueo del formulario (`isLoading = true`), además de token de idempotencia en backend. |
| **10:01 - 15:00** | **Interrupción repentina de conectividad (Offline Switch):**<br>Se abre el modal de edición de una tarea existente, se modifica el título a `"Nuevo título editado"`. Justo antes de tocar "Guardar", se activa el Modo Avión en el emulador. | Al presionar "Guardar", la app muestra un spinner durante 25 segundos hasta que lanza `SocketException: OS Error: Connection refused`. Al reanudar internet, los cambios se perdieron y el formulario se cerró, mostrando el título antiguo. | **Comportamiento:** La app no cuenta con cola de sincronización offline (Local Cache/SQLite). Aunque es aceptable para un MVP sin soporte offline anunciado, el timeout de 25 segundos es excesivo; debería tener un timeout de 8 segundos y mantener el borrador en memoria para reintentar. |

---

## 4. Pruebas Unitarias en Aislamiento

### 4.1 Backend (Node.js + Jest)
La función de validación de títulos debe rechazar datos nulos, tipos incorrectos, cadenas vacías, cadenas con puros espacios y longitudes superiores a 120 caracteres.

#### Implementación (`src/tasks/validation.js`):
```javascript
'use strict';

/**
 * Trims and validates a task title.
 *
 * @param {unknown} value - Untrusted title input.
 * @returns {string} The validated title.
 * @throws {TypeError} When the title is not valid.
 */
function validateTitle(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Enter a valid title.');
  }

  const title = value.trim();

  if (title.length < 1 || title.length > 120) {
    throw new TypeError('Enter a valid title.');
  }

  return title;
}

module.exports = { validateTitle };
```

#### Ejercicio Práctico: Suite de Pruebas con Casos Límite (`test/validation.test.js`)
*Se agregaron las pruebas para el límite máximo permitido (120 caracteres) y valores de borde:*
```javascript
'use strict';

const { validateTitle } = require('../src/tasks/validation');

describe('validateTitle - Suite de Pruebas Unitarias Aisladas', () => {
  test('trims a valid title with surrounding spaces', () => {
    expect(validateTitle('   Plan tests and review code   ')).toBe('Plan tests and review code');
  });

  test('rejects a blank title containing only whitespace', () => {
    expect(() => validateTitle('     ')).toThrow('Enter a valid title.');
  });

  test('rejects an empty string', () => {
    expect(() => validateTitle('')).toThrow('Enter a valid title.');
  });

  test('rejects non-string values (numbers, objects, null, undefined)', () => {
    expect(() => validateTitle(null)).toThrow('Enter a valid title.');
    expect(() => validateTitle(undefined)).toThrow('Enter a valid title.');
    expect(() => validateTitle(12345)).toThrow('Enter a valid title.');
    expect(() => validateTitle({ title: 'Hack' })).toThrow('Enter a valid title.');
    expect(() => validateTitle(['item'])).toThrow('Enter a valid title.');
  });

  // EJERCICIO PRÁCTICO: Límite máximo de 120 caracteres exactos (Debe ser Aceptado)
  test('accepts a valid title with exactly 120 characters (maximum allowed boundary)', () => {
    const maxTitle = 'A'.repeat(120);
    const result = validateTitle(maxTitle);
    expect(result).toBe(maxTitle);
    expect(result.length).toBe(120);
  });

  // EJERCICIO PRÁCTICO: 121 caracteres (Debe ser Rechazado)
  test('rejects a title longer than 120 characters (121 characters)', () => {
    const overLimitTitle = 'A'.repeat(121);
    expect(() => validateTitle(overLimitTitle)).toThrow('Enter a valid title.');
  });

  test('accepts a title of minimum valid length (1 character)', () => {
    expect(validateTitle('X')).toBe('X');
  });
});
```

---

### 4.2 Frontend (Flutter / Dart)
Modelo de dominio `Task` y deserialización segura de JSON con validación de tipos y campos obligatorios.

#### Implementación (`lib/task.dart`):
```dart
/// Converts a JSON object into a immutable task value.
class Task {
  /// Creates a task.
  const Task({required this.id, required this.title});

  /// Unique server identifier.
  final String id;

  /// User-visible task title.
  final String title;

  /// Parses a task from JSON.
  ///
  /// Throws [FormatException] when required fields are missing, invalid, or empty.
  factory Task.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];

    if (id is! String || id.trim().isEmpty) {
      throw const FormatException('Invalid or missing task ID.');
    }

    if (title is! String || title.trim().isEmpty) {
      throw const FormatException('Invalid or missing task title.');
    }

    return Task(id: id.trim(), title: title.trim());
  }
}
```

#### Ejercicio Práctico: Pruebas Unitarias de Dart (`test/task_test.dart`)
*Incluye la prueba requerida en el ejercicio: cuando el ID falta, es nulo, o no es cadena.*
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task.dart';

void main() {
  group('Task.fromJson Unit Tests', () {
    test('parses a valid task JSON with valid id and title', () {
      final json = {'id': 'task-uuid-101', 'title': 'Implementar JWT Refresh'};
      final task = Task.fromJson(json);

      expect(task.id, 'task-uuid-101');
      expect(task.title, 'Implementar JWT Refresh');
    });

    test('rejects a title with only whitespace', () {
      final json = {'id': 'task-102', 'title': '   '};
      expect(() => Task.fromJson(json), throwsA(isA<FormatException>()));
    });

    // EJERCICIO PRÁCTICO: Falta de ID o ID nulo
    test('rejects when ID is missing from JSON map', () {
      final jsonWithoutId = {'title': 'Comprar insumos de laboratorio'};
      expect(
        () => Task.fromJson(jsonWithoutId),
        throwsA(
          isA<FormatException>().having(
            (e) => e.message,
            'message',
            contains('Invalid or missing task ID.'),
          ),
        ),
      );
    });

    test('rejects when ID is null', () {
      final jsonWithNullId = {'id': null, 'title': 'Hacer backup'};
      expect(() => Task.fromJson(jsonWithNullId), throwsA(isA<FormatException>()));
    });

    test('rejects when ID is an empty string or whitespace', () {
      final jsonEmptyId = {'id': '   ', 'title': 'Verificar servidor'};
      expect(() => Task.fromJson(jsonEmptyId), throwsA(isA<FormatException>()));
    });

    test('rejects when ID is an invalid type (integer)', () {
      final jsonIntegerId = {'id': 9999, 'title': 'Verificar servidor'};
      expect(() => Task.fromJson(jsonIntegerId), throwsA(isA<FormatException>()));
    });
  });
}
```

---

## 5. Pruebas de Widgets Flutter

### 5.1 Widget con Soporte de Reintento (`lib/task_list_panel.dart`)
Se agregó la propiedad `onRetry` para permitir la recuperación ante fallos de conexión.

```dart
import 'package:flutter/material.dart';

/// Muestra la lista de tareas o los estados de carga, vacío y error.
class TaskListPanel extends StatelessWidget {
  const TaskListPanel({
    super.key,
    required this.loading,
    required this.tasks,
    this.errorMessage,
    this.onRetry,
  });

  final bool loading;
  final List<String> tasks;
  final String? errorMessage;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Colors.black87),
              ),
              const SizedBox(height: 16),
              if (onRetry != null)
                ElevatedButton.icon(
                  key: const Key('retry-button'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar'),
                ),
            ],
          ),
        ),
      );
    }

    if (tasks.isEmpty) {
      return const Center(
        child: Text(
          'No tasks yet.',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        return ListTile(
          leading: const Icon(Icons.check_box_outline_blank),
          title: Text(tasks[index]),
        );
      },
    );
  }
}
```

### 5.2 Ejercicio Práctico: Suite de Pruebas de Widgets (`test/task_list_panel_test.dart`)
*Verifica loading, empty, data y el nuevo botón de retry con verificación de callback único:*

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task_list_panel.dart';

void main() {
  group('TaskListPanel Widget Tests', () {
    testWidgets('renderiza estado de carga correctamente', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: true, tasks: []),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('No tasks yet.'), findsNothing);
    });

    testWidgets('renderiza estado vacío cuando no hay tareas', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: false, tasks: []),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('No tasks yet.'), findsOneWidget);
    });

    testWidgets('renderiza lista de tareas cuando hay datos presentes', (tester) async {
      final sampleTasks = ['Estudiar Jest', 'Configurar PostgreSQL', 'Diseñar UI Flutter'];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListPanel(loading: false, tasks: sampleTasks),
          ),
        ),
      );

      expect(find.text('Estudiar Jest'), findsOneWidget);
      expect(find.text('Configurar PostgreSQL'), findsOneWidget);
      expect(find.text('Diseñar UI Flutter'), findsOneWidget);
    });

    // EJERCICIO PRÁCTICO: Estado de error con botón de reintento invocado exactamente 1 vez
    testWidgets('muestra mensaje de error, botón de reintento y ejecuta callback exactamente una vez al tocarlo', (tester) async {
      int retryCount = 0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListPanel(
              loading: false,
              tasks: const [],
              errorMessage: 'Error de conexión con el servidor.',
              onRetry: () {
                retryCount++;
              },
            ),
          ),
        ),
      );

      // Verificaciones en pantalla
      expect(find.text('Error de conexión con el servidor.'), findsOneWidget);
      expect(find.byKey(const Key('retry-button')), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);

      // El callback aún no debe haber sido llamado
      expect(retryCount, 0);

      // Disparar toque en el botón
      await tester.tap(find.byKey(const Key('retry-button')));
      await tester.pump();

      // Verificar que se invocó exactamente una vez
      expect(retryCount, 1);
    });
  });
}
```

---

## 6. Pruebas de API y Backend Integrado

### 6.1 Configuración de Pruebas de Integración con Supertest
Se prueba la interacción real entre rutas Express, middleware de autenticación JWT y persistencia en base de datos PostgreSQL de pruebas aislada.

### 6.2 Ejercicio Práctico: Suite de Integración (`test/tasks_api.test.js`)
*Cubre: ID inválido, título faltante, rechazo de no autenticado y prevención de IDOR (actualizar tarea ajena).*

```javascript
'use strict';

const request = require('supertest');
const { app } = require('../src/app');
const { pool } = require('../src/db');
const { createTestUser, getValidTokenForUser, cleanTestDatabase } = require('./helpers/testHelpers');

describe('Task API Integration & Security Tests', () => {
  let userAlphaToken;
  let userBetaToken;
  let userAlphaId;
  let userBetaId;

  beforeAll(async () => {
    await cleanTestDatabase();
    
    // Crear dos usuarios sintéticos distintos en la DB de pruebas
    const userA = await createTestUser('alpha@utng.test', 'PassAlpha123!');
    const userB = await createTestUser('beta@utng.test', 'PassBeta123!');
    userAlphaId = userA.id;
    userBetaId = userB.id;

    userAlphaToken = getValidTokenForUser(userAlphaId, 'alpha@utng.test');
    userBetaToken = getValidTokenForUser(userBetaId, 'beta@utng.test');
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await pool.end();
  });

  test('Rechaza solicitud POST /api/v1/tasks sin cabecera de autenticación (401)', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Crear sin login' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'UNAUTHORIZED');
  });

  // EJERCICIO PRÁCTICO: Título faltante en la carga útil (missing title)
  test('Rechaza creación de tarea cuando el campo title no está presente en el body (400)', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ description: 'Falta el título obligatorio' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/valid title/i);
  });

  // EJERCICIO PRÁCTICO: ID de tarea inválido o malformado
  test('Rechaza solicitud GET /api/v1/tasks/:id cuando el ID no es un UUID válido (400)', async () => {
    const response = await request(app)
      .get('/api/v1/tasks/id-no-valido-123')
      .set('Authorization', `Bearer ${userAlphaToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'INVALID_IDENTIFIER_FORMAT');
  });

  // EJERCICIO PRÁCTICO: Intentar actualizar la tarea de otro usuario (BOLA / IDOR)
  test('Impide que el Usuario Beta actualice una tarea que pertenece al Usuario Alpha (403 o 404)', async () => {
    // 1. Usuario Alpha crea una tarea privada
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ title: 'Plan Estratégico Secreto de Alpha' });
    
    expect(createRes.status).toBe(201);
    const alphaTaskId = createRes.body.id;

    // 2. Usuario Beta intenta modificar la tarea de Alpha
    const maliciousUpdateRes = await request(app)
      .put(`/api/v1/tasks/${alphaTaskId}`)
      .set('Authorization', `Bearer ${userBetaToken}`)
      .send({ title: 'Modificado por intruso Beta' });

    // La política de seguridad debe responder 403 Forbidden o 404 Not Found (para no filtrar existencia)
    expect([403, 404]).toContain(maliciousUpdateRes.status);

    // 3. Verificar en DB que el título original NO fue alterado
    const checkRes = await request(app)
      .get(`/api/v1/tasks/${alphaTaskId}`)
      .set('Authorization', `Bearer ${userAlphaToken}`);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.title).toBe('Plan Estratégico Secreto de Alpha');
  });
});
```

---

## 7. Pruebas de Flujos Completos (End-to-End)

### 7.1 Arquitectura de Prueba E2E en Flutter (`integration_test`)
El paquete oficial `integration_test` compila la app real en un dispositivo físico o emulador y ejecuta acciones automatizadas interactuando con la API y la UI en tiempo real.

### 7.2 Ejercicio Práctico: Flujo Completo Extendido (`integration_test/app_journey_test.dart`)
*Secuencia requerida: Iniciar sesión -> Crear tarea -> Marcarla como completada -> Cerrar sesión (Logout) -> Verificar retorno a pantalla de login.*

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Flujo E2E Crítico: Login -> Crear Tarea -> Completar -> Logout', (tester) async {
    // 1. Inicializar la app
    app.main();
    await tester.pumpAndSettle();

    // 2. Verificar que estamos en la pantalla de Login
    expect(find.byKey(const Key('login-screen-title')), findsOneWidget);

    // 3. Ingresar credenciales del usuario de pruebas sintético
    await tester.enterText(find.byKey(const Key('email-field')), 'qa_journey@utng.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'IntegrationPass#2026');
    await tester.tap(find.byKey(const Key('login-button')));
    
    // Esperar navegación y carga de dashboard
    await tester.pumpAndSettle(const Duration(seconds: 3));
    expect(find.byKey(const Key('tasks-dashboard')), findsOneWidget);

    // 4. Crear nueva tarea
    await tester.tap(find.byKey(const Key('add-task-fab')));
    await tester.pumpAndSettle();

    final taskTitle = 'Auditar contratos inteligentes de release';
    await tester.enterText(find.byKey(const Key('task-title-field')), taskTitle);
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    // Confirmar que aparece en la lista
    expect(find.text(taskTitle), findsOneWidget);

    // 5. EJERCICIO: Marcar la tarea como completada
    final taskCheckboxFinder = find.byKey(Key('task-checkbox-$taskTitle'));
    await tester.tap(taskCheckboxFinder);
    await tester.pumpAndSettle();

    // Verificar indicador visual de completado
    final completedIconFinder = find.byKey(Key('task-completed-icon-$taskTitle'));
    expect(completedIconFinder, findsOneWidget);

    // 6. EJERCICIO: Ejecutar Logout (Cerrar Sesión)
    await tester.tap(find.byKey(const Key('user-profile-menu-button')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('logout-button')));
    await tester.pumpAndSettle();

    // 7. EJERCICIO: Verificar que se redirige a la pantalla de Login y se borró la sesión
    expect(find.byKey(const Key('login-screen-title')), findsOneWidget);
    expect(find.byKey(const Key('email-field')), findsOneWidget);
    expect(find.text('qa_journey@utng.test'), findsNothing); // Campos limpios
  });
}
```

---

## 8. Particiones de Equivalencia y Valores Límite

### 8.1 Concepto
* **Partición de Equivalencia (EP):** Divide las entradas posibles en grupos que el sistema trata de manera idéntica. Se prueba un valor representativo por clase.
* **Análisis de Valores Límite (BVA):** Se enfoca en las fronteras de cambio de comportamiento (en el borde exacto, uno antes y uno después).

### 8.2 Ejercicio Práctico: Matriz Exhaustiva para el Campo de Contraseña (`password`)
**Regla de Negocio del Sistema:**  
* Longitud mínima: **8 caracteres**.
* Longitud máxima: **64 caracteres**.
* Complejidad: Al menos 1 letra mayúscula, 1 número y 1 símbolo especial (`!@#$%^&*`).

| Partición / Límite BVA | Entrada de Prueba Representativa | Longitud | Resultado Esperado | Justificación Técnica |
| :--- | :--- | :---: | :---: | :--- |
| **P1: Vacío (Empty)** | `""` | 0 | **Rechazar (400)** | Campo mandatorio no provisto. |
| **P2: Solo espacios** | `"        "` | 8 | **Rechazar (400)** | Espacios no califican como contraseña válida. |
| **P3: Límite inferior - 1** | `"Ab1!xyz"` | 7 | **Rechazar (400)** | Longitud insuficiente (justo debajo del límite). |
| **P4: Límite inferior exacto** | `"Ab1!xyza"` | 8 | **Aceptar (200/201)** | Longitud mínima cumplida con complejidad. |
| **P5: Límite inferior + 1** | `"Ab1!xyzab"` | 9 | **Aceptar (200/201)** | Caso nominal en zona válida. |
| **P6: Valor típico nominal** | `"Segura_2026#Task"` | 17 | **Aceptar (200/201)** | Caso común de usuario estándar. |
| **P7: Límite superior - 1** | `"A1!" + "x"*60` | 63 | **Aceptar (200/201)** | En la frontera alta admisible. |
| **P8: Límite superior exacto**| `"A1!" + "x"*61` | 64 | **Aceptar (200/201)** | Longitud máxima permitida. |
| **P9: Límite superior + 1** | `"A1!" + "x"*62` | 65 | **Rechazar (400)** | Exceso de longitud (previene DoS en bcrypt). |
| **P10: Sin Mayúsculas** | `"pass1234#!"` | 10 | **Rechazar (400)** | Incumple regla de mayúscula obligatoria. |
| **P11: Sin Números** | `"Password#!"` | 11 | **Rechazar (400)** | Incumple regla de dígito obligatorio. |
| **P12: Sin Carácter Especial**| `"Password2026"` | 12 | **Rechazar (400)** | Incumple regla de símbolo especial. |
| **P13: Tipo de dato inválido** | `password: 12345678` | N/A | **Rechazar (400)** | JSON con tipo numérico en vez de String. |

---

## 9. Pruebas Negativas y Seguridad Básica

### 9.1 Matriz OWASP API Security Top 10 aplicada al Task Manager
| Vulnerabilidad OWASP | Riesgo en Task Manager | Medida Preventiva y Prueba Automatizada |
| :--- | :--- | :--- |
| **API1: BOLA (Broken Object Level Authorization)** | Un usuario consulta o modifica tareas de otro cambiando el `taskId`. | Middleware valida: `SELECT * FROM tasks WHERE id = $1 AND owner_id = $authUserId`. |
| **API2: Broken Authentication** | Tokens expirados aceptados, falta de rotación de refresh tokens. | Pruebas de expiración con tokens expirados intencionalmente y detección de reuso. |
| **API3: Broken Object Property Authorization** | El cliente envía `ownerId` o `role: "admin"` en el POST/PUT. | Filtrado estricto (whitelist) de campos permitidos; ignorar `ownerId` del body. |
| **API4: Unrestricted Resource Consumption** | Peticiones gigantes o spam masivo tiran la API y la DB. | Rate limiting (`express-rate-limit`) y límite estricto de body (`express.json({ limit: '10kb' })`). |
| **API5: Broken Function Level Authorization** | Usuario normal llama a `/api/v1/admin/users`. | Middleware de roles verifica privilegios antes de despachar controlador. |

### 9.2 Ejercicio Práctico: Prueba Automatizada contra Inyección de Propiedad (`ownerId`)
*Verifica que al enviar un `ownerId` arbitrario en el body de actualización o creación, la API lo rechaza o lo ignora completamente:*

```javascript
'use strict';

const request = require('supertest');
const { app } = require('../src/app');
const { createTestUser, getValidTokenForUser } = require('./helpers/testHelpers');

describe('Seguridad API: Prevención de Broken Object Property Level Authorization (Mass Assignment)', () => {
  test('La API ignora cualquier ownerId enviado en el body y preserva la titularidad del usuario autenticado', async () => {
    // 1. Crear usuario víctima (Owner legítimo) y usuario atacante
    const victim = await createTestUser('victima@utng.test', 'VictimPass123!');
    const attacker = await createTestUser('atacante@utng.test', 'AttackerPass123!');
    
    const attackerToken = getValidTokenForUser(attacker.id, 'atacante@utng.test');

    // 2. El atacante intenta crear una tarea forzando el ownerId de la víctima
    const maliciousPost = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({
        title: 'Tarea con intento de suplantación',
        ownerId: victim.id // Intento de inyección de propiedad privilegiada
      });

    expect(maliciousPost.status).toBe(201);
    
    // Verificación crítica: La tarea debe haber sido asignada al ATACANTE, no a la víctima
    expect(maliciousPost.body.ownerId).toBe(attacker.id);
    expect(maliciousPost.body.ownerId).not.toBe(victim.id);

    // 3. El atacante intenta actualizar su tarea para transferírsela a la víctima
    const taskId = maliciousPost.body.id;
    const maliciousPut = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({
        title: 'Título actualizado',
        ownerId: victim.id
      });

    expect([200, 400]).toContain(maliciousPut.status);

    // Verificar en consulta que el owner sigue siendo el atacante inmutable
    const verifyRes = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${attackerToken}`);

    expect(verifyRes.body.ownerId).toBe(attacker.id);
  });
});
```

---

## 10. Pruebas de Rendimiento y Carga con k6

### 10.1 Script de Carga k6 (`k6/health_and_tasks_load.js`)
Configurado para ejecutar pruebas controladas en entorno local con 5 Virtual Users (VUs) durante 30 segundos.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // Umbral 1: Menos del 1% de errores en solicitudes
    http_req_failed: ['rate<0.01'],
    // Umbral 2: El 95% de las solicitudes deben responder en menos de 200 ms (ajustado de 500ms)
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  const url = `${__ENV.BASE_URL || 'http://localhost:3000'}/health`;
  const response = http.get(url);

  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'database connection status healthy': (r) => r.json().database === 'connected',
  });

  sleep(1);
}
```

### 10.2 Ejercicio Práctico: Ejecución Local y Análisis de Reporte
*Comando ejecutado:*
```bash
BASE_URL=http://localhost:3000 k6 run k6/health_and_tasks_load.js
```

#### Resultado Simulado del Reporte de k6:
```
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   /_   
   /          \   |  |\  \ |      |  
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: k6/health_and_tasks_load.js
     output: -

     scenarios: (100.00%) 1 scenario, 5 max VUs, 1m0s max duration (incl. graceful stop):
              * default: 5 looping VUs for 30s (gracefulStop: 30s)

running (30.0s), 0/5 VUs, 150 complete and 0 interrupted iterations
default ✓ [======================================] 5 VUs  30s

     ✓ health check status is 200
     ✓ database connection status healthy

     checks.........................: 100.00% ✓ 300       ✗ 0  
     data_received..................: 42 kB   1.4 kB/s
     data_sent......................: 13 kB   430 B/s
     http_req_blocked...............: avg=82.1µs  min=2.1µs  med=4.8µs   max=1.2ms   p(90)=22.3µs p(95)=45.1µs
     http_req_connecting............: avg=41.2µs  min=0s     med=0s      max=680µs   p(90)=12.1µs p(95)=21.3µs
   ✓ http_req_duration..............: avg=18.42ms min=4.12ms med=12.31ms max=182.4ms p(90)=42.1ms  p(95)=88.5ms
       { expected_response:true }...: avg=18.42ms min=4.12ms med=12.31ms max=182.4ms p(90)=42.1ms  p(95)=88.5ms
   ✓ http_req_failed................: 0.00%   ✓ 0         ✗ 150
     http_req_receiving.............: avg=112.4µs min=21µs   med=75µs    max=1.1ms   p(90)=190µs  p(95)=280µs
     http_req_sending...............: avg=45.1µs  min=10µs   med=28µs    max=540µs   p(90)=78µs   p(95)=120µs
     http_req_tls_handshaking.......: avg=0s      min=0s     med=0s      max=0s      p(90)=0s     p(95)=0s
     http_req_waiting...............: avg=18.26ms min=4.08ms med=12.21ms max=181.8ms p(90)=41.8ms  p(95)=88.1ms
     http_reqs......................: 150     4.98/s
     iteration_duration.............: avg=1.01s   min=1.00s  med=1.01s   max=1.18s   p(90)=1.04s  p(95)=1.08s
     iterations.....................: 150     4.98/s
     vus............................: 5       min=5       max=5
     vus_max........................: 5       min=5       max=5

ERRORES / THRESHOLDS:
✓ http_req_failed: rate<0.01 (0.00% fallos)
✓ http_req_duration: p(95)<200 (Percentil 95 fue de 88.5 ms, superando la meta)
```

#### Interpretación de las Métricas
1. **`http_req_duration (p95 = 88.5ms)`:** Significa que el 95% de todas las solicitudes enviadas fueron atendidas en menos de 88.5 milisegundos. Dado que el umbral estricto fue configurado en `p(95) < 200ms`, el sistema cumple holgadamente con los requerimientos de latencia.
2. **`http_req_failed (0.00%)`:** Ninguna solicitud arrojó códigos de error (4xx o 5xx). El servicio `/health` demostró 100% de confiabilidad bajo una carga sostenida de 5 usuarios recurrentes.
3. **`Throughput (4.98 reqs/s)`:** Con un `sleep(1)` entre iteraciones y 5 VUs, el rendimiento promedio se situó en aproximadamente 5 peticiones por segundo sin saturación de CPU o memoria.

---

## 11. Usabilidad y Accesibilidad

### 11.1 Lista de Verificación de Accesibilidad (WCAG 2.1 AA en Móvil)
* [x] **Relación de contraste de texto:** Mínimo de 4.5:1 para texto normal y 3:1 para texto grande.
* [x] **Áreas táctiles (Touch Targets):** Tamaño mínimo de 48x48 dp para todos los botones interactivos e iconos.
* [x] **Semántica y Etiquetas:** `Semantics` en Flutter con `label` y `hint` para lectores de pantalla.
* [x] **Escalabilidad de texto:** La interfaz responde a `MediaQuery.textScalerOf(context)` sin desbordamiento.

### 11.2 Ejercicio Práctico: Simulación con Lector de Pantalla y Texto al 150%
Se habilitó TalkBack / VoiceOver simulado y se elevó la escala tipográfica al 150%.

#### Hallazgos y Defectos Detectados
1. **Desbordamiento de RenderFlex en Tarjeta de Tarea:**  
   * *Problema:* Al crecer la fuente a 1.5x, el `Row` que contenía el checkbox, el título y la fecha generó un error `RenderFlex overflowed by 32 pixels on the right`.
   * *Corrección:* Envolver el `Text(title)` dentro de un widget `Expanded` y especificar `maxLines: 2` con `overflow: TextOverflow.ellipsis`.
2. **Botón Flotante sin etiqueta accesible:**  
   * *Problema:* El lector de pantalla anunció: *"Botón sin etiquetar"*.
   * *Corrección:* Agregar propiedad `tooltip: 'Crear nueva tarea'` al `FloatingActionButton` o envolverlo en `Semantics(label: 'Crear nueva tarea', button: true, child: ...)`.
3. **Mensaje de Validación de Error Indiscernible:**  
   * *Problema:* El mensaje de error solo se comunicaba mediante un borde rojo en el input, impidiendo que usuarios con daltonismo supieran cuál era el error.
   * *Corrección:* Añadir un texto explícito debajo del campo: `Text('El título es requerido', style: TextStyle(color: Colors.red))` y anunciarlo con `SemanticsService.announce`.

---

## 12. Compatibilidad de Dispositivos y Plataformas

### 12.1 Matriz de Compatibilidad Estratégica
| Plataforma | Perfil del Dispositivo | Rango de SO | Enfoque de Pruebas |
| :--- | :--- | :--- | :--- |
| **Android** | Pantalla reducida (4.7" - 720x1280) | Android 8.0 (API 26) - Mínimo | Renderizado compacto, teclado virtual cubriendo inputs, rendimiento en RAM de 2GB. |
| **Android** | Dispositivo moderno (6.7" - 1080x2400) | Android 14 / 15 - Actual | Navegación gestual, tema oscuro, Refresh tokens en `flutter_secure_storage`. |
| **iOS** | Pantalla pequeña (iPhone SE 3ra Gen) | iOS 16 - Mínimo soportado | Safe Area en Notch/Home button, scroll en modal bottom sheets. |
| **iOS** | Dispositivo insignia (iPhone 15 Pro) | iOS 17 / 18 - Actual | Dynamic Island, renderizado a 120Hz, compatibilidad con Keychain. |

### 12.2 Ejercicio Práctico: Pruebas de Pantalla Reducida vs Pantalla Estándar
* **Comportamiento en Pantalla Reducida (320x568 dp):**  
  Al abrir el teclado en pantalla para escribir el título, el botón de "Guardar" quedaba oculto detrás del teclado, disparando un overflow de píxeles inferiores.  
  *Solución:* Envolver el cuerpo del formulario dentro de `SingleChildScrollView(padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom))`.
* **Comportamiento en Pantalla Grande (Tablet / Desktop):**  
  Los diálogos se estiraban de forma desproporcionada a lo ancho de la pantalla ocupando 1200 píxeles.  
  *Solución:* Restringir el ancho con `ConstrainedBox(constraints: BoxConstraints(maxWidth: 500))`.

---

## 13. Smoke Tests, Regresión y Gestión de Datos

### 13.1 Estrategia de Aislamiento de Datos de Prueba
* **Base de Datos Dedicada:** Base de datos `taskmanager_test` separada de desarrollo y producción.
* **Semillas (Seeds/Fixtures):** Scripts SQL reproducibles que restauran el estado antes de cada bloque de prueba.
* **Credenciales Sintéticas:** Usuarios con formato `test+user_{timestamp}@utng.test`. Cero datos personales reales.

### 13.2 Ejercicio Práctico: Lista de Verificación (Checklist) de Regresión

```markdown
### CHECKLIST DE REGRESIÓN OBLIGATORIA (PRE-RELEASE)

#### Módulo 1: Creación de Tareas
- [ ] TC-REG-01: Crear tarea con título alfanumérico válido (persistencia y estado 201).
- [ ] TC-REG-02: Rechazar creación con título vacío o de solo espacios (error 400).
- [ ] TC-REG-03: Rechazar creación con título de 121 caracteres (límite superior excedido).
- [ ] TC-REG-04: Verificar que una tarea creada pertenece exclusivamente al usuario logueado.

#### Módulo 2: Edición de Tareas
- [ ] TC-REG-05: Modificar título de una tarea existente perteneciente al usuario.
- [ ] TC-REG-06: Validar que no se puede editar una tarea dejando el título en blanco.
- [ ] TC-REG-07: Cancelar edición y confirmar que el título original no cambia.

#### Módulo 3: Completado y Desmarcado
- [ ] TC-REG-08: Marcar tarea como completada (actualiza `isCompleted: true` en API y UI).
- [ ] TC-REG-09: Desmarcar tarea completada regresándola a estado pendiente.
- [ ] TC-REG-10: Confirmar que la tarea no desaparece de la vista "Todas las tareas".

#### Módulo 4: Eliminación de Tareas
- [ ] TC-REG-11: Eliminar una tarea propia confirmando el diálogo de alerta.
- [ ] TC-REG-12: Cancelar el diálogo de eliminación y constatar permanencia de la tarea.
- [ ] TC-REG-13: Verificar que la tarea eliminada ya no aparece en peticiones `GET`.

#### Módulo 5: Control de Acceso y Aislamiento entre Usuarios (IDOR / BOLA)
- [ ] TC-REG-14: Usuario B no puede consultar la tarea del Usuario A vía `GET /api/v1/tasks/:id` (404/403).
- [ ] TC-REG-15: Usuario B no puede modificar la tarea del Usuario A vía `PUT /api/v1/tasks/:id` (404/403).
- [ ] TC-REG-16: Usuario B no puede borrar la tarea del Usuario A vía `DELETE /api/v1/tasks/:id` (404/403).
- [ ] TC-REG-17: Cerrar sesión revoca el access token y limpia el almacenamiento seguro local.
```

---

## 14. Automatización en CI y Cobertura

### 14.1 Pipeline de Integración Continua (`.github/workflows/ci.yml`)
```yaml
name: Test Suite CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    name: Backend Unit & Integration Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: taskmanager_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout Código
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Instalar Dependencias
        run: npm ci

      - name: Ejecutar Pruebas con Cobertura
        env:
          DATABASE_URL: postgres://test_user:test_password@localhost:5432/taskmanager_test
          JWT_SECRET: super_ci_secret_key_12345
        run: npm test -- --coverage

  flutter-tests:
    name: Flutter Unit & Widget Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - name: Checkout Código
        uses: actions/checkout@v4

      - name: Instalar Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Configurar Flutter
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true

      - name: Instalar Dependencias de Flutter
        run: flutter pub get

      - name: Ejecutar Pruebas de Widgets y Unitarias
        run: flutter test --coverage
```

### 14.2 Ejercicio Práctico: Romper Intencionalmente una Prueba en CI
1. **Modificación inducida en `validation.js`:**  
   Se modificó temporalmente la condición:
   ```javascript
   // Código roto intencionalmente para prueba de fallo en CI:
   if (title.length < 5) { // Se cambió de 1 a 5
     throw new TypeError('Enter a valid title.');
   }
   ```
2. **Resultado en el pipeline de GitHub Actions:**  
   El trabajo `backend-tests` falló de inmediato al ejecutar `test('accepts a title of minimum valid length (1 character)')`:
   ```
   FAIL test/validation.test.js
     ● validateTitle › accepts a title of minimum valid length (1 character)
       TypeError: Enter a valid title.
         at validateTitle (src/tasks/validation.js:15:11)
         at Object.<anonymous> (test/validation.test.js:35:12)
   ```
   El pull request se bloqueó automáticamente con estado rojo impidiendo la mezcla (*merge*) hacia `main`.
3. **Restauración:** Se revirtió el cambio a `title.length < 1`, ejecutando `git push` y logrando el estado verde exitoso.

> **Reflexión sobre Cobertura:** Un reporte del 98% de cobertura indica qué líneas de código se ejecutaron durante la suite, pero **no garantiza** que se hayan evaluado las reglas de negocio correctas ni que los controles de acceso a nivel de usuario (BOLA/IDOR) sean inviolables.

---

## 15. Mocks Cuidadosos y Pruebas Inestables (Flaky Tests)

### 15.1 Ejercicio Práctico: Comparativa entre Mock de Cliente API vs Integración con DB Real

| Criterio de Comparación | Prueba Unitaria con Mock (Cliente API Simulado) | Prueba de Integración Real (Supertest + PostgreSQL en Contenedor) |
| :--- | :--- | :--- |
| **¿Qué evalúa eficazmente?** | Lógica de presentación en Flutter, deserialización de JSON, manejo de spinners de carga, estados de error 400/500 y renderizado reactivo. | Restricciones de llaves foráneas en SQL, transacciones atómicas, middlewares de autenticación JWT reales, consultas SQL complejas y aislamiento entre usuarios (BOLA). |
| **¿Qué NO puede detectar?** | Si la base de datos rechaza tipos de datos reales, errores de sintaxis en consultas SQL, desconexiones de red, lentitud de índices o cambios no retrocompatibles en el schema. | Detalles minuciosos de animaciones de UI o renderizado en píxeles de dispositivos móviles específicos. |
| **Velocidad de ejecución** | Milisegundos (< 50 ms por prueba). | Decenas a cientos de milisegundos (100 - 800 ms por prueba). |
| **Costo de mantenimiento** | Requiere actualizar los mocks manualmente cada vez que el contrato o DTO del API cambia. | Requiere configurar fixtures, migraciones de base de datos y scripts de limpieza de tablas. |
| **Riesgo de falso positivo** | Alto si el mock simula un comportamiento que el backend real ya no tiene. | Muy bajo; si falla en la DB real de test, fallará en producción. |

### 15.2 Estrategias para Eliminar Pruebas Inestables (Flaky Tests)
1. **Evitar esperas fijas (`sleep(2000)`):** Utilizar `pumpAndSettle()` en Flutter con timeout explícito o `waitFor()` condicional en JavaScript.
2. **Controlar el reloj del sistema:** Utilizar simuladores de tiempo (`jest.useFakeTimers()` o librerías de clock freeze) para evitar fallos por cambio de huso horario o fechas de expiración de tokens.
3. **Aislamiento transaccional:** Envolver cada prueba de integración en una transacción de base de datos y ejecutar un `ROLLBACK` al finalizar (`afterEach`), evitando que datos residuales contaminen la prueba subsecuente.

---

## 16. Plan de Pruebas Maestro (Master Test Plan)

| Campo | Especificación del Proyecto |
| :--- | :--- |
| **Funcionalidad / Release** | Task Manager Full-Stack v1.0.0 (MVP) |
| **Alcance Incluido** | Autenticación JWT con refresh tokens, CRUD de tareas personales, validación de entrada en frontend y backend, aislamiento estricto de tareas por usuario. |
| **Alcance Excluido** | Pagos en línea, notificaciones Push remotas (FCM), modo colaborativo entre múltiples usuarios (equipos/organizaciones). |
| **Riesgos Principales** | 1. Vulnerabilidad BOLA/IDOR permitiendo lectura/modificación de tareas ajenas.<br>2. Pérdida de sesión o tokens expuestos en almacenamiento inseguro.<br>3. Inyección SQL o cross-site scripting vía títulos maliciosos. |
| **Ambiente de Pruebas** | • Base de datos: PostgreSQL 16 ejecutándose en Docker local / GitHub Actions Service.<br>• Backend: Node.js 22 LTS con Express.<br>• Mobile: Emuladores Android (API 26 y API 34), simulador iOS (iPhone 15). |
| **Datos de Prueba** | Cuentas sintéticas (`user_alpha@utng.test`, `user_beta@utng.test`), contraseñas predefinidas para pruebas, bases de datos limpiadas con fixtures automáticos. |
| **Tipos de Pruebas** | Unitarias (Jest y flutter_test), Widgets (Flutter), Integración de API (Supertest), E2E (Flutter integration_test), Carga básica (k6), Accesibilidad (TalkBack). |
| **Criterios de Entrada** | Código compilable sin advertencias severas, migraciones de base de datos ejecutadas en ambiente test, suite de pruebas unitarias locales en verde. |
| **Criterios de Salida** | 100% de pruebas de integración y seguridad aprobadas, 0 defectos de severidad Crítica o Alta abiertos, checklist de regresión completado al 100%. |
| **Responsables** | • QA Lead / Tester: Andy (Diseño, ejecución, automatización y reporte).<br>• Developer Backend: Implementación de rutas y middleware de seguridad.<br>• Developer Frontend: Implementación de UI accesible y cliente HTTP. |
| **Evidencias** | Repositorio de código con reportes de cobertura LCOV, bitácoras de pruebas exploratorias en Markdown, reportes de bugs en Jira/GitHub Issues y trazas de k6. |

---

## 17. Plan de Práctica de 4 Semanas

```mermaid
gantt
    title Cronograma de Pruebas Task Manager - 4 Semanas
    dateFormat  YYYY-MM-DD
    section Semana 1
    Mentalidad y Plan de Pruebas       :done, s1_1, 2026-11-01, 3d
    Casos de Prueba y Reporte de Bugs  :done, s1_2, after s1_1, 2d
    Sesión Exploratoria con Charter    :done, s1_3, after s1_2, 2d
    section Semana 2
    Pruebas Unitarias Backend (Jest)   :active, s2_1, 2026-11-08, 2d
    Pruebas Unitarias Flutter          :active, s2_2, after s2_1, 2d
    Pruebas de Widgets con Retry       :active, s2_3, after s2_2, 2d
    Pruebas de Integración y API       :active, s2_4, after s2_3, 2d
    section Semana 3
    Pruebas E2E de Flujo Completo      :s3_1, 2026-11-15, 2d
    Análisis BVA y Particiones         :s3_2, after s3_1, 2d
    Pruebas Negativas y OWASP API      :s3_3, after s3_2, 2d
    Accesibilidad y Usabilidad Móvil   :s3_4, after s3_3, 1d
    section Semana 4
    Pruebas de Carga Segura con k6     :s4_1, 2026-11-22, 2d
    Matriz de Compatibilidad Móvil     :s4_2, after s4_1, 2d
    Checklist de Regresión Completo    :s4_3, after s4_2, 1d
    Automatización en CI (Actions)     :s4_4, after s4_3, 2d
```

---

## Conclusiones
La implementación de una estrategia de pruebas estructurada y piramidal para la aplicación **Task Manager** demuestra que la calidad de software no es una fase final, sino una disciplina continua. Al combinar pruebas unitarias rápidas, pruebas de integración orientadas a la prevención de vulnerabilidades críticas como BOLA/IDOR, pruebas de widgets desacopladas y flujos E2E focalizados, se garantiza un producto robusto, accesible y seguro para los usuarios.
