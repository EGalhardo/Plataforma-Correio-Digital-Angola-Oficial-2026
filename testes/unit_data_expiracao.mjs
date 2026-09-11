/**
 * T44 — Testes unitários da Data de Expiração (compositor «Nova Mensagem»).
 * Uso: npx tsx testes/unit_data_expiracao.mjs
 */
import {
  hojeISO, dataISOParaLocal, formatarDataExpiracao, dataExpiracaoParaISO, validarDataExpiracao,
} from '../src/utils/dataExpiracao.ts';
import { validarEnvio } from '../src/services/validacaoEnvio.ts';

let ok = 0, total = 0;
const check = (nome, cond) => { total++; if (cond) ok++; else console.log('✘', nome); };

const agora = new Date(2026, 8, 11, 15, 0, 0); // 11/09/2026 local
check('hojeISO', hojeISO(agora) === '2026-09-11');
check('dataISOParaLocal válida', dataISOParaLocal('2026-09-30')?.getDate() === 30);
check('dataISOParaLocal rejeita 31 de Fevereiro', dataISOParaLocal('2026-02-31') === null);
check('dataISOParaLocal rejeita formato', dataISOParaLocal('30/09/2026') === null);
check('dataISOParaLocal vazio', dataISOParaLocal('') === null && dataISOParaLocal(undefined) === null);
check('formatar DD/MM/YYYY', formatarDataExpiracao('2026-09-30') === '30/09/2026');
check('formatar vazio', formatarDataExpiracao('') === '');
const iso = dataExpiracaoParaISO('2026-09-30');
const d = new Date(iso);
check('ISO fim do dia local', d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 30 && d.getHours() === 23 && d.getMinutes() === 59);
check('ISO vazio → null', dataExpiracaoParaISO('') === null);
check('validar vazio = ok (sem prazo)', validarDataExpiracao('', agora).ok === true);
check('validar hoje = ok', validarDataExpiracao('2026-09-11', agora).ok === true);
check('validar futuro = ok', validarDataExpiracao('2027-01-01', agora).ok === true);
check('validar ontem = erro', validarDataExpiracao('2026-09-10', agora).ok === false);
check('validar inválida = erro', /inválida/.test(validarDataExpiracao('2026-13-40', agora).erro));

const base = { to: 'AGT-9921-SR', subject: 'Teste', body: 'Peço resposta dentro do prazo estabelecido, por favor.' };
const semData = validarEnvio(base);
check('validarEnvio: aviso «prazo sem data» sem selector', semData.avisos.some((a) => /prazo/.test(a)));
const comData = validarEnvio({ ...base, dataExpiracao: '2099-01-01' });
check('validarEnvio: com Data de Expiração o aviso desaparece', !comData.avisos.some((a) => /fala de prazo/.test(a)));
check('validarEnvio: data passada bloqueia', validarEnvio({ ...base, dataExpiracao: '2000-01-01' }).bloqueios.some((b) => /anterior a hoje/.test(b)));
check('validarEnvio: sem data não bloqueia', semData.bloqueios.length === 0);

console.log(`=== RESULTADO: ${ok}/${total} verificações OK ===`);
process.exit(ok === total ? 0 : 1);
