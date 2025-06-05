import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

describe('cli generate', () => {
  test('generates expected files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specstack-'));
    const specPath = path.join(__dirname, 'petstore.yaml');
    const cliPath = path.join(__dirname, '..', 'cli', 'generate.ts');
    const cmd = 'npx';

    try {
      execFileSync(cmd, ['tsx', cliPath, specPath, tmpDir], { stdio: 'pipe' });

      const dbDir = path.join(tmpDir, 'db');
      const hooksDir = path.join(tmpDir, 'frontend', 'src', 'hooks');

      expect(fs.existsSync(path.join(dbDir, 'Pet_table.sql'))).toBe(true);
      expect(fs.existsSync(path.join(dbDir, 'getPetById_function.sql'))).toBe(true);
      expect(fs.existsSync(path.join(dbDir, 'createPet_function.sql'))).toBe(true);

      expect(fs.existsSync(path.join(hooksDir, 'useGetPetById.ts'))).toBe(true);
      expect(fs.existsSync(path.join(hooksDir, 'useCreatePet.ts'))).toBe(true);
      expect(fs.existsSync(path.join(hooksDir, 'index.ts'))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
