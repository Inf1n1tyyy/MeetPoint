# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Landing Page >> неавторизованный пользователь редиректится на /login при переходе на /meetings
- Location: e2e\app.spec.ts:63:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\kitte\AppData\Local\ms-playwright\firefox-1532\firefox\firefox.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```