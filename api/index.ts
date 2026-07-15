import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

// IMPORTANTE: O bodyParser nativo do Express por vezes pode ler o corpo como vazio (undefined) em ambientes Serverless da Vercel.
// Ativamos o parser de JSON e URLEncoded padrão de forma explícita.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize AI Clients
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';

console.log("HEALTH CHECK API INITIALIZED. GROQ KEY PRESENT:", !!groqApiKey);

let groq: Groq | null = null;
if (groqApiKey) {
  try {
    groq = new Groq({ apiKey: groqApiKey.trim() });
    console.log("GROQ CLIENT INSTANTIATED SUCCESSFULLY.");
  } catch (e: any) {
    console.error("CRITICAL: Failed to instantiate Groq client:", e.message || e);
  }
} else {
  console.error("CRITICAL ERROR: GROQ API KEY MISSING FROM PROCESS.ENV!");
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

const getRuntimeFlags = () => ({
  local_bootstrap: true,
  mock_fallback: false,
  supabase_auto_seed: false,
});

// API Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    ai_key_configured: !!apiKey,
    groq_key_configured: !!groqApiKey,
    runtime_flags: getRuntimeFlags()
  });
});

// API for Government AI
app.post("/api/gov-ai", async (req, res) => {
  try {
    const { action, text, context } = req.body || {};
    let systemPrompt = "Você é o assistente virtual do Correio Digital de Angola especializado em análises governamentais.";
    let userPrompt = "";

    if (!text) {
      return res.status(400).json({ error: "O campo 'text' é obrigatório." });
    }

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
          return res.json({ result: response.text });
        }
      } catch (geminiErr: any) {
        console.error("Gemini failed, falling back...");
      }
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
        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
          return res.json({ result: completion.choices[0].message.content });
        }
      } catch (groqErr: any) {
        console.error("Groq fallback failed:", groqErr.message || groqErr);
      }
    }

    return res.json({ result: "Modo offline ativo." });

  } catch (err: any) {
    console.error("error in /api/gov-ai:", err);
    res.status(500).json({ error: "Erro na central de IA." });
  }
});

// Resilient Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, isGovMode, currentPage, pageContext, language } = req.body || {};
    
    console.log("CHAT REQUEST RECEIVED. MESSAGES COUNT:", messages?.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "O array de 'messages' é obrigatório e não pode estar vazio." });
    }

    const sysPrompt = "Você é o assistente oficial do Correio Digital de Angola. Responda em Português de Angola de forma direta, clara e concisa. Não utilize asteriscos ou formatações.";

    const alternateMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of messages) {
      const role = msg.role === 'assistant' || msg.role === 'model' || msg.role === 'bot' ? 'assistant' : 'user';
      const content = msg.content || msg.text || '';
      if (!content) continue;
      alternateMessages.push({ role, content });
    }

    if (groq) {
      try {
        console.log("ATTEMPTING GROQ CHAT COMPLETION...");
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: sysPrompt },
            ...alternateMessages.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          model: "llama-3.1-8b-instant",
        });
        console.log("GROQ CHAT COMPLETION SUCCESSFUL.");
        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
          return res.json({ message: completion.choices[0].message.content });
        }
      } catch (groqErr: any) {
        console.error("GROQ CHAT COMPLETION FAILED:", groqErr.message || groqErr);
      }
    } else {
      console.error("GROQ CLIENT IS NULL IN CHAT ENDPOINT!");
    }

    return res.json({ message: "Olá! Atualmente estou a operar em Modo local. Como posso ajudar com os seus documentos?" });

  } catch (error: any) {
    console.error("Chat Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar conversa com IA." });
  }
});

// Translation API
app.post("/api/translate", async (req, res) => {
  try {
    const { texts } = req.body || {};
    return res.json({ translations: texts || [] });
  } catch (err: any) {
    return res.json({ translations: req.body?.texts || [] });
  }
});

// Serve frontend static build
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Exporta o handler encapsulado para Vercel Serverless
export default (req: any, res: any) => {
  return app(req, res);
};
