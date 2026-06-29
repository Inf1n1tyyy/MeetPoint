# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Логин >> токен сохраняется в localStorage после входа
- Location: e2e\app.spec.ts:137:7

# Error details

```
Error: page.fill: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[type="email"]')

```

```
Error: browserContext.close: Target page, context or browser has been closed
```