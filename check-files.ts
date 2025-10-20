import * as fs from 'fs';
import * as path from 'path';

const requiredFiles = [
  'src/app.ts',
  'src/server.ts',
  'src/config/env.ts',
  'src/config/database.ts',
  'src/routes/index.ts',
  'src/routes/task.routes.ts',
  'src/routes/auth.routes.ts',
  'src/utils/swagger.ts',
  'src/middleware/errorHandler.middleware.ts',
  '.env'
];

console.log('Checking required files...\n');

let allExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (!exists) {
    allExist = false;
  }
});

console.log('');

if (allExist) {
  console.log('✨ All required files exist!');
} else {
  console.log('❌ Some files are missing!');
  process.exit(1);
}