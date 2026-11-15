---
title: "Tutorial: Diseño de una base de conocimiento visual paso a paso"
description: "Estructura recomendada para modelar hechos iniciales, variables tipadas, condiciones relacionales y conclusiones en un entorno gráfico."
category: "Tutoriales"
publishedAt: "2026-10-28"
readingTime: "7 min de lectura"
---

Modelar un sistema experto de forma visual facilita la comunicación entre el dominio del problema y su implementación formal. A continuación se detalla una secuencia práctica para estructurar una base de conocimiento clara y mantenible.

## Paso 1: Definir variables y hechos iniciales

Antes de redactar reglas, identifique qué datos ingresará el usuario como hechos iniciales (por ejemplo, `experiencia`, `tamano_equipo`, `requisitos_cambiantes`) y defina su tipo de dato (`TEXTO`, `ENTERO`, `DECIMAL` o `BOOLEANO`). El tipado estricto previene comparaciones ambiguas.

## Paso 2: Construir condiciones relacionales precisas

Cada condición debe evaluar una variable o hecho con un operador coherente con su tipo (`=`, `!=`, `>`, `<`, `>=`, `<=`, `CONTIENE`). Evite usar operadores numéricos sobre valores booleanos o textuales.

## Paso 3: Conectar reglas y establecer prioridades

Agrupe las condiciones hacia el nodo de regla correspondiente, asigne una prioridad clara cuando existan reglas generales y específicas, y conecte el resultado hacia el nodo de conclusión.

## Paso 4: Validar y simular

Ejecute primero la validación estática para confirmar ausencia de ciclos o contradicciones y, posteriormente, recorra la simulación paso a paso para verificar que la traza deductiva coincida con el criterio académico esperado.
