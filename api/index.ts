import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

// Initialize AI Clients using the exact verified variables
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';

let groq: Groq | null = null;
if (groqApiKey) {
  try {
    groq = new Groq({ apiKey: groqApiKey.trim() });
  } catch (e: any) {
    console.error("CRITICAL: Failed to instantiate Groq client:", e.message || e);
  }
}

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      apiVersion: 'v1beta',
    });
  } catch (e) {
    console.warn("CRITICAL: Failed to instantiate GoogleGenAI client:", e);
  }
}

// CONHECIMENTO CORPORATIVO OFICIAL DO CORREIO DIGITAL ANGOLA
const OFFICIAL_KNOWLEDGE_CDA = `
CORREIO DIGITAL ANGOLA

VISÃO ESTRATÉGICA DO PROJECTO
O Correio Digital Angola representa uma das mais ambiciosas iniciativas de modernização administrativa e transformação digital já concebidas para o país. O projecto foi desenvolvido para criar uma nova infraestrutura nacional de comunicação oficial, capaz de aproximar o Estado dos cidadãos através de uma plataforma moderna, inteligente, segura e altamente acessível.
Mais do que uma aplicação móvel, o Correio Digital Angola propõe uma mudança estrutural na forma como o Estado comunica, presta serviços e gere a relação institucional com a população. A plataforma introduz um novo paradigma de governação digital, no qual o Número do Bilhete de Identidade deixa de ser apenas um documento físico de identificação e passa a funcionar como o principal endereço digital oficial do cidadão angolano.
O projecto surge num momento estratégico para Angola, alinhando-se com os objectivos nacionais de modernização administrativa, inclusão digital, simplificação de serviços públicos e fortalecimento da eficiência governamental. Num contexto global em que as nações mais competitivas investem fortemente em infraestruturas digitais inteligentes, o Correio Digital Angola posiciona-se como uma iniciativa capaz de colocar Angola entre os países africanos mais inovadores no domínio da governação electrónica.
A proposta responde directamente a desafios históricos enfrentados pelo país, como a ausência de endereços formais em várias regiões, a dificuldade de localização física de cidadãos, os elevados custos administrativos associados ao papel, a lentidão nos processos institucionais e as limitações da comunicação tradicional baseada exclusivamente em documentação física.
Ao criar uma plataforma nacional centralizada de correspondência digital, Angola poderá reduzir drasticamente a burocracia, aumentar a eficiência das instituições públicas e offercer aos cidadãos uma experiência moderna, rápida e segura no acesso aos serviços governamentais.
O Correio Digital Angola não representa apenas uma solução tecnológica. Representa uma transformação estrutural da relação entre o Estado e a população, promovendo maior inclusão, acessibilidade, transparência e eficiência administrativa.

O PROBLEMA ESTRUTURAL DE ANGOLA
Angola enfrenta desafios estruturais profundos relacionados com a comunicação oficial entre as instituições públicas e os cidadãos. Embora o crescimento urbano e populacional tenha sido extremamente acelerado nas últimas décadas, grande parte do território nacional desenvolveu-se sem planeamento urbano formal e sem integração adequada aos sistemas modernos de localização e identificação residencial.
Milhares de residências encontram-se em zonas sem ruas oficialmente identificadas ou sem numeração adequada. Em muitas localidades, especialmente nas periferias urbanas e bairros em expansão, os cidadãos dependem de referências informais para indicar a sua localização. Esta realidade cria enormes limitações para serviços administrativos, notificações oficiais, entregas documentais e comunicação governamental.
Actualmente, diversas instituições enfrentam dificuldades significativas para localizar cidadãos, entregar documentos, notificar processos administrativos ou garantir comunicação oficial eficiente. Como consequência, inúmeros documentos importantes nunca chegam ao destinatário ou chegam com atrasos consideráveis.
O modelo tradicional baseado em correspondência física tornou-se excessivamente lento, caro e ineficiente. O Estado continua a suportar elevados custos relacionados com impressão, transporte, armazenamento e distribuição documental, enquanto os cidadãos enfrentam filas extensas, deslocações constantes e perda significativa de tempo para resolver procedimentos simples.
Em muitos casos, cidadãos deslocam-se repetidamente às instituições apenas para confirmar se um documento ficou pronto, se existe uma notificação pendente ou se determinado processo sofreu actualização. Esta realidade gera custos económicos, desgaste social e baixa eficiência institucional.
Além disso, a dependência de processos físicos aumenta os riscos de extravio documental, perda de informações, falhas de notificação e conflitos administrativos. Multas, notificações fiscais, convocatórias judiciais e outros documentos críticos frequentemente deixam de ser recebidos dentro dos prazos adequados.
Outro problema estrutural relevante está relacionado com situações de emergência. Em acidentes, hospitalizações ou ocorrências críticas, as autoridades enfrentam dificuldades para localizar rapidamente familiares ou responsáveis, devido à inexistência de mecanismos digitais centralizados de contacto e identificação.
Todos estes factores demonstram a necessidade urgente de criação de uma nova infraestrutura nacional de comunicação digital, capaz de modernizar a relação entre o Estado e os cidadãos e eliminar grande parte das limitações do modelo administrativo actual.

A SOLUÇÃO: CORREIO DIGITAL ANGOLA
O Correio Digital Angola foi concebido como uma resposta estratégica aos desafios estruturais de comunicação existentes no país. O projecto propõe a criação de uma plataforma nacional inteligente de correspondência oficial digital, integrada, segura e preparada para servir milhões de cidadãos em todo o território nacional.
A proposta central consiste em transformar a identidade digital do cidadão no seu novo endereço oficial. Em vez de depender exclusivamente de ruas, bairros ou referências físicas, o sistema utilizará o Número do Bilhete de Identidade como principal mecanismo de identificação e comunicação institucional.
Cada cidadão possuirá uma caixa oficial de correspondência digital associada à sua identidade nacional. Todas as comunicações autorizadas pelo Estado serão centralizadas nesta plataforma, permitindo envio instantâneo, seguro, rastreável e permanentemente acessível através do telemóvel.
Na prática, o Correio Digital Angola funcionará como uma infraestrutura nacional de comunicação inteligente. Sempre que uma instituição pública necessitar comunicar com um cidadão, bastará inserir o Número do Bilhete de Identidade ou o nome completo no sistema. A plataforma localizará automaticamente o utilizador e enviará a informação directamente para o seu dispositivo.
A solução permitirá comunicação digital relacionada com:
- Bilhetes de Identidade;
- passaportes;
- notificações fiscais;
- multas;
- processos administrativos;
- facturas de energia e água;
- resultados hospitalares;
- marcações médicas;
- notificações judiciais;
- documentos académicos;
- licenças;
- convocatórias oficiais;
- serviços bancários integrados;
- autenticação digital;
O sistema incluirá funcionalidades avançadas de inteligência artificial, QR Codes de autenticação, biometria, validação digital e notificações inteligentes.
O grande diferencial do projecto está no facto de não se tratar apenas de um aplicativo móvel, mas sim de uma verdadeira infraestrutura digital nacional preparada para sustentar o futuro da governação electrónica em Angola.

OBJECTIVOS DO PROJECTO
O principal objectivo do Correio Digital Angola é modernizar profundamente a comunicação oficial entre o Estado e os cidadãos através da criação de uma plataforma nacional digital centralizada, segura, inteligente e altamente acessível.
O projecto pretende eliminar grande parte da burocracia associada aos processos físicos tradicionais, substituindo modelos lentos e ineficientes por uma comunicação digital instantânea, automatizada e rastreável.
Outro objectivo estratégico consiste em aumentar significativamente a eficiência operacional das instituições públicas, reduzindo atrasos administrativos, falhas de notificação, extravio documental e custos relacionados com impressão e distribuição física de documentos.
A iniciativa visa igualmente fortalecer a inclusão digital nacional, permitindo que cidadãos de diferentes níveis sociais, económicos e educacionais possam aceder aos serviços públicos através de uma plataforma simples e intuitiva.
O projecto foi concebido para reduzir deslocações desnecessárias às instituições públicas, diminuindo filas, tempo de espera e custos de transporte suportados pela população.
Outro objectivo central consiste em transformar o Bilhete de Identidade no principal elemento de identidade digital nacional, criando uma nova infraestrutura de comunicação baseada na identificação inteligente do cidadão.
A plataforma também contribuirá para acelerar a digitalização dos serviços públicos angolanos, alinhando-se com políticas modernas de governação electrónica e modernização administrativa.
Além disso, o sistema permitirá maior integração entre diferentes instituições públicas, promovendo padronização tecnológica, interoperabilidade institucional e centralização dos serviços digitais do Estado.
A longo prazo, o projecto visa posicionar Angola como uma referência africana em comunicação oficial digital, identidade inteligente e transformação administrativa baseada em tecnologia.
O Correio Digital Angola foi concebido não apenas como uma solução tecnológica, mas como um instrumento estratégico de desenvolvimento nacional, inclusão digital e modernização do Estado.

FUNCIONAMENTO DA PLATAFORMA
O funcionamento do Correio Digital Angola foi desenhado para ser simples, intuitivo, seguro e acessível para toda a população.
Cada cidadão terá uma conta oficial digital associada ao seu Bilhete de Identidade. O acesso poderá ser realizado através de reconhecimento facial ou PIN de segurança.
Dentro da plataforma, o utilizador encontrará uma caixa de correspondência semelhante às aplicações modernas de mensagens, onde diferentes instituições aparecerão organizadas como canais oficiais verificados.
Quando uma instituição pública emitir um documento ou actualizar determinado processo, o sistema enviará automaticamente uma notificação ao cidadão. O utilizador receberá informações detalhadas sobre o serviço, incluindo localização, documentos necessários, horários, prazos e procedimentos relacionados.
Por exemplo, quando o SME concluir a emissão de um Bilhete de Identidade, o cidadão receberá imediatamente uma notificação indicando que o documento está pronto para levantamento, incluindo código de validação digital e possibilidade de agendamento electrónico.
Da mesma forma, a AGT poderá enviar notificações fiscais, a ENDE poderá disponibilizar facturas digitais, os hospitais poderão comunicar resultados médicos e os tribunais poderão emitir notificações judiciais oficiais.
Todos os documentos recebidos permanecerão organizados no histórico pessoal do utilizador, permitindo acesso permanente às comunicações oficiais.
A plataforma incluirá notificações inteligentes em tempo real, lembretes automáticos de prazos e alertas prioritários relacionados com pagamentos, documentos expirados ou processos urgentes.
O sistema também permitirá integração futura com serviços complementares, transformando o Correio Digital Angola num verdadeiro centro nacional de serviços digitais integrados.

INTELIGÊNCIA ARTIFICIAL
A inteligência artificial será um dos pilares centrais do Correio Digital Angola.
O objectivo da IA não será apenas automatizar processos administrativos, mas transformar completamente a experiência de comunicação entre o Estado e os cidadãos.
Actualmente, muitos documentos oficiais utilizam linguagem técnica complexa e pouco acessível para grande parte da população. A inteligência artificial do sistema será capaz de traduzir automaticamente conteúdos jurídicos, fiscais e administrativos para uma linguagem simples, clara e compreensível.
A IA também poderá resumir documentos longos, destacar informações importantes e responder automaticamente às principais dúvidas dos cidadãos.
O assistente virtual inteligente permitirá interacções como:
- “O meu BI já ficou pronto?”;
- “Tenho multas pendentes?”;
- “Quando termina o prazo deste documento?”;
- “Onde posso levantar o meu passaporte?”;
- “Qual é o significado desta notificação?”.
A plataforma incluirá suporte por voz, permitindo maior inclusão digital para idosos, cidadãos com baixa escolaridade e utilizadores com dificuldades de leitura.
A inteligência artificial também auxiliará as instituições públicas na organização de processos, categorização documental, automação de respostas e redução da carga operacional.
Outro aspecto estratégico será a utilização de IA para reforço da segurança digital, identificação de actividades suspeitas e prevenção de fraudes.
A integração de inteligência artificial posicionará o Correio Digital Angola como uma das soluções governamentais mais avançadas tecnologicamente em África.

CÍRCULO DE CONFIANÇA E EMERGÊNCIAS
Uma das funcionalidades sociais mais inovadoras do projecto será o sistema de círculo de confiança.
Cada cidadão poderá definir familiares, amigos ou pessoas autorizadas para serem contactadas em situações críticas ou emergenciais.
Em casos de acidentes, hospitalizações, emergências médicas ou processos de identificação, as autoridades poderão utilizar a plataforma para contactar rapidamente os responsáveis indicados pelo utilizador.
Esta funcionalidade permitirá respostas mais rápidas, maior protecção familiar e melhoria significativa na assistência em situações críticas.
O sistema poderá incluir:
- envio automático de alertas;
- localização de emergência;
- contactos prioritários;
- notificações hospitalares;
- validação rápida de identidade;
- acesso autorizado a informações essenciais.
O recurso será particularmente importante para idosos, menores, cidadãos vulneráveis e pessoas com necessidades especiais.
Além do impacto familiar, esta funcionalidade reforçará o papel social do Estado e aproximará ainda mais as instituições da população.
O círculo de confiança representa uma inovação social relevante, integrando tecnologia, segurança humana e assistência cidadã numa única infraestrutura nacional.

BENEFÍCIOS PARA O GOVERNO
O Correio Digital Angola trará benefícios estruturais extremamente relevantes para o Estado Angolano.
A redução da dependência do papel permitirá poupanças significativas relacionadas com impressão, transporte, armazenamento e gestão documental física.
A comunicação digital instantânea aumentará drasticamente a eficiência das instituições públicas, reduzindo atrasos, falhas de notificação e perda documental.
O sistema permitirá rastreabilidade completa das comunicações enviadas, fortalecendo auditoria, transparência e controlo administrativo.
Outro benefício estratégico será a redução da pressão sobre serviços presenciais, diminuindo filas, aglomerações e custos operacionais institucionais.
A plataforma permitiria centralização nacional da comunicação oficial, promovendo maior integração entre diferentes organismos públicos.
O sistema também fornecerá dados estatísticos importantes para apoio à tomada de decisões governamentais e planeamento estratégico.
A modernização administrativa proporcionada pelo projecto aumentará a confiança institucional, fortalecerá a imagem do Estado e acelerará a transformação digital nacional.
O Correio Digital Angola poderá tornar-se uma das principais infraestruturas tecnológicas do governo angolano nas próximas décadas.

BENEFÍCIOS PARA O CIDADÃO
Para os cidadãos, os benefícios serão profundamente transformadores.
O acesso rápido às notificações oficiais reduzirá drasticamente deslocações desnecessárias, filas e perda de tempo em serviços públicos.
A plataforma permitirá que milhões de pessoas acompanhem processos administrativos directamente a partir do telemóvel, com maior comodidade, rapidez e segurança.
A carteira digital reduzirá o risco de perda de documentos físicos e facilitará o acesso permanente às identificações pessoais.
A inteligência artificial tornará a comunicação pública mais compreensível, inclusiva e acessível para toda a população.
O histórico digital permitirá organização permanente das comunicações oficiais, facilitando consultas futuras e gestão documental pessoal.
A possibilidade de acesso offline aumentará a acessibilidade em regiões com menor cobertura de internet.
O sistema de círculo de confiança proporcionará maior protecção familiar em situações de emergência.
Outro benefício importante será a redução dos custos pessoais relacionados com transporte, fotocópias, deslocações e tempo perdido.
O projecto contribuirá para acelerar a inclusão digital da população angolana e fortalecer a participação cidadã no ecossistema digital nacional.
Mais do que facilitar serviços, o Correio Digital Angola melhorará significativamente a relação entre o cidadão e o Estado.

MODELO DE NEGÓCIO
O Correio Digital Angola será gratuito para os cidadãos, garantindo inclusão social e adopção massiva da plataforma.
A sustentabilidade financeira será baseada em integração institucional, serviços corporativos e funcionalidades avançadas.
Instituições públicas, bancos, seguradoras, hospitais, universidades e empresas estratégicas poderão integrar-se à plataforma através de APIs e módulos especializados.
O sistema poderá incluir futuramente:
- assinatura digital;
- autenticação nacional;
- validação documental;
- pagamentos integrados;
- notificações premium;
- serviços corporativos avançados.
O projecto possui elevado potencial de escalabilidade nacional e internacional, podendo futuramente ser adaptado para outros países africanos.
Além do retorno financeiro, o modelo foi concebido para gerar impacto social, modernização institucional e transformação digital sustentável.

IMPACTO ECONÓMICO E SOCIAL
O impacto económico e social do Correio Digital Angola poderá ser histórico para o país.
A digitalização dos processos administrativos permitirá enorme redução de custos operacionais governamentais.
O aumento da eficiência institucional contribuirá para melhoria significativa da produtividade pública.
O projecto estimulará o ecossistema tecnológico nacional, promovendo desenvolvimento de software, inovação digital e capacitação profissional.
A implementação da plataforma poderá gerar empregos nas áreas de tecnologia, suporte técnico, cibersegurança, análise de dados e gestão digital.
Socialmente, o sistema fortalecerá a inclusão digital e aproximará milhões de cidadãos dos serviços públicos.
A plataforma contribuirá para maior transparência administrativa, rastreabilidade documental e confiança institucional.
A longo prazo, o projecto poderá posicionar Angola como uma referência africana em governação digital inteligente e modernização administrativa.
O Correio Digital Angola representa uma oportunidade estratégica para acelerar o desenvolvimento tecnológico nacional e construir uma nova geração de serviços públicos digitais.

CONCLUSÃO
O Correio Digital Angola representa uma oportunidade histórica de transformação nacional.
O projecto propõe a criação de uma nova infraestrutura digital estratégica capaz de modernizar profundamente a comunicação entre o Estado e os cidadãos.
A iniciativa resolve problemas estruturais relacionados com ausência de endereços formais, burocracia excessiva, lentidão administrativa e dependência de processos físicos.
Ao transformar o Bilhete de Identidade no novo endereço digital oficial do cidadão, Angola poderá liderar uma nova geração de governação electrónica em África.
Mais do que uma plataforma tecnológica, o Correio Digital Angola representa uma nova visão de cidadania digital, inclusão social e modernização administrativa.
O projecto combina inovação tecnológica, inteligência artificial, identidade digital, segurança documental e comunicação inteligente numa única solução integrada.
Com implementação adequada, apoio institucional e evolução contínua, o Correio Digital Angola poderá tornar-se uma das infraestruturas digitais mais importantes da história moderna do país.
O sistema possui capacidade para melhorar significativamente os serviços públicos, fortalecer a eficiência governamental e aproximar o Estado da população de forma inédita.
O Correio Digital Angola não representa apenas o futuro da comunicação oficial em Angola. Representa o início de uma nova era de transformação digital nacional.
`;

// Handler nativo Serverless da Vercel (evita completamente os problemas do Express quebrando rotas)
export default async function handler(req: any, res: any) {
  const { method, url } = req;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Endpoint /api/health
    if (url.includes('/api/health')) {
      return res.status(200).json({
        status: "ok",
        ai_key_configured: !!apiKey,
        groq_key_configured: !!groqApiKey,
      });
    }

    // 2. Endpoint /api/translate
    if (url.includes('/api/translate')) {
      const texts = req.body?.texts || [];
      return res.status(200).json({ translations: texts });
    }

    // Parse do Body de forma segura
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("Erro ao fazer parse manual de string body:", e);
      }
    }

    // 3. Endpoint /api/gov-ai
    if (url.includes('/api/gov-ai')) {
      const { action, text, context } = body || {};
      if (!text) {
        return res.status(400).json({ error: "O campo 'text' é obrigatório." });
      }

      let systemPrompt = "Você é o assistente virtual do Correio Digital de Angola especializado em análises governamentais.";
      let userPrompt = "";

      if (action === "summarize") {
        systemPrompt = "Você é um assistente do Governo de Angola especialista em simplificar e resumir documentos administrativos de forma clara, concisa e direta. Remova burocracias desnecessárias e explique tudo de forma simples em português de Angola.";
        userPrompt = `Faça um resumo inteligente, estruturado e muito fácil de ler do seguinte documento administrativo:\n\n${text}`;
      } else if (action === "explain") {
        systemPrompt = "Você é um assistente especialista em traduzir e explicar termos jurídicos, siglas e termos burocráticos complicados presentes em mensagens e comunicações do Estado de Angola para cidadãos comuns, de forma acolhedora, prática, muito simples e direta.";
        userPrompt = `Explique de forma acolhedora, clara e simples o significado prático e os termos difíceis desta notificação/mensagem oficial:\n\n${text}`;
      } else if (action === "urgency") {
        systemPrompt = "Você é especialista em identificar o nível de urgência e prazos legais de atendimento em comunicações administrativas públicas em Angola. Estipule riscos de perda de prazo.";
        userPrompt = `Analise detalhadamente o nível de urgência, o prazo oficial implícito ou explícito e as consequências jurídicas ou fiscais imediatas se o prazo não for cumprido para esta correspondência oficial:\n\n${text}`;
      } else if (action === "classify") {
        systemPrompt = "Você é um classificador especializado de correspondência governamental angolana. Determine: 1. Categoria do Documento (Notificação, Ofício, Multa, Fatura, Processo, etc.), 2. Instituição Emissora Provável, 3. Assunto Principal, e 4. Metadados Extraídos de forma organizada.";
        userPrompt = `Classifique e extraia metadados e informações críticas do seguinte documento:\n\n${text}`;
      } else if (action === "fraud") {
        systemPrompt = "Você é o perito de segurança facial e cibernética do Correio Digital de Angola. Analise o documento ou mensagem para detectar indícios de fraudes, tentativas de phishing, golpes de cobrança falsa de impostos, NIF falso, ou solicitações indevidas de dados pessoais.";
        userPrompt = `Análise este documento ou correspondência minuciosamente procurando sinais de fraude, de falsificação de identidade ou golpe fiscal/social:\n\n${text}`;
      } else if (action === "help" || action === "qna") {
        systemPrompt = "Você é o assistente virtual de inteligência artificial governamental do Correio Digital de Angola. Ajude o cidadão de Angola com instruções passo a passo detalhadas sobre como resolver as pendências financeiras, fiscais ou burocráticas descritas no documento ou mensagem.";
        userPrompt = `Dúvida do cidadão ou solicitação de ajuda sobre o documento:\n${text}\n\nContexto da correspondência:\n${context || ''}`;
      } else {
        userPrompt = text;
      }

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.3,
            }
          });
          if (response && response.text) {
            return res.status(200).json({ result: response.text });
          }
        } catch (e) {}
      }

      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3
          });
          if (completion.choices?.[0]?.message) {
            return res.status(200).json({ result: completion.choices[0].message.content });
          }
        } catch (e) {}
      }

      return res.status(200).json({ result: "Modo offline ativo." });
    }

    // 4. Endpoint /api/chat (Fluxo contínuo do Chat do Cidadão)
    if (url.includes('/api/chat')) {
      const { messages } = body || {};

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "O array de 'messages' é obrigatório." });
      }

      // INJEÇÃO DA DIRETIVA DE CONHECIMENTO DE SISTEMA DO CORREIO DIGITAL ANGOLA
      const sysPrompt = `Você é o assistente virtual oficial do Correio Digital de Angola.
O seu objetivo é responder de forma clara, simples e direta em português de Angola.
Sempre que o utilizador perguntar sobre o funcionamento da plataforma ou do projeto Correio Digital Angola, você DEVE responder e basear-se estritamente no seguinte conhecimento corporativo oficial:

"""
${OFFICIAL_KNOWLEDGE_CDA}
"""

Regras de Resposta:
1. Analise a pergunta do utilizador, identifique qual dos tópicos oficiais acima se adapta melhor ao que ele quer saber, e formule uma resposta acolhedora e informativa com base nessa informação.
2. Não utilize de forma alguma asteriscos ou símbolos de formatação como markdown (como *, **, \`\`). Apresente o texto limpo e legível.`;

      const alternateMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      for (const msg of messages) {
        const role = msg.role === 'assistant' || msg.role === 'model' || msg.role === 'bot' ? 'assistant' : 'user';
        const content = msg.content || msg.text || '';
        if (!content) continue;
        alternateMessages.push({ role, content });
      }

      if (groq) {
        try {
          const completion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: sysPrompt },
              ...alternateMessages.map(m => ({
                role: m.role,
                content: m.content
              }))
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3
          });
          if (completion.choices?.[0]?.message) {
            return res.status(200).json({ message: completion.choices[0].message.content });
          }
        } catch (e: any) {
          console.error("Erro na API do Groq no Serverless:", e.message || e);
        }
      }

      return res.status(200).json({ message: "Olá! Atualmente estou a operar em Modo local. Como posso ajudar com os seus documentos?" });
    }

    // Fallback global de rotas
    return res.status(404).json({ error: "Endpoint não encontrado." });

  } catch (err: any) {
    console.error("Serverless Exception:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message || err });
  }
}
