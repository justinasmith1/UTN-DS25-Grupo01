
// Esto es un Script de prueba rápida para verificar que la API responde correctamente
// Sino tengo que tirar 4 comandos curl a mano o usar postman y es muy lento

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const TOKEN = process.env.TOKEN ?? '';

if (!TOKEN) {
  console.error('Falta TOKEN. Ejecuta: TOKEN=<jwt> node scripts/smoke.mjs');
  process.exit(1);
}

const endpoints = ['lotes', 'inmobiliarias', 'reservas', 'ventas'];

const getCount = (json) => {
  if (Array.isArray(json)) return json.length;
  if (Array.isArray(json?.data)) return json.data.length;
  if (Array.isArray(json?.data?.items)) return json.data.items.length;
  return -1;
};

for (const ep of endpoints) {
  const res = await fetch(`${BASE}/${ep}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json().catch(() => ({}));
  const count = getCount(json);
  if (res.ok && count >= 0) console.log(`[OK] GET /${ep} -> ${count} ítems`);
  else console.error(`[ERROR] GET /${ep} -> status ${res.status}`, json);
}
