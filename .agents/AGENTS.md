# Workspace Rules & Commit Conventions

## Git Commit Structure Policy
Always separate commits by component scope:
- `feat(backend): ...` or `fix(backend): ...` for Node.js backend & Prisma changes.
- `feat(frontend): ...` or `fix(frontend): ...` for React frontend UI changes.
- `feat(ml): ...` or `fix(ml): ...` for Python ML microservice changes.

Never combine frontend, backend, or ML changes into a single git commit.
