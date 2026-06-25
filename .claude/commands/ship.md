---
description: Commit pending work on a feature branch, push, and open a PR (respects main branch protection + CI gate)
argument-hint: '[descripción corta del cambio] [--merge]'
---

Envía el trabajo pendiente siguiendo el flujo PR + CI de este repo. `main` está
protegida (hay un hook que bloquea el push directo), así que NUNCA hagas commit
ni push directamente sobre `main`.

Argumentos recibidos: `$ARGUMENTS`

- Texto libre = pista para el título/resumen del commit y del PR.
- Flag `--merge` = tras abrir el PR, espera a que CI esté en verde y haz merge squash.

Pasos:

1. **Comprueba el estado.** `git status` y `git diff --stat`. Si no hay cambios sin
   commitear NI commits locales sin pushear, dilo y para — no hay nada que enviar.

2. **Asegura una rama de trabajo.** Mira la rama actual.
   - Si estás en `main`: crea una rama nueva con nombre descriptivo en kebab-case
     derivado del cambio (p. ej. `fix/ladder-overlap`, `feat/moving-platforms`).
     Usa el prefijo `feat/`, `fix/`, `chore/`, `docs/` o `refactor/` según el cambio.
   - Si ya estás en una rama de feature: sigue en ella.

3. **Commit.** `git add -A` y haz UN commit con mensaje en formato conventional
   commits (`tipo(scope): resumen` en inglés), basado en el diff real y en la pista
   de `$ARGUMENTS`. Termina el mensaje con el trailer:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

4. **Push.** Empuja la rama con upstream (`git push -u origin <rama>`).

5. **Abre el PR.** `gh pr create` con un título claro y un cuerpo que resuma qué
   cambia y por qué (bullets). Si ya existe un PR para esta rama, no crees otro:
   el push ya lo ha actualizado.

6. **Reporta.** Muestra la URL del PR y el estado de CI (`gh pr checks` o `gh run list`).

7. **Merge (solo si se pasó `--merge`).** Espera a que CI esté en verde, luego
   `gh pr merge --squash --delete-branch`, vuelve a `main` y haz `git pull`.
   Si CI falla, NO mergees: enseña el log del job que ha fallado y para.
   Si NO se pasó `--merge`: deja el PR abierto, di que CI está corriendo, y recuerda
   que para fusionar basta con `/ship --merge` o un "mergea cuando esté verde".

Sé conciso en el resumen final: rama, PR URL, estado de CI, y qué falta (si algo).
