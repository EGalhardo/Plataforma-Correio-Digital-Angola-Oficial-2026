# 🎬 Guia de Teste: Sistema de Video Atendimento

## ✅ O que foi implementado/corrigido

### 1. **Correção do Serviço de Vídeo** (`videoSessionService.ts`)
- **Problema**: A tabela `video_sessions` tem colunas NOT NULL que não eram preenchidas
- **Solução**: Adicionado preenchimento de todas as colunas obrigatórias:
  - `reference_code` (ex: `VID-20260904-A109D3D2`)
  - `title`, `description`, `origin_type`, `origin_id`
  - `citizen_bi`, `citizen_name`, `institution_code`, `institution_name`
  - `created_by`, `scheduled_date`, `scheduled_time`
  - `duration_minutes`, `priority`, `meeting_provider`, `meeting_room`, `meeting_url`
  - `allow_reschedule`, `allow_recording_request`, `reminder_sent`

### 2. **Sistema de Emails Automáticos** (SQL no Supabase)

#### **Email de Boas-Vindas**
- **Trigger**: INSERT na tabela `profiles`
- **Quando**: Novo perfil criado com email válido
- **Excepções**: Contas `@inst.correiodigital.ao` e `system`
- **Template**: HTML profissional com logótipo e funcionalidades

#### **Email de Aprovação**
- **Trigger**: UPDATE na tabela `solicitacoes_registo` (status muda para "Aprovado")
- **Quando**: Admin aprova registo de instituição/cidadão
- **Excepções**: Contas `@inst.correiodigital.ao`
- **Template**: HTML com informações de acesso

### 3. **Configuração SMTP**
- **Provider**: Resend (grátis, 100 emails/dia)
- **Remetente**: `onboarding@resend.dev`
- **API Key**: Configurada no Supabase (Authentication → Emails → SMTP Settings)
- **Status**: ✅ Configurado e testado

---

## 🧪 Como Testar Manualmente

### **Passo 1: Login como Instituição**

1. Aceder: https://correio-digital-angola-oficial-2026.vercel.app/institucional#/login
2. Credenciais:
   - **Nº Agente**: `INAPEM-LLMM-01`
   - **Senha**: `123456789`

### **Passo 2: Criar Sessão de Vídeo**

1. Após login, navegar para **Correspondências** ou **Mensagens**
2. Selecionar uma mensagem/correspondência
3. Clicar em **Videoatendimento** (ícone de câmara)
4. Preencher:
   - **Assunto**: Ex: "Esclarecimento de dúvidas"
   - **Agendamento**: Ex: "Hoje às 14:30"
   - **Protocolo**: (opcional)
5. Clicar em **Agendar & Selar Canal por Vídeo**

### **Passo 3: Copiar Link da Sala**

1. Após criar a sessão, clicar em **Partilhar Detalhes**
2. Copiar o texto com as informações
3. O link Jitsi será: `https://meet.jit.si/cda-atendimento-XXXXX`

### **Passo 4: Login como Cidadão**

1. Aceder: https://correio-digital-angola-oficial-2026.vercel.app/#/login
2. Credenciais:
   - **B.I.**: `002399714LA030`
   - **Senha**: `123456789`

### **Passo 5: Cidadão Entra na Sessão**

1. Após login, navegar para **Correspondências** ou **Mensagens**
2. Selecionar a mesma mensagem correspondente
3. Ver a sessão de vídeo agendada
4. Clicar em **Entrar na Sala Oficial**
5. O Jitsi abrirá num iframe

### **Passo 6: Testar Videochamada**

1. **Instituição** clica em **Iniciar Videoatendimento**
2. **Cidadão** clica em **Entrar na Sala Oficial**
3. Ambos entram na mesma sala Jitsi
4. Testar câmara, microfone, chat
5. **Instituição** pode:
   - **Concluir Sessão** (termina e regista duração)
   - **Inviabilizar/Cancelar** (cancela a sessão)
   - **Tornar Ativo/Livre** (reabre para outros participantes)

---

## 📊 Sessão de Teste Criada

Uma sessão de teste já foi criada automaticamente:

- **Código**: `VID-20260904-C17889D8`
- **Assunto**: Teste Video Atendimento - 2 minutos
- **Sala**: `cda-atendimento-teste-657727`
- **URL Jitsi**: https://meet.jit.si/cda-atendimento-teste-657727
- **Status**: `em_curso`
- **Instituição**: INAPEM-LLMM-01
- **Cidadão**: 002399714LA030 (Edlasio Adjamiro Galhardo)

---

## 🔍 Como Verificar no Supabase

### **Ver Sessões Criadas**
1. Dashboard → Database → Tables → `video_sessions`
2. Filtrar por `guest_bi = 002399714LA030`
3. Ver colunas: `reference_code`, `citizen_bi`, `institution_code`, `meeting_url`, `status`

### **Ver Emails Enviados**
1. Dashboard → Authentication → Emails → Templates
2. Ou aceder: https://resend.com/emails
3. Ver emails enviados, estado (delivered/failed), métricas

### **Ver Triggers Activos**
1. Dashboard → Database → SQL Editor
2. Correr:
```sql
SELECT trigger_name, event_object_table, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trg_%';
```

---

## 🐛 Possíveis Problemas e Soluções

### **1. "Sessão não aparece para o cidadão"**
- **Causa**: RLS (Row Level Security) a bloquear
- **Solução**: Verificar se `citizen_bi` e `guest_bi` estão preenchidos correctamente
- **Verificar**: Dashboard → Database → `video_sessions` → ver valores

### **2. "Email não chega"**
- **Causa**: SMTP não configurado ou email vai para spam
- **Solução**: 
  - Verificar Spam/Promoções no Gmail
  - Verificar Resend Dashboard: https://resend.com/emails
  - Verificar Supabase → Authentication → Emails → SMTP Settings

### **3. "Jitsi não carrega"**
- **Causa**: Iframe bloqueado ou problemas de rede
- **Solução**: 
  - Abrir URL Jitsi directamente: https://meet.jit.si/ROOM_NAME
  - Verificar permissões de câmara/microfone no browser
  - Testar noutro browser (Chrome, Firefox, Edge)

### **4. "Login falha"**
- **Causa**: Conta não existe ou password incorrecta
- **Solução**:
  - Verificar Supabase Auth: Dashboard → Authentication → Users
  - Verificar se `user_metadata.bi` está preenchido
  - Testar password: `123456789`

---

## ✅ Checklist de Funcionalidades

- [x] Criação de sessão de vídeo (instituição)
- [x] Visualização de sessões (cidadão)
- [x] Entrada na sala Jitsi (ambos)
- [x] Partilha de link da sala
- [x] Actualização de status (disponível → em_curso → concluída)
- [x] Registo de eventos (entrada, saída, criada, encerrada)
- [x] Email de boas-vindas automático
- [x] Email de aprovação automático
- [x] Trigger de boas-vindas (INSERT em profiles)
- [x] Trigger de aprovação (UPDATE em solicitacoes_registo)
- [x] Configuração SMTP (Resend)
- [x] Preenchimento de colunas NOT NULL
- [ ] Teste manual completo (instituição + cidadão)
- [ ] Deploy para produção (Vercel)

---

## 📞 Suporte

Se houver problemas durante o teste:

1. **Verificar logs do Supabase**: Dashboard → Database → Logs
2. **Verificar logs do Resend**: https://resend.com/emails
3. **Verificar console do browser**: F12 → Console
4. **Verificar rede**: F12 → Network → filtrar por "video_sessions"

---

**Última actualização**: 2026-09-04 09:59 UTC
**Versão**: v1.0 (correção de colunas NOT NULL + emails automáticos)
