// Скрипт для генерации bcrypt хеша для seed данных
// Запуск: node scripts/generate-seed-hash.js

import bcrypt from 'bcryptjs';

const password = 'password123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nПроверка:');
console.log('Match:', bcrypt.compareSync(password, hash));

