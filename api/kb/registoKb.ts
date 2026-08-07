// ============================================================================
// REGISTO de Base de Conhecimento por instituição — Etapa A (E1/E2/E3).
// FICHEIRO ÚNICO consolidado (vaga-2, 2026-08-05): o plano Hobby da Vercel
// limita a 12 funções serverless por deploy e CADA ficheiro .ts dentro de
// api/ conta como uma função — os 14 ficheiros api/kb/*Kb.ts da vaga-2
// fizeram o build FALHAR ("No more than 12 Serverless Functions...").
// Por isso o conteúdo das 13 instituições vive TODO neste ficheiro.
//   - server.ts (dev/esbuild) importa DESTE ficheiro;
//   - api/index.ts (Vercel) NÃO importa: recebe o conteúdo injetado por
//     scripts/syncKb.ts entre ===KB-INICIO===/===KB-FIM===.
//   - Fonte única do conteúdo: ESTE ficheiro. Nada de imports (cadeia fria).
//
// E2/E3: conteúdo RECOLHIDO NA INTERNET a pedido do dono (vaga-1: 6
// instituições; vaga-2: +7; vaga-3: +4 = 17). Cada fonte regista fonteUrl
// e atualizadoEm.
// Regra mantida: nunca inventar regras/valores sem fonte.
// ============================================================================

export interface FonteKbLocal {
  id: string;
  titulo: string;
  tipo: 'regulamento' | 'procedimento' | 'faq';
  texto: string;
  atualizadoEm: string;
  fonteUrl?: string;
}

export interface KbInstituicaoLocal {
  sigla: string;
  nome: string;
  fontes: FonteKbLocal[];
}

// ============================================================================
// KB AGT — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - Portal do Contribuinte (https://portaldocontribuinte.minfin.gov.ao)
//  - Portal institucional da AGT (https://agt.minfin.gov.ao)
// consultados em 2026-08-05. Sem invenção de prazos, taxas ou obrigações.
// ============================================================================



export const KB_AGT: KbInstituicaoLocal = {
  sigla: 'AGT',
  nome: 'Administração Geral Tributária',
  fontes: [
    {
      id: 'agt-portal-servicos',
      titulo: 'Portal do Contribuinte — serviços electrónicos da AGT',
      tipo: 'procedimento',
      texto: [
        'O Portal do Contribuinte (portaldocontribuinte.minfin.gov.ao) é a plataforma digital oficial da AGT — órgão superintendido pelo Ministério das Finanças — para a relação com os contribuintes, sem deslocação às repartições fiscais e aduaneiras.',
        'ACESSO: na página inicial existe o botão «Solicitar Novo Acesso» (criar registo) e a opção «Recuperar a Palavra-Passe». Quem não tem conta pode seleccionar «Novo Utilizador»; para representar outro contribuinte, «Nova Representação».',
        'SERVIÇOS DO PORTAL: submissão de declarações electrónicas (IVA e demais impostos); liquidação e pagamento de impostos; consulta de facturas; emissão de certidão de conformidade tributária e de certidão de dívida tributária; consulta da conta-corrente do contribuinte; submissão de ficheiros SAF-T (contabilidade e facturação); validação de documentos; registo de facturas electrónicas.',
        'SERVIÇO PÚBLICO SEM LOGIN: «Verificação da Nota de Liquidação» — permite a qualquer pessoa confirmar a validade de uma nota de liquidação da AGT.',
        'PRAZOS: o Calendário Fiscal (edição 2026 em PDF no portal) e os comunicados oficiais definem — e por vezes alargam — os prazos de submissão de declarações e pagamentos. Confirmar sempre no portal ou em www.agt.minfin.gov.ao.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://portaldocontribuinte.minfin.gov.ao',
    },
    {
      id: 'agt-simulador-ivm',
      titulo: 'Simulador Tributário e Imposto sobre os Veículos Motorizados (IVM)',
      tipo: 'procedimento',
      texto: [
        'No site www.agt.minfin.gov.ao, aba «Serviços Electrónicos» > «Simulador Tributário», o contribuinte pode simular o Imposto sobre os Veículos Motorizados (IVM), o Imposto Predial (IP) e o Imposto sobre o Rendimento do Trabalho (IRT); a AGT prevê incluir faseadamente II, IEC, IVA, IS, IAC e IEJ e a componente aduaneira (importação e exportação).',
        'IVM: no próprio site existe a caixa «Imposto Sobre os Veículos Motorizados». Quem NÃO está cadastrado no Portal do Contribuinte escolhe «Cadastrar», digita o NIF e recebe um código de verificação no e-mail ou telemóvel associado ao cadastro; segue os passos para cadastrar o veículo, liquidar, pagar e obter o selo. Também existe «Carregamento em Massa» para frotas.',
        'A AGT publicou no portal um «Passo a Passo» oficial do IVM (cadastrar, liquidar, pagar e obter o selo) e um «Guia rápido» para desassociação de veículos no Portal do Contribuinte.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://portaldocontribuinte.minfin.gov.ao/noticia?id=809086',
    },
    {
      id: 'agt-legislacao-contactos',
      titulo: 'Legislação fiscal, notificações e contactos da AGT (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Onde consulto a legislação fiscal e aduaneira? R: Em www.agt.minfin.gov.ao, secção «Legislação» (Legislação Fiscal, Legislação Aduaneira, Tributação Especial, circulares, instrutivos, tipografias/gráficas e programas validados). As medidas fiscais e aduaneiras do Orçamento Geral do Estado estão na secção «OGE» do mesmo portal, e o boletim mensal «Folha Tributária» na Sala de Imprensa.',
        'Q: Como sei da minha situação fiscal ou de notificações? R: A AGT notifica os contribuintes pela caixa do Portal do Contribuinte (anúncios recentes incluíram, por exemplo, notificações de início de fiscalização e de direito de audição prévia relativas ao exercício de 2025). Verificar regularmente a conta no portal.',
        'Q: Existe atendimento rápido por chat? R: Sim — o portal da AGT (www.agt.minfin.gov.ao) divulga contacto por WhatsApp: +244 923 167 011.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://agt.minfin.gov.ao/PortalAGT/#!/',
    },
  ],
};

// ============================================================================
// KB Emergências (CISP 111) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono. Fontes jornalísticas que
// citam directamente as autoridades (porta-voz do Ministério do Interior,
// Mai/2020; Serviço Nacional de Protecção Civil e Bombeiros, Nov/2024).
// HONESTIDADE: os números 113 e 115 foram oficialmente descontinuados —
// a KB regista essa mudança para ninguém ligar números mortos.
// ============================================================================



export const KB_CISP: KbInstituicaoLocal = {
  sigla: 'CISP',
  nome: 'Emergências — Centro Integrado de Segurança Pública (111)',
  fontes: [
    {
      id: 'cisp-numero-emergencia',
      titulo: 'Número de emergência em Angola — 111 (e o destino dos antigos 113 e 115)',
      tipo: 'faq',
      texto: [
        'Q: Para que número ligo numa emergência (crime, acidente, incêndio, emergência médica)? R: 111 — terminal telefónico de emergência ÚNICO, coordenado pelo CISP (Centro Integrado de Segurança Pública), ao serviço da população 24 sobre 24 horas. O objectivo do CISP é unificar num só número qualquer situação: acidente de viação, incêndio ou denúncia de um crime.',
        'Q: E os antigos números? R: NÃO USAR — o 113 (antiga linha de emergência policial) foi DESACTIVADO pelo Ministério do Interior (Maio de 2020): quem ligar não será atendido. O 115 (Protecção Civil e Bombeiros) também foi descontinuado e os bombeiros orientam ligar o 111 (rádio RNA, Novembro de 2024).',
        'Q: O 111 funciona em todo o país? R: Foi implantado primeiro em Luanda e Benguela e vai sendo alargado às restantes províncias à medida que são inauguradas delegações do CISP. Onde o 111 ainda não funciona, a orientação oficial do Ministério do Interior é ligar para o comando policial do seu município (os contactos móveis são divulgados pelos comandos provinciais e municipais).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://rna.ao/rna.ao/2024/11/28/servico-de-proteccao-civil-e-bombeiros-alerta-que-em-caso-de-emergencias-medicas-policiais-ou-de-incendio-os-cidadaos-devem-ligar-para-o-111/',
    },
  ],
};

// ============================================================================
// KB DNIRN (Identificação Civil e Criminal) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de páginas oficiais:
//  - Portal do Governo/SIAC (https://www.siac.gv.ao/pt/dnirn e
//    https://siac.gov.ao/servico/identificacao-civil/)
//  - SEPE (prazo do registo criminal)
// consultados em 2026-08-05. Requisitos transcritos tal como publicados.
// ============================================================================



export const KB_DNIRN: KbInstituicaoLocal = {
  sigla: 'DNIRN',
  nome: 'Direcção Nacional de Identificação, Registos e Notário (Identificação Civil)',
  fontes: [
    {
      id: 'dnirn-bi-primeira-renovacao',
      titulo: 'Bilhete de Identidade — 1.ª via e renovação',
      tipo: 'procedimento',
      texto: [
        'QUEM PODE PEDIR A 1.ª VIA: todo o cidadão com idade a partir dos 6 anos. DOCUMENTOS (portal do SIAC): assento de nascimento (original e cópia); se o registo foi feito depois de Março de 2021, não é precisa certidão — basta o boletim de nascimento com o NUC (Número Único do Cidadão, adquirido no acto do registo); cópia do bilhete dos pais, dentro do prazo de validade; comprovativo do pagamento da taxa-emolumento. Quem tem o bilhete ANTIGO (amarelo) apresenta-o acompanhado do assento de nascimento.',
        'RENOVAÇÃO (bilhete fora do prazo de validade): Bilhete de Identidade original + assento de nascimento + comprovativo do pagamento da taxa-emolumento. NOTA: se o BI estiver dentro da validade mas estragado, o serviço correcto é a SUBSTITUIÇÃO, não a renovação.',
        'Os emolumentos são normalmente cobrados com comprovativo emitido pelo BPC nos balcões do próprio SIAC. Requisitos completos em siac.gov.ao, serviço «Identificação Civil».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/identificacao-civil/',
    },
    {
      id: 'dnirn-bi-segunda-substituicao',
      titulo: 'Bilhete de Identidade — 2.ª via, substituição, averbamento e levantamento por outrem',
      tipo: 'procedimento',
      texto: [
        'SEGUNDA VIA (perda, extravio, roubo): assento de nascimento; bilhete antigo (amarelo), se existir; PARTICIPAÇÃO DA POLÍCIA (obrigatória em caso de extravio); comprovativo do pagamento da taxa-emolumento.',
        'SUBSTITUIÇÃO (bilhete estragado ou em mau estado de conservação): Bilhete de Identidade original + assento de nascimento + comprovativo do emolumento.',
        'AVERBAMENTO (mudança de estado civil etc.): Bilhete de Identidade original ou cópia (se for o BI actual), dentro do prazo; assento de nascimento; assento de casamento, de divórcio ou de óbito do cônjuge, conforme o caso; comprovativo do emolumento.',
        'LEVANTAMENTO DO BILHETE POR OUTRA PESSOA: só a mãe, o pai, um irmão maior de 18 anos ou o cônjuge (com o estado civil averbado no bilhete); no acto de levantamento apresenta-se o Bilhete de Identidade original de quem levanta e o recibo do processo.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/dnirn',
    },
    {
      id: 'dnirn-registo-criminal',
      titulo: 'Certificado de Registo Criminal — requisitos e prazo',
      tipo: 'procedimento',
      texto: [
        'O Certificado de Registo Criminal certifica a situação de identificação criminal do cidadão. PRAZO DE EXECUÇÃO: 72 horas a partir da data de entrada do processo no SIAC (segundo o catálogo de serviços do SEPE).',
        'REQUISITOS: Bilhete de Identidade original, dentro do prazo de validade; NIF actualizado; presença do requerente; comprovativo do pagamento da taxa-emolumento (emitido pelo BPC - SIAC). NOTA: se não tiver o bilhete ou a cópia, o serviço pode ser tratado com o número do bilhete.',
        'ESTRANGEIROS: passaporte com visto dentro do prazo de validade (original e cópia) ou cartão de residente (original e cópia); documento que comprove a filiação do requerente; NIF actualizado.',
        'AUSÊNCIA DO REQUERENTE: procuração — para estrangeiros, procuração original passada pelo cartório notarial do país de origem — e Bilhete de Identidade do requerente e do seu representante legal.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sepe.gov.ao/ao/catalogo/mais-servicos/direito-e-legislacao/pedido-de-certificado-de-registo-criminal/',
    },
  ],
};

// ============================================================================
// KB DTSER (Trânsito e Segurança Rodoviária) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, das páginas de serviços
// do portal do Governo/SIAC:
//  - https://www.siac.gv.ao/pt/dtser
//  - https://siac.gov.ao/servico/dtser-transito-e-seguranca-rodoviaria/
// consultados em 2026-08-05.
// ============================================================================



export const KB_DTSER: KbInstituicaoLocal = {
  sigla: 'DTSER',
  nome: 'Direcção de Trânsito e Segurança Rodoviária',
  fontes: [
    {
      id: 'dtser-carta-conducao',
      titulo: 'Carta de condução — renovação, duplicado, mudança de residência e troca de carta estrangeira',
      tipo: 'procedimento',
      texto: [
        'ELEMENTO COMUM: os serviços da carta de condução exigem o cadastro de conta STAC (Sistema Tecnológico de Apoio ao Cidadão), criado antecipadamente.',
        'RENOVAÇÃO DA CARTA: conta STAC; atestado médico para condutores (modelo 2, Imprensa Nacional); fotocópia do Bilhete de Identidade; carta de condução original e fotocópia; se estrangeiro, fotocópia do passaporte com visto de trabalho actualizado ou do cartão de estrangeiro residente.',
        'DUPLICADO (segunda via): conta STAC; fotocópia do B.I.; cópia da carta de condução (SADEC).',
        'MUDANÇA DE RESIDÊNCIA NA CARTA: conta STAC; atestado de residência; carta de condução original; fotocópia do B.I.',
        'TROCA DE CARTA DE CONDUÇÃO ESTRANGEIRA: conta STAC; carta de condução estrangeira original e fotocópia; fotocópia do passaporte com visto de trabalho actualizado ou do cartão de estrangeiro; certidão de autenticidade da carta de condução; registo criminal.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/dtser',
    },
    {
      id: 'dtser-veiculo-matricula-tuv',
      titulo: 'Registo de veículo — matrícula, Título Único de Veículo (TUV) e duplicado do livrete',
      tipo: 'procedimento',
      texto: [
        'REGISTO E ATRIBUIÇÃO DE MATRÍCULA DE VEÍCULO: comprovativo do pagamento da taxa-emolumento (emitido pelo BPC - SIAC); formulário Modelo «O»; nota de desalfandegamento; sinopse; documento único; certificado de embarque (emitido pelo Conselho Nacional de Carregadores de Angola); factura de compra e venda do veículo (comercial/invoice).',
        'TUV — TÍTULO ÚNICO DE VEÍCULO: emitido para livretes extraviados e para alteração de características do veículo (serviços anunciados no portal do SIAC).',
        'DUPLICADO DO LIVRETE (para livretes com data de emissão anterior a seis meses): fotocópia do livrete; fotocópia do B.I.; fotocópia do título do registo de propriedade (caso o tenha — se não, dirigir-se primeiro à Conservatória de Propriedade Automóvel para se informar).',
        'Detalhes por serviço em siac.gov.ao, serviço «Trânsito e Segurança Rodoviária (DTSER)».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/dtser-transito-e-seguranca-rodoviaria/',
    },
  ],
};

// ============================================================================
// KB ENDE — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono.
// HONESTIDADE DE FONTE: o site oficial da ENDE (www.ende.co.ao) não respondeu
// à data da recolha; os dados abaixo vêm de directório público de contactos
// (2024) e da referência do SEPE ao Provedor do Cliente ENDE. Por isso esta
// base fica limitada a canais oficiais de atendimento — NÃO foram incluídos
// valores de tarifas nem requisitos de ligação sem fonte oficial verificável.
// ============================================================================



export const KB_ENDE: KbInstituicaoLocal = {
  sigla: 'ENDE',
  nome: 'Empresa Nacional de Distribuição de Electricidade',
  fontes: [
    {
      id: 'ende-atendimento-canais',
      titulo: 'Atendimento ao cliente, Provedor do Cliente e canais de reclamação',
      tipo: 'faq',
      texto: [
        'A ENDE — Empresa Nacional de Distribuição de Electricidade — é a empresa pública de distribuição de electricidade em Angola, tutelada pelo Ministério da Energia e Águas, com sede na Rua Cónego Manuel das Neves, 234, Luanda.',
        'Q: Como contactar a ENDE? R: Central de atendimento telefónico +244 222 641 750 (linha principal divulgada publicamente); Instagram oficial @ende_oficial.',
        'Q: A reclamação não foi resolvida? R: Existe o PROVEDOR DO CLIENTE ENDE, serviço de aproximação entre a empresa e o consumidor, que pode ser contactado por formulário próprio na área de eServiços do SEPE (Portal dos Serviços Públicos Electrónicos do Governo de Angola, sepe.gov.ao). Em alternativa, o consumidor pode expor a situação ao INADEC (Instituto Nacional de Defesa do Consumidor).',
        'NOTA DE CONFIANÇA: estes contactos foram recolhidos de directórios públicos e do portal SEPE. Para serviços novos (pedidos de ligação, contadores, tarifas), confirmar SEMPRE junto da ENDE — presencialmente num centro de atendimento ou pelos canais acima — pois só a ENDE é fonte autorizada.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://telefone-numero.com/ende-contactos',
    },
  ],
};

// ============================================================================
// KB EPAL — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, da fonte oficial:
//  - Página Comercial da EPAL (https://www.epal.co.ao/comercial.php)
// consultado em 2026-08-05. Valores de taxas e tarifas tal como publicados
// pela EPAL; confirmar sempre no balcão antes de pagar.
// ============================================================================



export const KB_EPAL: KbInstituicaoLocal = {
  sigla: 'EPAL',
  nome: 'Empresa Pública de Águas de Luanda',
  fontes: [
    {
      id: 'epal-nova-ligacao',
      titulo: 'Nova ligação de água — como celebrar o contrato (segmento doméstico)',
      tipo: 'procedimento',
      texto: [
        'Para celebrar o contrato de abastecimento de água no segmento DOMÉSTICO, o cliente dirige-se a uma agência/balcão comercial da EPAL apresentando:',
        '1) cópia do Bilhete de Identidade;',
        '2) documento que comprove que o cliente é o legítimo titular do local a abastecer;',
        '3) valor de 600,00 Kz;',
        '4) Taxa de Ligação de 15.000,00 Kz (Projecto 700.000 ligações).',
        'Os valores são os publicados na página comercial da EPAL (www.epal.co.ao) à data da recolha; confirmar sempre no balcão antes de pagar.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-facturacao-pagamento',
      titulo: 'Facturação e modalidades de pagamento',
      tipo: 'procedimento',
      texto: [
        'FACTURAÇÃO (três formas): 1) LEITURA DE CONTADOR — baseada na leitura do contador; 2) CONSUMO ESTIMADO — na ausência de contador, o consumo é facturado por estimativa em função do sector e subsector de actividade; 3) MÉDIA DE CONSUMO — na ausência de leitura, com base na média dos consumos reais anteriores, regularizada imediatamente após uma nova leitura.',
        'MODALIDADES DE PAGAMENTO: Multicaixa (num ATM, seguindo as instruções de pagamento); depósito à ordem; numerário ou cartão Multicaixa nos balcões da EPAL; pagamento directo nos balcões dos bancos BCA e Sol (não carece de reconciliação nos balcões da EPAL); internet banking e transferência bancária; ordem de saque.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-tarifario',
      titulo: 'Plano tarifário da água potável — Decreto Executivo Conjunto n.º 230/18',
      tipo: 'regulamento',
      texto: [
        'O Plano Tarifário de água potável para a Província de Luanda foi aprovado pelo Decreto Executivo Conjunto n.º 230/18, de 12 de Junho (Ministério das Finanças e Ministério da Energia e Águas).',
        'DOMÉSTICOS: tarifa básica 59 Kz/m³ (consumo de 0 a 10 m³); tarifa de transição 94 Kz/m³ (10 a 15 m³); tarifa básica 137 Kz/m³ com tarifa fixa mensal de 332 Kz (consumo acima de 15 m³).',
        'COMÉRCIO E SERVIÇOS: 137 Kz/m³, com tarifa fixa mensal de 3.900 Kz. INDÚSTRIA: 124 Kz/m³, com tarifa fixa mensal de 11.700 Kz. CHAFARIZ: 42 Kz/m³. GIRAFA: 137 Kz/m³.',
        'O diploma e a tabela completa estão publicados no site da EPAL (www.epal.co.ao, secção Comercial > Tarifário).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
    {
      id: 'epal-atendimento',
      titulo: 'Atendimento ao cliente, reclamações e balcões (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Como faço uma reclamação (falta de água, avaria, factura errada)? R: Piquete da EPAL: (+244) 942 454 897; outros contactos telefónicos: 993 009 582, 921 553 333 e 226 431 561; e-mail geral@epal.co.ao; página oficial no Facebook «Epal de Luanda»; ou presencialmente num balcão comercial.',
        'Q: Onde são os balcões? R: A EPAL tem dezanove balcões de atendimento em Luanda — por exemplo Coqueiros, Valódia, Terra Nova, Viana, Kilamba, Maianga, Camama, Cacuaco, Cazenga, Mulemba, Zango, Benfica e Sequele — mais sub-agências (Kifica, Nova Vida, Golfe) e postos comerciais (Kero Cacuaco; SIAC do Cazenga, Talatona e Zango; Vida Pacífica; Vila Marina), além de postos móveis em zonas sem balcão fixo.',
        'Q: O que tratam os balcões comerciais? R: Atendimento ao cliente, entrega de facturas ao domicílio, cadastramento de clientes, leitura de contadores, gestão de reclamações e celebração de contratos.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.epal.co.ao/comercial.php',
    },
  ],
};

// ============================================================================
// KB INAPEM — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono (dono: "Adiciona o texto ou
// arquivo na base de conhecimento da IA atraves da pesquisa na internet").
// Fonte oficial: website do INAPEM (https://www.inapem.gov.ao), consultado em
// 2026-08-05; passos da Plataforma de Certificação conforme anúncio oficial do
// INAPEM (Maio/2023). Nenhum número ou regra foi inventado.
// ============================================================================



export const KB_INAPEM: KbInstituicaoLocal = {
  sigla: 'INAPEM',
  nome: 'Instituto Nacional de Apoio às Micro, Pequenas e Médias Empresas',
  fontes: [
    {
      id: 'inapem-cert-oque',
      titulo: 'Certificado MPME — o que é, validade e benefícios',
      tipo: 'procedimento',
      texto: [
        'O Certificado MPME é o documento oficial do INAPEM que atesta a classificação formal de uma empresa como MICRO, PEQUENA ou MÉDIA empresa.',
        'VALIDADE: 12 meses, findo o qual deve ser RENOVADO para manter os benefícios associados.',
        'BENEFÍCIOS do certificado: acesso a linhas de crédito com condições especiais; participação em programas de apoio e incentivos governamentais; maior visibilidade e credibilidade no mercado; acesso a capacitação e formação especializada; oportunidades de networking e parcerias estratégicas.',
        'A certificação destina-se às MPME que precisam de fazer prova do estatuto junto de entidades da Administração Pública — atribuição de apoios ou outras formas de discriminação positiva de micro, pequenas e médias empresas.',
        'Portal oficial: www.inapem.gov.ao',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
    {
      id: 'inapem-cert-pedido',
      titulo: 'Como pedir o Certificado MPME online',
      tipo: 'procedimento',
      texto: [
        'O pedido do Certificado MPME é feito À DISTÂNCIA, sem deslocação física nem entrega presencial de documentos, na Plataforma de Certificação do INAPEM, que está interligada com o canal da AGT.',
        'PASSOS: 1) aceder a www.inapem.gov.ao; 2) no menu «Serviços» escolher a subcategoria «Certificação»; 3) premir «Ver mais» e depois «Solicitar» — o requerente é reencaminhado para a plataforma, que valida os dados da empresa junto da AGT.',
        'O certificado emitido tem código QR para reforço da segurança e geolocalização da empresa.',
        'Segundo anúncio do INAPEM (Maio de 2023), a plataforma reduziu o período médio de emissão do certificado de cerca de 30 dias para cerca de 3 dias.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
    {
      id: 'inapem-programas-faq',
      titulo: 'Programas e produtos do INAPEM (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Que outros apoios o INAPEM dá às MPME? R: REDE INAPEM — plataforma digital que dá maior visibilidade no mercado aos prestadores de serviços angolanos e os liga a potenciais clientes e parceiros. SELO «FEITO EM ANGOLA» — certificação oficial de origem e qualidade que identifica, valoriza e promove produtos fabricados em território nacional. MEU GESTOR — consultores especializados dão apoio técnico personalizado directamente nas instalações das micro e pequenas empresas (diagnóstico de desempenho, recomendações práticas de gestão, implementação de soluções). NOSSO SABER — plataforma de e-learning com cursos, webinars e materiais educativos para empreendedores, no seu próprio ritmo, com certificação de conclusão. KAWENAINVEST — ligação de MPME a investidores e oportunidades de capital, com orientação para acesso a linhas de crédito e programas de garantia pública. TWENDY — programa nacional de incubação e aceleração de startups, com ciclos intensivos de cerca de 10 semanas, mentoria, recursos e redes de parceiros.',
        'Q: Onde faço a candidatura a estes programas? R: Em www.inapem.gov.ao, menu «Serviços», escolhendo o produto pretendido.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.inapem.gov.ao',
    },
  ],
};

// ============================================================================
// KB INSS — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - INSS Virtual (https://virtual.inss.gov.ao)
//  - «Estou Inscrito?» (https://estouinscrito.inss.gov.ao)
//  - Catálogo INSS no portal do Governo/SIAC (https://www.siac.gv.ao/pt/inss)
// consultados em 2026-08-05. As condições de acesso à reforma seguem a regra
// geral da legislação da segurança social (60 anos + 180 meses de
// contribuições, ou 420 meses/35 anos de descontos ininterruptos).
// ============================================================================



export const KB_INSS: KbInstituicaoLocal = {
  sigla: 'INSS',
  nome: 'Instituto Nacional de Segurança Social',
  fontes: [
    {
      id: 'inss-virtual-servicos',
      titulo: 'INSS Virtual — serviços electrónicos disponíveis',
      tipo: 'procedimento',
      texto: [
        'O INSS Virtual (virtual.inss.gov.ao) concentra num único ambiente os serviços digitais do Instituto Nacional de Segurança Social.',
        'ENTIDADES EMPREGADORAS (contribuintes): inscrever os seus trabalhadores, gerar as folhas de remunerações, imprimir cartões, consultar a situação contributiva e receber as notificações enviadas pelo INSS.',
        'SEGURADOS E PENSIONISTAS: emitir extractos de contribuições e de pagamentos.',
        'VERIFICAÇÃO DE INSCRIÇÃO sem login: serviço «Estou Inscrito?» (estouinscrito.inss.gov.ao) — com o número do Bilhete de Identidade, o cidadão confirma se já está inscrito na segurança social e, se estiver, pode imprimir o cartão de segurado.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://virtual.inss.gov.ao/',
    },
    {
      id: 'inss-pensao-reforma',
      titulo: 'Pensão de reforma por velhice — condições e documentos',
      tipo: 'procedimento',
      texto: [
        'CONDIÇÕES DE ACESSO (regra geral da legislação da segurança social): 60 anos de idade e pelo menos 180 meses (15 anos) de contribuições no INSS; ou, independentemente da idade, 420 meses (35 anos) de descontos ininterruptos.',
        'DOCUMENTOS (balcões do INSS e do SIAC): 1) Bilhete de Identidade original do segurado; 2) certificado de tempo de serviço emitido pelo(s) empregador(es); 3) certificado de remuneração do último ano, emitido pelo empregador; 4) modelo de requerimento próprio para pensão de velhice, preenchido no balcão.',
        'ONDE DAR ENTRADA: o pedido é formalizado PRESENCIALMENTE numa agência do INSS ou num balcão do SIAC — não é concluído apenas pela internet. Reunir os documentos numa pasta organizada antes de se deslocar.',
        'O VALOR da pensão depende da média dos últimos salários (salário de referência) e do total de anos de descontos — o cálculo exacto é feito pelo INSS no processo.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/inss',
    },
    {
      id: 'inss-inscricao-outros',
      titulo: 'Inscrição inicial e outros benefícios (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Como é feito o cadastro inicial (empresa e trabalhadores)? R: Numa agência do INSS ou balcão SIAC, com fotocópia do cartão de contribuinte fiscal da entidade empregadora, fotocópia do Bilhete de Identidade do gestor ou representante legal da empresa e fotocópia do BI dos trabalhadores a inscrever.',
        'Q: Quais os documentos para a PENSÃO DE SOBREVIVÊNCIA? R: Cópia ou certidão da sentença de fixação homologada de alimentos; certidão de nascimento dos descendentes do segurado; certificado escolar de frequência (ensino médio até aos 18 anos; até aos 25 anos se no ensino superior); atestado médico comprovativo de incapacidade para descendentes maiores de 18 anos.',
        'Q: E para o SUBSÍDIO DE ALEITAMENTO? R: Bilhete de Identidade original do(a) segurado(a); certidão de nascimento do filho ou declaração dos serviços de saúde/maternidade; se o pedido for do pai segurado, prova de casamento ou união de facto e Bilhete de Identidade do cônjuge.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.siac.gv.ao/pt/inss',
    },
  ],
};

// ============================================================================
// KB Ministério da Educação (MINED) — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Decreto Presidencial n.º 163/25 (Regulamento de homologação,
//    reconhecimento e equivalência de estudos) — texto via Angolex.
//  - Projecto SIMPLIFICA: reconhecimento de certificado do ensino secundário
//    do II ciclo — tabela de simplificação via Angolex.
// Angolex é repositório jurídico que reproduz diplomas oficiais (DR).
// ============================================================================



export const KB_MINED: KbInstituicaoLocal = {
  sigla: 'MINED',
  nome: 'Ministério da Educação',
  fontes: [
    {
      id: 'mined-equivalencia-dp163',
      titulo: 'Equivalência e reconhecimento de estudos — Decreto Presidencial n.º 163/25',
      tipo: 'regulamento',
      texto: [
        'O Decreto Presidencial n.º 163/25 aprovou o Regulamento sobre as regras e procedimentos de HOMOLOGAÇÃO, RECONHECIMENTO e concessão de EQUIVALÊNCIA de estudos da educação pré-escolar, do ensino primário e do ensino secundário.',
        'HOMOLOGAÇÃO: confirma a validade de atestados, declarações, certificados e diplomas emitidos em território nacional — para efeitos legais ou para a continuação de estudos NO EXTERIOR.',
        'RECONHECIMENTO: aplica-se a documentos escolares obtidos em sistemas educativos ESTRANGEIROS (educação pré-escolar, ensino primário, ensino secundário geral e técnico-profissional), para obter habilitações equivalentes do sistema angolano.',
        'EQUIVALÊNCIA: as instituições de ensino devem exigir ao aluno recém-chegado ao país a declaração de equivalência NO PRAZO DE ATÉ 30 DIAS após o processo de inscrição.',
        'Na prática, os processos pedem normalmente: documento escolar original devidamente autenticado (diploma/certificado), certificado de notas ou histórico escolar, documento de identificação, e — para documentos em língua estrangeira — legalização/apostila e tradução certificada para português. Confirmar os detalhes junto dos serviços provinciais do Ministério da Educação, com antecedência.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://angolex.com/paginas/decreto-presidencial/regras-e-procedimentos-para-homologacao-reconhecimento-e-concessao-de-equivalencia-de-estudos-163a-25a.html',
    },
    {
      id: 'mined-reconhecimento-ii-ciclo',
      titulo: 'Reconhecimento de certificado do ensino secundário (II ciclo) — procedimento simplificado',
      tipo: 'procedimento',
      texto: [
        'RECONHECIMENTO DE CERTIFICADO/DECLARAÇÃO DO ENSINO SECUNDÁRIO DO II CICLO (medida do Projecto SIMPLIFICA):',
        'REQUISITOS ACTUAIS: 1) declaração ou certificado original de estudo; 2) cópia do Bilhete de Identidade do estudante.',
        'O QUE FOI SIMPLIFICADO: foi eliminado o visto do Gabinete Provincial da Educação e da Direcção Municipal da Educação para o reconhecimento destes documentos, SALVO nos casos de continuidade de estudos no exterior do país — nesses casos continuam a intervir o Ministro da Educação e o Ministério das Relações Exteriores (MIREX).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://angolex.com/paginas/diversos/procedimento-de-reconhecimento-de-certificado-do-ensino-do-segundo-ciclo.html',
    },
  ],
};

// ============================================================================
// KB MINSA — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Portal oficial do Certificado Digital de Vacinação (vacina.gov.ao)
//  - Directório de ministérios do SEPE (contactos do MINSA)
// consultados em 2026-08-05. Conteúdo deliberadamente limitado ao que tem
// fonte — a assistente orientará o cidadão para a unidade sanitária nos
// temas clínicos (não há lista pública única de documentos por hospital).
// ============================================================================



export const KB_MINSA: KbInstituicaoLocal = {
  sigla: 'MINSA',
  nome: 'Ministério da Saúde',
  fontes: [
    {
      id: 'minsa-certificado-vacinacao',
      titulo: 'Certificado Digital de Vacinação — como obter no portal oficial',
      tipo: 'procedimento',
      texto: [
        'O Certificado Digital de Vacinação é obtido no portal oficial vacina.gov.ao: abrir a página do «Certificado Digital» e inserir o N.º do documento de identificação OU o Código Individual de vacinação atribuído quando se vacinou.',
        'DIVERGÊNCIAS: se os dados da vacina não coincidirem com os do cartão de vacinas, o próprio portal indica que se envie uma cópia do cartão.',
        'LINHAS DE ATENDIMENTO publicadas no portal: 930 795 019 e 948 477 028. Para TRANSCRIÇÃO DE VACINA administrada no estrangeiro: 930 795 019 (serviço só para utentes vacinados no estrangeiro).',
        'A vacinação de crianças e adultos é registada no cartão de vacinação; o cartão do MINSA acompanha o calendário nacional (por exemplo BCG, poliomielite, DTP, sarampo e febre amarela, além de doses para grávidas e mulheres em idade fértil).',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.vacina.gov.ao/certificado.aspx',
    },
    {
      id: 'minsa-contactos-orientacao',
      titulo: 'Contactos do MINSA e onde tratar documentos de saúde (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Onde fica o Ministério da Saúde? R: Rua 17 de Setembro, Luanda; telefone +244 222 338 052; site www.minsa.gov.ao (dados do directório de ministérios do SEPE).',
        'Q: Onde trato atestados médicos, junta médica ou declarações clínicas? R: Esses actos tramitam-se na unidade sanitária (hospital ou centro de saúde) onde o cidadão é assistido; os requisitos variam consoante a unidade — confirmar no próprio estabelecimento. Para atestado de condutor (carta de condução), o modelo usado é o «modelo 2» da Imprensa Nacional.',
        'Q: O atendimento nos hospitais públicos requer documentos? R: Levar sempre um documento de identificação (Bilhete de Identidade) e, quando existir, o cartão/boletim de vacinação ou boletim sanitário da unidade onde é seguido.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sepe.gov.ao/ao/gov/sepe/ministerios/detalhe/20/',
    },
  ],
};

// ============================================================================
// KB Conservatória do Registo Civil — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, da página oficial de
// serviços do Registo Civil no portal do Governo/SIAC:
//  https://siac.gov.ao/servico/registo-civil/ (consultado em 2026-08-05)
// ============================================================================



export const KB_REGCIVIL: KbInstituicaoLocal = {
  sigla: 'REGCIVIL',
  nome: 'Conservatória do Registo Civil',
  fontes: [
    {
      id: 'regcivil-nascimento-obito',
      titulo: 'Registo de nascimento e registo de óbito — documentos necessários',
      tipo: 'procedimento',
      texto: [
        'REGISTO DE NASCIMENTO (e passagem de boletim): presença dos progenitores, caso não sejam casados ou tenham documentos não averbados (se tiverem, apresentam o assento de casamento); Bilhete de Identidade, cédula pessoal ou certidão de nascimento dos pais, dentro do prazo de validade; cartão da maternidade, se houver; passaporte dos pais (se estrangeiros), dentro do prazo de validade; comprovativo do pagamento da taxa-emolumento.',
        'REGISTO DE ÓBITO: Bilhete de Identidade, cédula pessoal ou certidão de nascimento do falecido (original e cópia); certificado de óbito passado pelo médico (original e cópia); documento de identificação do declarante (Bilhete de Identidade, cédula pessoal ou carta de condução — original e cópia, dentro do prazo); comprovativo do pagamento da taxa-emolumento. Também existe via com boletim de óbito + comprovativo do emolumento.',
        'NOTA NUC: para registos feitos depois de Março de 2021, o boletim com o NUC (Número Único do Cidadão) substitui a certidão na emissão do Bilhete de Identidade.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/registo-civil/',
    },
    {
      id: 'regcivil-certidoes-actos',
      titulo: 'Certidões, filiação e actos especiais do Registo Civil',
      tipo: 'procedimento',
      texto: [
        'FILIAÇÃO (acrescentar filiação a um registo): Bilhete de Identidade (original), dentro do prazo de validade; cédula pessoal, boletim ou certidão de nascimento da pessoa que se quer filiar; se for adulta, necessita do consentimento da mesma; comprovativo do emolumento.',
        'ACTOS ESPECIAIS (por exemplo divórcio, rectificação ou averbamento de assento): requerimento com assinatura reconhecida por NOTÁRIO; conforme o acto, acrescentam-se peças como certidão de casamento, certidão de nascimento dos cônjuges, certidão de cópia integral, certidão passada pelo tribunal (divórcio com filhos menores), atestado de residência e Bilhete de Identidade (original e fotocópia, dentro do prazo).',
        'NATURALIZAÇÃO: requerimento com assinatura reconhecida por notário; certidão de nascimento; declaração emitida pelo Governo provincial; cartão de estrangeiro residente; fotocópia do passaporte dentro do prazo; todos os documentos em língua estrangeira devem estar traduzidos para português.',
        'Onde tratar: conservatórias, lojas dos registos e balcões do SIAC; requisitos por acto em siac.gov.ao, serviço «Conservatória do Registo Civil».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/registo-civil/',
    },
  ],
};

// ============================================================================
// KB SIAC — Etapa A / vaga-2 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono:
//  - Portal do SIAC (https://siac.gov.ao / https://www.siac.gv.ao)
//  - Ministério da Administração Pública, Trabalho e Segurança Social,
//    «Serviços disponíveis no SIAC», 26-09-2024 (maptss.gov.ao)
// ============================================================================



export const KB_SIAC: KbInstituicaoLocal = {
  sigla: 'SIAC',
  nome: 'Serviço Integrado de Atendimento ao Cidadão',
  fontes: [
    {
      id: 'siac-como-funciona',
      titulo: 'O que é o SIAC e como funciona o atendimento',
      tipo: 'faq',
      texto: [
        'Q: O que é o SIAC? R: O Serviço Integrado de Atendimento ao Cidadão — espaços que concentram cerca de 90 serviços públicos de 12 organismos no mesmo local, para o cidadão tratar de vários documentos numa só deslocação (portal siac.gov.ao e siac.gv.ao).',
        'Q: Como sou atendido? R: Ao chegar, tire uma SENHA e verifique junto do orientador de fluxo se a sua documentação está completa; para a área do Registo Civil existe antes uma triagem. O tempo de espera programado para o atendimento é de cerca de 5 minutos (segundo o MAPTSS, Setembro de 2024).',
        'Q: Onde encontro os documentos exigidos por cada serviço? R: No portal www.siac.gov.ao, por organismo/serviço (por exemplo Identificação Civil, Conservatória do Registo Civil, Trânsito/DTSER, SME, INSS, AGT). Os emolumentos costumam ser pagos com comprovativo emitido pelo BPC nos balcões do próprio SIAC.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.maptss.gov.ao/2024/09/26/servicos-disponiveis-no-siac/',
    },
    {
      id: 'siac-servicos-lista',
      titulo: 'Que serviços se tratam no SIAC (por organismo)',
      tipo: 'faq',
      texto: [
        'No mesmo espaço do SIAC o cidadão pode tratar, entre outros (MAPTSS, Set/2024):',
        'IDENTIFICAÇÃO E REGISTOS: registo civil, Bilhete de Identidade, certificado de registo criminal, actos notariais, certificado de admissibilidade de firma, registo de imóvel;',
        'TRÂNSITO: carta de condução (nova, renovação, duplicado), atribuição de matrícula, Título Único de Veículo;',
        'FISCALIDADE E EMPRESA: cartão de contribuinte e pagamento de impostos (AGT), obtenção de alvará comercial, registo geral de empresas;',
        'SEGURANÇA SOCIAL E TRABALHO: pensão de reforma, subsídio de maternidade (INSS), cadastramento nos centros de emprego;',
        'EXTERIOR: autenticação de documentos do Ministério das Relações Exteriores (ICAESC); serviços do SME (migração); área bancária e empresarial.',
        'Antes de se deslocar, confirmar os requisitos do serviço pretendido no portal siac.gov.ao — cada organismo tem a sua página de requisitos.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/',
    },
  ],
};

// ============================================================================
// KB SME — Etapa A / E2-E3 (2026-08-05)
// Conteúdo recolhido NA INTERNET a pedido do dono, de fontes oficiais:
//  - Portal do SME (https://www.sme.gov.ao e https://sme.minint.ao)
//  - Catálogo SME no portal do Governo (https://siac.gov.ao/servico/sme-migracao-e-estrangeiros/)
// consultados em 2026-08-05. Requisitos transcritos/resumidos tal como publicados.
// ============================================================================



export const KB_SME: KbInstituicaoLocal = {
  sigla: 'SME',
  nome: 'Serviço de Migração e Estrangeiros',
  fontes: [
    {
      id: 'sme-passaporte-requisitos',
      titulo: 'Passaporte — requisitos (normal, diplomático, segunda via e alteração de dados)',
      tipo: 'procedimento',
      texto: [
        'PASSAPORTE NORMAL: fotocópia a cores do Bilhete de Identidade (acompanhada do original), dentro do prazo de validade; três fotografias tipo passe, coloridas, recentes, com fundo branco; formulário devidamente preenchido com assinatura legível, disponível no portal da SME; comprovativo do pagamento da taxa-emolumento. Se o requerente reside no exterior, o comprovativo de residência no estrangeiro pode suprir a ausência do atestado de residência; se não exerce actividade remunerada, apresenta declaração de desemprego passada pela administração municipal.',
        'PASSAPORTE DIPLOMÁTICO: despacho de nomeação e/ou Diário da República ou termo de posse; fotografia tipo passe actualizada com fundo branco; comprovativo do pagamento da taxa-emolumento. PASSAPORTE DE SERVIÇO: via específica, com elementos-base indicados no portal da SME (cópia do BI no prazo de validade, três fotografias tipo passe coloridas com fundo branco).',
        'SEGUNDA VIA: fotocópia a cores do passaporte anterior (1.ª, 2.ª e última página) — em falta, a cópia do BI; norma dirigida ao SME em que o requerente se compromete a devolver o passaporte caso venha a encontrá-lo; comprovativo do pagamento da taxa-emolumento.',
        'ALTERAÇÃO DE DADOS (fisionomia ou estado civil): comprovativo da mudança a efectuar (BI com fisionomia ou estado civil actualizado, ou declaração de serviço); formulário do portal da SME preenchido; comprovativo do pagamento da taxa-emolumento.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://siac.gov.ao/servico/sme-migracao-e-estrangeiros/',
    },
    {
      id: 'sme-vistos-requisitos',
      titulo: 'Vistos de entrada em Angola — requisitos por tipo',
      tipo: 'procedimento',
      texto: [
        'ELEMENTOS COMUNS: formulário preenchido (obtido gratuitamente no portal da SME); fotografias tipo passe 4x5 cm, coloridas, recentes, fundo branco; passaporte válido e reconhecido pelas autoridades angolanas; comprovativo do pagamento do acto migratório.',
        'VISTO DE TURISMO: 2 fotografias; certificado internacional de vacinas; comprovativo de meios de subsistência nos termos da lei; declaração de compromisso de respeitar as leis da República de Angola.',
        'VISTO DE TRÂNSITO: 3 fotografias; comprovativo de ser titular de visto de entrada (ou isenção) no país de destino; bilhete de passagem para o país de destino; certificado internacional de vacinas.',
        'VISTO DE CURTA DURAÇÃO: 2 fotografias; bilhete de passagem para a República de Angola com retorno; certificado internacional de vacinas; comprovativo de meios de subsistência; documento comprovativo dos objectivos da entrada.',
        'VISTO DE TRABALHO: contrato de trabalho ou contrato-promessa de trabalho; certificado de habilitações literárias e profissionais autenticado e traduzido para português; curriculum vitae traduzido; certificado de registo criminal do país de origem ou residência habitual, traduzido e reconhecido; atestado médico do país de origem traduzido em português e devidamente reconhecido; parecer do Ministério da Administração Pública, Emprego e Segurança Social (instituições/empresas públicas) ou do órgão de tutela da actividade (instituições e empresas privadas).',
        'VISTO DE ESTUDO: certificado de registo criminal do país de origem ou residência habitual, traduzido e devidamente reconhecido; atestado médico do país de origem traduzido em português e reconhecido; comprovativo de meios de subsistência; entre outros, comprovativo da matrícula em estabelecimento de ensino devidamente reconhecido.',
        'As listas completas, por tipo de visto, estão em www.sme.gov.ao, secção Serviços > «Requisitos dos Actos Migratórios».',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://www.sme.gov.ao/estrangeiros/',
    },
    {
      id: 'sme-visto-online',
      titulo: 'Pedido de visto online — instruções oficiais (perguntas frequentes)',
      tipo: 'faq',
      texto: [
        'Q: Posso pedir o visto de entrada pela internet? R: Sim, através do portal da SME. Antes de iniciar o pedido, assegurar: 1) passaporte com validade mínima de UM ANO e pelo menos QUATRO páginas em branco; 2) fotografia recente com fundo branco, adequada a uso oficial; 3) todos os documentos originais de apoio exigidos para o tipo de visto pretendido.',
        'Q: Como envio os documentos? R: Os documentos são carregados no portal em imagens digitalizadas de boa qualidade, no formato .jpg/.jpeg, respeitando as dimensões mínimas/máximas e o tamanho máximo de ficheiro indicados nas instruções do portal (por exemplo, foto de cara com mínimo 496 px de altura e ficheiros até 200 KB).',
        'Q: O pedido online dispensa a ida ao consulado? R: NÃO. Mesmo aprovado o pedido pela internet, é obrigatório levar os documentos originais ao consulado para recolha de dados biométricos e entrevista, para fins de verificação.',
      ].join('\n'),
      atualizadoEm: '2026-08-05',
      fonteUrl: 'https://sme.minint.ao/ao/servicos/vistos/instrucoes/',
    },
  ],
};

// ============================================================================
// KB BNA / INACOM / INE / TS — Etapa A / E2-E3 VAGA-3 (2026-08-07,
// "Avanca todas" do dono). Conteúdo recolhido NA INTERNET de fontes oficiais:
//  - Portal do Consumidor Bancário do BNA (https://consumidorbancario.bna.ao)
//  - Portal do BNA (https://www.bna.ao)
//  - Portal do INACOM (https://inacom.gov.ao/contact e /single-services)
//  - Portal do INE (https://www.ine.gov.ao) e portal Censo 2024
//    (https://censo2024.ine.gov.ao)
//  - Portal do Tribunal Supremo (https://tribunalsupremo.ao)
// consultados em 2026-08-07. Siglas INE e TS só passaram a ser possíveis com
// a correspondência por PALAVRA (fronteiras de palavra) no motor — ver
// contemSiglaComoPalavra em aiDocumentoCore.ts.
// ============================================================================

export const KB_BNA: KbInstituicaoLocal = {
  sigla: 'BNA',
  nome: 'Banco Nacional de Angola',
  fontes: [
    {
      id: 'bna-reclamacoes-consumidor',
      titulo: 'Como reclamar contra instituições financeiras (Portal do Consumidor Bancário do BNA)',
      tipo: 'procedimento',
      texto: [
        'O consumidor de produtos e serviços financeiros tem o direito de reclamar sobre os serviços e produtos oferecidos pelas instituições financeiras, junto da área especializada em atendimento ao cliente da respectiva instituição ou DIRECTAMENTE junto do Departamento de Conduta Financeira do Banco Nacional de Angola, quando julgar que a conduta da instituição não é adequada ou lesa os seus interesses ou direitos (artigo 74.º da Lei n.º 12/15, de 17 de Junho).',
        'QUEM PODE RECLAMAR: qualquer pessoa singular ou colectiva que seja cliente de instituição financeira bancária ou não bancária sob supervisão do BNA.',
        'MOTIVOS: actividades das instituições sob supervisão do BNA ou a sua forma de actuação — na celebração de um contrato, na comercialização de um produto ou na prestação de um serviço.',
        'ONDE APRESENTAR: no balcão da instituição financeira; por carta; por telefone; no livro de reclamações; nas páginas electrónicas das instituições; ou directamente ao BNA — por carta dirigida ao Departamento de Conduta Financeira do BNA; telefone 222 679 244; e-mail reclamacoes@bna.ao; Portal do Consumidor consumidorbancario.bna.ao; carta às Delegações Regionais do BNA; WhatsApp 944 889 499 / 944 889 504.',
        'PREENCHIMENTO: o formulário deve ser claro e completo — é indispensável indicar a instituição reclamada, a identificação do reclamante e o seu contacto, e expor os factos de forma completa.',
        'PRAZOS: as instituições financeiras respondem às reclamações dentro dos prazos regulamentados pelo Aviso n.º 12/16, de 5 de Setembro, do BNA.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://consumidorbancario.bna.ao/',
    },
    {
      id: 'bna-provedoria-2instancia',
      titulo: 'Provedoria do Cliente Bancário — recurso depois da reclamação ao banco',
      tipo: 'procedimento',
      texto: [
        'Se o banco não responder nos prazos regulamentares (Aviso n.º 12/16 do BNA) ou se o cliente não ficar satisfeito com a resposta, pode recorrer ao PROVEDOR DO CLIENTE BANCÁRIO — segunda instância de resolução — com página própria: provedoriadoclientebancario.bna.ao.',
        'As políticas de gestão de reclamações dos bancos comerciais reconhecem que o cliente pode recorrer DIRECTAMENTE ao BNA, dispensando a precedência junto do banco — mas, na prática, reclamar primeiro ao banco (e guardar o número de registo da reclamação) acelera o processo.',
        'As reclamações também ajudam o BNA a identificar necessidades de intervenção no exercício da supervisão comportamental do sistema financeiro.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://www.bna.ao/',
    },
  ],
};

export const KB_INACOM: KbInstituicaoLocal = {
  sigla: 'INACOM',
  nome: 'Instituto Angolano das Comunicações',
  fontes: [
    {
      id: 'inacom-lac-reclamacoes',
      titulo: 'Linha de Apoio ao Consumidor 15555 e reclamações de telecomunicações',
      tipo: 'procedimento',
      texto: [
        'O INACOM (Instituto Angolano das Comunicações) é o instituto público criado para REGULAR, FISCALIZAR E SUPERVISIONAR o mercado das comunicações electrónicas e os serviços postais em Angola.',
        'LAC — LINHA DE APOIO AO CONSUMIDOR: ligue 15555 — chamada gratuita, todos os dias úteis, das 8h às 17h.',
        'RECLAMAÇÕES POR ESCRITO: e-mail reclamacao@inacom.gov.ao. E-mail geral: geral@inacom.gov.ao. Telefone da sede: +244 222 210 666.',
        'SEDE: Avenida Dr. António Agostinho Neto, nº 25, Zona C, Praia do Bispo, Cx. Postal 1459, Luanda.',
        'É ao INACOM que o cidadão recorre quando tem um conflito com a operadora (rede, facturação, serviço) que não conseguiu resolver directamente com ela.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://inacom.gov.ao/contact/',
    },
    {
      id: 'inacom-servicos-online',
      titulo: 'Serviços online do INACOM — registo de empresa (gratuito) e autorizações',
      tipo: 'procedimento',
      texto: [
        'REGISTO DE EMPRESA — GRATUITO: as empresas devem fazer um registo prévio no INACOM, ANTES de formularem pedidos de qualquer natureza junto do instituto.',
        'QUEM PODE USAR: empresas registadas em Angola, com NIF angolano válido.',
        'ETAPAS: preencher e submeter o formulário disponível no portal do INACOM (inacom.gov.ao), anexando os documentos nele indicados; o acesso faz-se pela área de serviços do portal.',
        'O portal tem ainda o serviço de AUTORIZAÇÃO DE COMERCIALIZAÇÃO: pedido submetido por formulário próprio no portal.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://inacom.gov.ao/single-services/',
    },
  ],
};

export const KB_INE: KbInstituicaoLocal = {
  sigla: 'INE',
  nome: 'Instituto Nacional de Estatística',
  fontes: [
    {
      id: 'ine-dados-oficiais',
      titulo: 'Onde obter dados estatísticos oficiais de Angola (INE)',
      tipo: 'faq',
      texto: [
        'O Instituto Nacional de Estatística (INE) é o órgão público angolano responsável pela informação estatística oficial da República de Angola — trabalha na dinamização, coordenação, recolha, tratamento e difusão dessa informação.',
        'PUBLICAÇÕES: o portal ine.gov.ao reúne boletins e publicações oficiais — resultados dos recenseamentos, inquéritos como o IDR (Inquérito de Despesas e Receitas), boletins de registo civil e Folhas de Informação Rápida (FIR), com descarga gratuita em PDF.',
        'APLICAÇÃO MÓVEL: a app «INE ANGOLA» (Android) permite visualizar, analisar e interpretar dados estatísticos de Angola.',
        'SEDE: Rua Ho Chi Min, nº 10, Luanda.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://www.ine.gov.ao/',
    },
    {
      id: 'ine-censo-2024',
      titulo: 'Censo 2024 — resultados definitivos e onde consultar',
      tipo: 'faq',
      texto: [
        'O Recenseamento Geral da População e Habitação (RGPH) 2024 apurou cerca de 36,6 MILHÕES de habitantes nas 21 províncias de Angola (resultados definitivos publicados pelo INE).',
        'RETRATO DO PAÍS: 65,7% da população vive em zona urbana; Luanda concentra 24% da população; 44,6% dos angolanos têm menos de 15 anos — a população mais jovem de África.',
        'ONDE CONSULTAR: o portal dedicado censo2024.ine.gov.ao disponibiliza o Relatório Geral em PDF e os Quadros Anexos em Excel por província (76 indicadores sobre população, habitação, energia, água e educação), com descarga livre.',
        'CONTACTO DO CENSO: censo@ine.gov.ao.',
        'REFERÊNCIA ANTERIOR: o Censo 2014 (momento censitário de 16 de Maio de 2014) apurou 25 789 024 pessoas, 63% em área urbana.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://censo2024.ine.gov.ao/',
    },
  ],
};

export const KB_TS: KbInstituicaoLocal = {
  sigla: 'TS',
  nome: 'Tribunal Supremo',
  fontes: [
    {
      id: 'ts-institucional-camaras',
      titulo: 'Tribunal Supremo — o que é, câmaras e contactos',
      tipo: 'faq',
      texto: [
        'O Tribunal Supremo é o órgão de cúpula da jurisdição comum em Angola. O seu portal oficial (tribunalsupremo.ao) foi criado para potenciar a proximidade ao cidadão, com transparência sobre o funcionamento da instância.',
        'ESTRUTURA: Plenário e câmaras especializadas — Câmara Criminal; Câmara do Cível, Administrativo, Fiscal e Aduaneiro; Câmara do Trabalho; Câmara Familiar.',
        'O QUE O PORTAL DIVULGA: distribuições dos processos, sessões de julgamento e decisões judiciais proferidas pelos Juízes Conselheiros, além de notícias e eventos do tribunal.',
        'CONTACTOS: telefone +244 222 339 079; e-mail geral@tribunalsupremo.ao; endereço Rua 17 de Setembro e Pinheiro Furtado, Cidade Alta, Luanda.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://tribunalsupremo.ao/',
    },
    {
      id: 'ts-jurisprudencia-consulta',
      titulo: 'Jurisprudência e acórdãos — consulta pública e gratuita no portal',
      tipo: 'procedimento',
      texto: [
        'A secção «Jurisprudência» do portal do Tribunal Supremo publica os ACÓRDÃOS organizados pelas câmaras (Criminal; Cível, Administrativo, Fiscal e Aduaneiro; Trabalho; Familiar), os SUMÁRIOS de acórdão e os acórdãos de UNIFORMIZAÇÃO DE JURISPRUDÊNCIA.',
        'A consulta é pública e gratuita e serve o cidadão e os mandatários que queiram conhecer as decisões e a orientação do tribunal; o portal tem ainda secções de Documentação — com Estudos Jurídicos e Legislação — e de Imprensa.',
        'O cidadão que precise de informação concreta sobre um processo seu deve dirigir-se à secretaria do tribunal onde o processo corre — o portal divulga a actividade e a jurisprudência do Tribunal Supremo, não o andamento individual de processos de outras instâncias.',
      ].join('\n'),
      atualizadoEm: '2026-08-07',
      fonteUrl: 'https://tribunalsupremo.ao/jurisprudencia/',
    },
  ],
};

// ============================================================================
// Agregado. ORDEM IMPORTA: o motor devolve o 1.º match por sigla contida no
// remetente — SIAC fica em ÚLTIMO de propósito: uma mensagem "SIAC — balcão
// SME/DNIRN" deve bater no organismo específico. (vaga-3: a sigla passou a
// ser correspondida por PALAVRA completa, o que tornou INE e TS seguros.)
// ============================================================================
export const KB_REGISTO: KbInstituicaoLocal[] = [
  KB_AGT,
  KB_BNA,
  KB_CISP,
  KB_DNIRN,
  KB_DTSER,
  KB_ENDE,
  KB_EPAL,
  KB_INACOM,
  KB_INAPEM,
  KB_INE,
  KB_INSS,
  KB_MINED,
  KB_MINSA,
  KB_REGCIVIL,
  KB_SME,
  KB_TS,
  KB_SIAC,
];
