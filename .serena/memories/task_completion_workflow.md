# Task Completion Workflow

## After Making Code Changes

### 1. Database Schema Changes
If you modified `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name <descriptive_name>  # Creates migration and applies it
npx prisma generate                                 # Regenerates Prisma client
```

### 2. Build & Test
```bash
npm run build    # Compile TypeScript to ensure no compilation errors
npm run dev      # Start dev server and manually test the changes
```

### 3. Manual Testing (WhatsApp Webhook)
Test via POST request to `/whatsapp`:
```bash
curl -X POST http://localhost:3000/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "remoteJid": "test@s.whatsapp.net",
    "text": "Test message",
    "pushName": "Test User",
    "fromMe": false
  }'
```

### 4. Verify Changes
- Check terminal logs for console output
- Verify database changes with `npx prisma studio`
- Test function calling trace in response
- Ensure no TypeScript compilation errors

## No Automated Tests
Currently no test suite configured. All testing is manual via:
1. Direct API calls (curl/Postman)
2. WhatsApp integration testing
3. Prisma Studio for database verification

## Before Commit
- Ensure code compiles: `npm run build`
- Check for TypeScript errors in IDE
- Verify all new code follows ServiceResult pattern
- Document any new function declarations in AI system
