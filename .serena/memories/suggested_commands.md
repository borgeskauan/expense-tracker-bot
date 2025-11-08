# Suggested Commands for Expense Tracker Bot

## Development
```bash
npm run dev          # Start development server with hot reload (nodemon + ts-node)
npm run build        # Compile TypeScript to dist/ directory
npm start            # Run compiled production build (dist/index.js)
```

## Database (Prisma)
```bash
npx prisma migrate dev --name <description>  # Create new migration
npx prisma migrate deploy                    # Apply migrations (production)
npx prisma generate                          # Regenerate Prisma client
npx prisma studio                            # Open Prisma Studio GUI
npx prisma db push                           # Push schema without migration (dev only)
```

## Testing & Debugging
```bash
# No test suite configured yet (npm test will fail)
# Manual testing via WhatsApp webhook: POST /whatsapp
curl -X POST http://localhost:3000/whatsapp -H "Content-Type: application/json" -d '{"remoteJid": "test@s.whatsapp.net", "text": "I spent $25 on coffee", "pushName": "Test User", "fromMe": false}'
```

## System Commands (Linux)
```bash
ls -la              # List files with details
cat <file>          # View file contents
grep -r "pattern" . # Search for pattern recursively
find . -name "*.ts" # Find TypeScript files
git status          # Check git status
git diff            # View changes
```

## Environment Setup
Requires `.env` file with:
- `DATABASE_URL="file:./dev.db"`
- `GEMINI_API_KEY="your-key"`
- `GEMINI_MODEL="gemini-2.0-flash"`
- `SYSTEM_INSTRUCTION="..."`
- `WHATSAPP_API_URL="http://localhost:3000"`
