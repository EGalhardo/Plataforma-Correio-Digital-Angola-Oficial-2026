/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Translation Service - Centralized translation cache that works with LanguageContext
 * This service stores dynamic AI translations and provides them to all components
 */

import { LanguageCode } from '../types';

export interface TranslationCache {
  [lang: string]: Record<string, string>;
}

// Static translation map from translator.ts
const STATIC_TRANSLATE_MAP: Record<string, Record<LanguageCode, string>> = {
  "Painel": { pt: "Painel", um: "Ondunge", ki: "Kikonde", kk: "Lulendo", ch: "Fungola", ng: "Mutende", kw: "Oshila", nh: "Okulula", fi: "Lusolo" },
  "Correio": { pt: "Correio", um: "Okanda", ki: "Mikanda", kk: "Nsamu", ch: "Chisinde", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
  "Contactos": { pt: "Contactos", um: "Omanu", ki: "Miji", kk: "Kangu", ch: "Atu", ng: "Vakwetu", kw: "Aantu", nh: "Ovanthu", fi: "Batu" },
  "Conta": { pt: "Conta", um: "Ombila", ki: "Mbandu", kk: "Nzo", ch: "Mufu", ng: "Mukulo", kw: "Omauyelele", nh: "Omuhonga", fi: "Nzila" },
  "Trabalhadores": { pt: "Trabalhadores", um: "Olowola", ki: "Upange", kk: "Kisalu", ch: "Vakaji", ng: "Vangaji", kw: "Anilonga", nh: "Ovilinga", fi: "Basadi" },
  "Equipa": { pt: "Equipa", um: "Olowola", ki: "Upange", kk: "Kisalu", ch: "Vakaji", ng: "Vangaji", kw: "Anilonga", nh: "Ovilinga", fi: "Basadi" },
  "QR Code": { pt: "QR Code", um: "Oloko QR", ki: "Kijimbu", kk: "Soneka", ch: "Chinyingika", ng: "Cinoneno", kw: "Endandeko", nh: "Okutaila", fi: "Dimbu" },
  "IA": { pt: "IA", um: "Olondunge", ki: "Kixilu", kk: "Lulendo", ch: "Ipupolo", ng: "Vihhande", kw: "Eendunge", nh: "Epupolo", fi: "Nzila-Lula" },
  "Instituições": { pt: "Instituições", um: "Ovingonjo", ki: "Vihandela", kk: "Nkenda", ch: "Mwenya", ng: "Vihandeka", kw: "Oshilongo", nh: "Omilandu", fi: "Mutinu" },
  "Correspondências": { pt: "Correspondências", um: "Olovikanda", ki: "Mikanda-Miji", kk: "Nsamu-Mia", ch: "Kusola-Atu", ng: "Mutende-Le", kw: "Ombila-Ha", nh: "Okanda-Ov", fi: "Mamboti-Lu" },
  "Cidadãos": { pt: "Cidadãos", um: "Omanu-Vet", ki: "Miji-Ki", kk: "Nkangu", ch: "Atu-Ch", ng: "Vakwetu-N", kw: "Aantu-O", nh: "Ovanthu-V", fi: "Batu-B" },
  "Relatórios": { pt: "Relatórios", um: "Okulula", ki: "Mukolo", kk: "Kinkulu", ch: "Kutambula", ng: "Kawa-Mu", kw: "Eindilo", nh: "Elau-Ov", fi: "Tukus" },
  "Auditoria": { pt: "Auditoria", um: "Olomono", ki: "Jimbidila", kk: "Landa-Ma", ch: "Kuhita", ng: "Kunona", kw: "Konaako", nh: "Okanda", fi: "Bisalu" },
  "Sair do Canal": { pt: "Sair do Canal", um: "Okutunda", ki: "Kutula", kk: "Kuna-Ni", ch: "Kuhita-M", ng: "Kushola", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
  "Olá": { pt: "Olá", um: "Ambeta", ki: "Mvidi", kk: "Mbote", ch: "Moyo", ng: "Mutende", kw: "Moro", nh: "Moro", fi: "Moyo" },
  "ÁREA DO CIDADÃO": { pt: "ÁREA DO CIDADÃO", um: "OCIPITO COMANU", ki: "MBANDU YOMBO", kk: "NKANGU MIA NZO", ch: "CHIPUTO CHIKATA", ng: "KILOMBA COMANU", kw: "OMAKWATHILO AANTU", nh: "OKULULA COVANTHU", fi: "MAMBOTI MA BATU" },
  "ADMINISTRAÇÃO CENTRAL": { pt: "ADMINISTRAÇÃO CENTRAL", um: "OVINGONJO VIOSHE", ki: "VIHANDELA VIOSO", kk: "NKENDA MIA NZO", ch: "MWENYA MWIZE", ng: "VIHANDEKA VYOSHE", kw: "OUPANGA WOSHI", nh: "OMILANDU VIOV", fi: "MUTINU MA BASA" },
  "INSTITUIÇÃO / PRIVADO": { pt: "INSTITUIÇÃO / PRIVADO", um: "OPANGE YETU", ki: "UPANGE WIJI", kk: "KISALU KIANU", ch: "UPANGE WASOLA", ng: "KISALU CHENU", kw: "IILONGA YENYE", nh: "OVOLA YO UPANGE", fi: "BISALU BIENO" },
  "Arquivos Processados": { pt: "Arquivos Processados", um: "Okanda Viapange", ki: "Mikanda-Upange", kk: "Nsamu-Mia-Ki", ch: "Mukanda-Asola", ng: "Mikando-Lelo", kw: "Iilonga-Mbala", nh: "Okanda-Ovilinga", fi: "Bisalu-Biame" },
  "Documentos Emitidos": { pt: "Documentos Emitidos", um: "Okanda Vialekise", ki: "Mikanda-Yatuku", kk: "Nsamu-Mia-Tula", ch: "Mukanda-Ahita", ng: "Mikando-Anona", kw: "Iilonga-Ayehe", nh: "Okanda-Okutula", fi: "Bisalu-Bitunu" },
  "Alertas Ativos": { pt: "Alertas Ativos", um: "Olondaka Viandola", ki: "Mikanda-Kiambot", kk: "Nsamu-Mia-Mamo", ch: "Mukanda-Chichin", ng: "Mikando-Lelev", kw: "Iilonga-Oshila", nh: "Okanda-Elau", fi: "Bisalu-Mbote" },
  "Nível de Segurança": { pt: "Nível de Segurança", um: "Okalo Kiotela", ki: "Mbandu-Kixilu", kk: "Nsamu-Mia-Lul", ch: "Mukanda-Ipupol", ng: "Mikando-Vihand", kw: "Iilonga-Eendun", nh: "Okanda-Epupol", fi: "Bisalu-Mutinu" },
  "Destaques & Novidades": { pt: "Destaques & Novidades", um: "Olondaka Vialekise", ki: "Mikanda-Yatuku", kk: "Nsamu-Mia-Tula", ch: "Mukanda-Ahita", ng: "Mikando-Anona", kw: "Iilonga-Ayehe", nh: "Okanda-Okutula", fi: "Bisalu-Bitunu" },
  "Correio Oficial": { pt: "Correio Oficial", um: "Olovikanda Vyofeka", ki: "Mikanda ya Thangu", kk: "Nsamu mia nzo", ch: "Chisinde chipema", ng: "Mikando ya kunda", kw: "Ombila yapongoka", nh: "Okanda kofuka", fi: "Mamboti mambote" },
  "Carteira Digital": { pt: "Carteira Digital", um: "Okanda Kosola", ki: "Mikanda-Upange", kk: "Nzo-Kinkulu", ch: "Mukanda-Asola", ng: "Mikando-Lelev", kw: "Iilonga-Ayehe", nh: "Okanda-Okutula", fi: "Bisalu-Bitunu" },
  "Solicitar Documento": { pt: "Solicitar Documento", um: "Olovalulo Okanda", ki: "Mutume Mikanda", kk: "Lomba o Nsamu", ch: "Kusola o Mukanda", ng: "Kulomba Mikando", kw: "Oshilonga shOmbila", nh: "Oityi tyOkanda", fi: "Lomba o Mukanda" },
  "Notificações": { pt: "Notificações", um: "Olovalulo", ki: "Mutume", kk: "Mbote", ch: "Kusola", ng: "Mutende", kw: "Omauyelele", nh: "Elau", fi: "Lukelelo" },
  "O que pretende consultar hoje?": { pt: "O que pretende consultar hoje?", um: "Nye olovola okutanga lelo?", ki: "Ixi ianda fila mumu lelo?", kk: "Nki nzila lomba lumbu kiaki?", ch: "Nki upange wasola kukukwasha?", ng: "Vikevi vyuma vyakunyingika?", kw: "Oshike handi ku kwatha nena?", nh: "Oityi handi kukuata lelo?", fi: "Nki lenda kusadisa mu lumbu?" },
  "Pesquisar correspondência oficial...": { pt: "Pesquisar correspondência oficial...", um: "Okusanga olovikanda vyofeka...", ki: "Kufila o mikanda yetu...", kk: "Moneka o nsamu muna nzila...", ch: "Kusola o mukanda wa nzo...", ng: "Kulomba mikando ya kunda...", kw: "Ombila ihapu yokuyandjeka...", nh: "Oityi tyokanda kofuka...", fi: "Lomba o mukanda wa luzolo..." },
  "PESQUISA POR VOZ": { pt: "PESQUISA POR VOZ", um: "OCIVALULO LONDUI", ki: "MUTUME LOHANJI", kk: "MBOTE MUNA NZILA", ch: "KUSOLA KAHANJI", ng: "MUTENDE LIKULI", kw: "OMAUYELELE KOHAPU", nh: "ELAU OVANTHU", fi: "LUKELO LUA LUZOLO" },
  "Ouvir Mensagem": { pt: "Ouvir Mensagem", um: "Okuyeva Ondaka", ki: "Kuwila Mikanda", kk: "Kuwa o Nsamu", ch: "Kuhanjika o Chisinde", ng: "Kutala Mikando", kw: "Okupulwa Ombila", nh: "Okuyeva Okanda", fi: "Kuwa Mamboti" },
  "Histórico de Atividade": { pt: "Histórico de Atividade", um: "Ovitambula Viapange", ki: "Mikanda-Upange", kk: "Nsamu-Mia", ch: "Mukanda-Asola", ng: "Mikando-Lelo", kw: "Iilonga-Mbala", nh: "Okanda-Ovilinga", fi: "Bisalu-Biame" },
  "ID Digital": { pt: "ID Digital", um: "Olukuandu Digital", ki: "Soneka Digital", kk: "Kijimbu Digital", ch: "Chinyingika Digital", ng: "Cinoneno Digital", kw: "Endandeko Digital", nh: "Okutaila Digital", fi: "Dimbu Digital" },
  "Cidadão Verificado": { pt: "Cidadão Verificado", um: "Cidadaô Oluku", ki: "Miji Kixilu", kk: "Nkangu Lulendo", ch: "Atu Ipupolo", ng: "Vakwetu Kinoneno", kw: "Aantu Eendunge", nh: "Ovanthu Epupolo", fi: "Batu Nzila-Lula" },
  "Agente AGT Verificado": { pt: "Agente AGT Verificado", um: "Agente AGT Oluku", ki: "Agente AGT Kixilu", kk: "Agente AGT Lulendo", ch: "Agente AGT Ipupolo", ng: "Agente AGT Kinoneno", kw: "Agente AGT Eendunge", nh: "Agente AGT Epupolo", fi: "Agente AGT Nzila-Lula" },
  "Agente {sigla} Verificado": { pt: "Agente {sigla} Verificado", um: "Agente {sigla} Oluku", ki: "Agente {sigla} Kixilu", kk: "Agente {sigla} Lulendo", ch: "Agente {sigla} Ipupolo", ng: "Agente {sigla} Kinoneno", kw: "Agente {sigla} Eendunge", nh: "Agente {sigla} Epupolo", fi: "Agente {sigla} Nzila-Lula" },
  "Não Lidas": { pt: "Não Lidas", um: "Kivatangile", ki: "Kianene", kk: "Kilembene", ch: "Kuhitepi", ng: "Kunonapi", kw: "Kakonako", nh: "Okanda-v", fi: "Busalamu" },
  "Ver Histórico": { pt: "Ver Histórico", um: "Okukala Ovitambula", ki: "Ver Fila o Upange", kk: "Tala o Kinkulu", ch: "Tala Kuhita", ng: "Vakula Kunona", kw: "Mona Iilonga", nh: "Tala Ovilinga", fi: "Nona Tukus" },
  "Instituições Conectadas": { pt: "Instituições Conectadas", um: "Ovingonjo Viame", ki: "Vihandela Vioso", kk: "Nkenda Mia Nzo", ch: "Mwenya Mwi", ng: "Vihandeka Vyoshe", kw: "Oshilongo Shasala", nh: "Omilandu Vyolola", fi: "Mutinu Ma Batu" },
  "Governação Electrónica": { pt: "Governação Electrónica", um: "Unviali Ofeka", ki: "Vihandela Thangu", kk: "Nsamu mia nzo", ch: "Chisinde chipema", ng: "Mikando ya kunda", kw: "Ombila yapongoka", nh: "Omuhonga kofuka", fi: "Mamboti ma mutinu" },
  "Abrir Pasta Digital": { pt: "Abrir Pasta Digital", um: "Yulula Okanda", ki: "Kwila Mikanda-Upange", kk: "Nzila-Kinkulu", ch: "Chinyingika Mukanda", ng: "Cinoneno-Lelev", kw: "Omauyelele eendunge", nh: "Okutaila-Ovilinga", fi: "Bumboti Nzila" },
  "Novas Mensagens": { pt: "Novas Mensagens", um: "Okanda Okali", ki: "Mikanda-Yatuku", kk: "Nsamu Mukali", ch: "Chisinde Chonene", ng: "Mikando Yayile", kw: "Ombila Ipe", nh: "Okanda Ohali", fi: "Bumboti Mukali" },
  "Documentos Ativos": { pt: "Documentos Ativos", um: "Okanda Viokala", ki: "Mikanda Miambot", kk: "Nsamu mia mbote", ch: "Chisinde chipema", ng: "Mikando ya kunda", kw: "Ombila yapongoka", nh: "Okanda kofuka", fi: "Mamboti mambote" },
  "Segurança CDA": { pt: "Segurança CDA", um: "Kotela CDA", ki: "Kixilu CDA", kk: "Lulendo CDA", ch: "Ipupolo CDA", ng: "Vihhande CDA", kw: "Eendunge CDA", nh: "Epupolo CDA", fi: "Nzila-Lula CDA" },
  "Ver Correspondências": { pt: "Ver Correspondências", um: "Tala Olovikanda", ki: "Tala Mikanda-Miji", kk: "Tala Nsamu-Mia", ch: "Tala Mukanda-Wa", ng: "Tala Mikando-Le", kw: "Tala Ombila-Ha", nh: "Tala Okanda-Ov", fi: "Tala Mamboti" },
  "Ocultar solicitações": { pt: "Ocultar solicitações", um: "Soleka Olondaka", ki: "Soleka Mikanda", kk: "Soleka Nsamu", ch: "Soleka Chisinde", ng: "Soleka Mikando", kw: "Soleka Ombila", nh: "Soleka Okanda", fi: "Soleka Mamboti" },
  "Ver solicitações": { pt: "Ver solicitações", um: "Tala Olondaka", ki: "Tala Mikanda", kk: "Tala Nsamu", ch: "Tala Chisinde", ng: "Tala Mikando", kw: "Tala Ombila", nh: "Tala Okanda", fi: "Tala Mamboti" },
  "Expedientes e Arquivos": { pt: "Expedientes e Arquivos", um: "Olovikanda Vyosola", ki: "Mikanda ya Thangu", kk: "Nsamu mia nzo", ch: "Chisinde chipema", ng: "Mikando ya kunda", kw: "Ombila yapongoka", nh: "Okanda kofuka", fi: "Mamboti mambote" },
  "Facturas Recebidas": { pt: "Facturas Recebidas", um: "Olombongo Vialondola", ki: "Fila Mikanda", kk: "Nsamu mia Lomba", ch: "Chisinde wasola", ng: "Mikando ya kunona", kw: "Ombila yapongoka", nh: "Okanda kofuka", fi: "Mamboti mambote" },
  "novos arquivados": { pt: "novos arquivados", um: "okali viakuta", ki: "miiji yatuku", kk: "mia tula kia", ch: "mukanda-ahita", ng: "mikando anona", kw: "ombila yapongoka", nh: "kofuka konda", fi: "bitunu mukali" },
  "faturas aguardando pagamento": { pt: "faturas aguardando pagamento", um: "olombongo via lenda", ki: "upange mhandu", kk: "nsamu mia mbote", ch: "asola mutumbula", ng: "vakula mufunda", kw: "imbila yonene", nh: "okanda kutyila", fi: "mamboti mapunda" },
  "Submeter Documento": { pt: "Submeter Documento", um: "Tuma Okanda", ki: "Mutume Mikanda", kk: "Lomba o Kisalu", ch: "Kuhana o Mukanda", ng: "Submeter Mikando", kw: "Ombila Ipe", nh: "Oityi tyOkanda", fi: "Lomba o Mukanda" },
  "mensagens por ler": { pt: "mensagens por ler", um: "olondaka vyotanga", ki: "mikanda-upange", kk: "nsamu wa vanga Kia", ch: "chisinde wakala", ng: "mikando vya kunda", kw: "ombila ihapu", nh: "okanda kofuka", fi: "bumboti buame" },
  "Nova Mensagem": { pt: "Nova Mensagem", um: "Okanda Okali", ki: "Mikanda-Yatuku", kk: "Nsamu Mukali", ch: "Chisinde Chonene", ng: "Mikando Yayile", kw: "Ombila Ipe", nh: "Okanda Ohali", fi: "Bumboti Mukali" },
  "Lidas": { pt: "Lidas", um: "Viapua", ki: "Kixilu", kk: "Lulendo", ch: "Ipupolo", ng: "Vihhande", kw: "Eendunge", nh: "Epupolo", fi: "Nzila-Lula" },
  "Enviadas": { pt: "Enviadas", um: "Viatumwa", ki: "Yatuku", kk: "Mia-Tula", ch: "Ahita", ng: "Anona", kw: "Ayehe", nh: "Okutula", fi: "Bitunu" },
  "Arquivadas": { pt: "Eliminadas", um: "Vilundulwi", ki: "Kiambot", kk: "Mamo", ch: "Chichin", ng: "Lelev", kw: "Oshila", nh: "Elau", fi: "Mbote" },
  "Lida": { pt: "Lida", um: "Yapua", ki: "Kixilu", kk: "Lulendo", ch: "Ipupolo", ng: "Vihhande", kw: "Eendunge", nh: "Epupolo", fi: "Nzila-Lula" },
  "Não Lida": { pt: "Não Lida", um: "Kavapuyile", ki: "Koki Kixilu", kk: "Kota Lulendo", ch: "Ingila Ipupolo", ng: "Nyingila Vihhande", kw: "Iñila Eendunge", nh: "Okutyila Epupolo", fi: "Kota Nzila-Lula" },
  "Arquivada": { pt: "Eliminada", um: "Yalundululwa", ki: "Kiambot", kk: "Mamo", ch: "Chichin", ng: "Lelev", kw: "Oshila", nh: "Elau", fi: "Mbote" },
  "Pendente": { pt: "Pendente", um: "Kevelela", ki: "Kitegam", kk: "Soneka-na", ch: "Kungila", ng: "Lelema", kw: "Mutende-na", nh: "Omatola", fi: "Ndaka" },
  "Pago": { pt: "Pago", um: "Futwa", ki: "Futua", kk: "Tufu", ch: "Kufuta", ng: "Futila", kw: "Futa", nh: "Okufuta", fi: "Futis" },
  "Vencido": { pt: "Vencido", um: "Yapitsuka", ki: "Ivi", kk: "Kia-Bi", ch: "Chizub", ng: "Suka", kw: "Yiya", nh: "Okusuka", fi: "Nene" },
  "Em processamento": { pt: "Em processamento", um: "Oku taluka", ki: "Ulingil", kk: "Salumun", ch: "Tachika", ng: "Landula", kw: "Tula", nh: "Okulinga", fi: "Salako" },
  "A carregar plataforma oficial...": { pt: "A carregar plataforma oficial...", um: "Oku sandili ondjila...", ki: "Kwila o upange ualulendo...", kk: "Kisalu kia tula...", ch: "Chinyingika upange...", ng: "Vangaji mikando...", kw: "Anilonga ombila...", nh: "Okutaila ovilinga...", fi: "Batu nzila lula..." },
  "O seu novo endereço digital oficial": { pt: "O seu novo endereço digital oficial", um: "Olonjango vyene vyokali", ki: "Soneka ya thangu yakali", kk: "Nzila yakali ya nzo", ch: "Chisinde chonene chipema", ng: "Mikando yayile yoshe", kw: "Ombila ipe yapongoka", nh: "Okanda ohali kofuka", fi: "Bumboti mukali mbote" },
  "Cidadão": { pt: "Cidadão", um: "Cidadaô", ki: "Miji", kk: "Nkangu", ch: "Atu", ng: "Vakwetu", kw: "Aanitu", nh: "Ovanthu", fi: "Batu" },
  "Instituição": { pt: "Instituição", um: "Ocingonjo", ki: "Vihandela", kk: "Nkenda", ch: "Mwenya", ng: "Vihandeka", kw: "Oshilongo", nh: "Omilandu", fi: "Mutinu" },
  "Admin": { pt: "Admin", um: "Ondunge-Copi", ki: "Nkuluntu", kk: "Mbuta", ch: "Mwata", ng: "Mwene", kw: "Omuhona", nh: "Omuhonga", fi: "Mutinu" },
  "Login": { pt: "Login", um: "Iñila", ki: "Koki", kk: "Kota", ch: "Ingila", ng: "Nyingila", kw: "Iñila", nh: "Okutyila", fi: "Kota" },
  "Número de Agente": { pt: "Número de Agente", um: "Ondandeko Yagente", ki: "Inamba ya Agente", kk: "Talu kia Agente", ch: "Chinyingika cha Agente", ng: "Cinoneno cha Agente", kw: "Endandeko la Agente", nh: "Okutaila kuAgente", fi: "Dimbu dia Agente" },
  "Número de BI de Cidadão": { pt: "Número de BI de Cidadão", um: "Ondandeko yo BI", ki: "Inamba ya BI ya Miji", kk: "Talu kia BI", ch: "Chinyingika cha BI", ng: "Cinoneno cha BI", kw: "Endandeko la BI", nh: "Okutaila kuBI", fi: "Dimbu dia BI" },
  "Senha de Acesso": { pt: "Senha de Acesso", um: "Onjila Yakuta", ki: "Soneka ya Koki", kk: "Soneka ya Kota", ch: "Chitanga cha Ingila", ng: "Cinoneno cha Nyingila", kw: "Endandeko la Iñila", nh: "Okutaila kuOkutyila", fi: "Dimbu dia Kota" },
  "Entrar com BI e Senha": { pt: "Entrar com BI e Senha", um: "Iñila lo BI lo Ombila", ki: "Koki ye BI ye Soneka", kk: "Kota ye BI ye Soneka", ch: "Ingila ne BI ne Chitanga", ng: "Nyingila ne BI ne Cinoneno", kw: "Iñila lo BI lo Endandeko", nh: "Okutyila la BI la Okutaila", fi: "Kota ye BI ye Dimbu" },
  "Correio Digital": { pt: "Correio Digital", um: "Okanda Kosola", ki: "Mikanda-Upange", kk: "Nzo-Kinkulu", ch: "Mukanda-Asola", ng: "Mikando-Lelev", kw: "Iilonga-Ayehe", nh: "Okanda-Okutula", fi: "Bisalu-Bitunu" },
  "Validação QR": { pt: "Validação QR", um: "Oloko QR", ki: "Kijimbu", kk: "Soneka", ch: "Chinyingika", ng: "Cinoneno", kw: "Endandeko", nh: "Okutaila", fi: "Dimbu" },
  "CIDADÃO / REQUERENTE": { pt: "CIDADÃO / REQUERENTE", um: "OMANU/MUTUME", ki: "MIJI/KIXILU", kk: "NKANGU", ch: "ATU", ng: "VAKWETU", kw: "AANTU", nh: "OVANTHU", fi: "BATU" },
  "ÓRGÃO EMISSOR": { pt: "ÓRGÃO EMISSOR", um: "OVINGONJO", ki: "VIHANDELA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "TIPO DE DOCUMENTO / ASSUNTO": { pt: "TIPO DE DOCUMENTO / ASSUNTO", um: "OKANDA", ki: "KIXILU", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "CONTEÚDO / DETALHE": { pt: "CONTEÚDO / DETALHE", um: "KILUVISU", ki: "KIXILU", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "PRAZO DE VALIDADE": { pt: "PRAZO DE VALIDADE", um: "EKUNO", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "EMISSÃO (HORA / DATA)": { pt: "EMISSÃO (HORA / DATA)", um: "EKUNO", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "NÍVEL DE RESTRIÇÃO": { pt: "NÍVEL DE RESTRIÇÃO", um: "EKUNO", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "AÇÕES": { pt: "AÇÕES", um: "VIAMO", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "EXPIRA": { pt: "EXPIRA", um: "EKUNO", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "REQUERIMENTO DE CERTIDÃO": { pt: "REQUERIMENTO DE CERTIDÃO", um: "OLOVALULO", ki: "MUTUME", kk: "MBOTE", ch: "KUSOLA", ng: "MUTENDE", kw: "OMAUYELELE", nh: "ELAU", fi: "LUKELELO" },
  "PROVA DE VIDA DIGITAL": { pt: "PROVA DE VIDA DIGITAL", um: "OKANDA", ki: "KIXILU", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "VideoAtendimento": { pt: "VideoAtendimento", um: "Okondavideo", ki: "Kixilu Kivideo", kk: "Soneka ya Video", ch: "Chinyingika ya Video", ng: "Cinoneno ya Video", kw: "Endandeko ya Video", nh: "Okutaila ya Video", fi: "Dimbu ya Video" },
  "VIDEOATENDIMENTO": { pt: "VIDEOATENDIMENTO", um: "OKONDAVIDEO", ki: "KIXILU KIVIDEO", kk: "SONEKA YA VIDEO", ch: "CHINYINGIKA YA VIDEO", ng: "CINONENO YA VIDEO", kw: "ENDANDEKO YA VIDEO", nh: "OKUTAILA YA VIDEO", fi: "DIMBU YA VIDEO" },
  "ANALISAR DOCUMENTO": { pt: "ANALISAR DOCUMENTO", um: "TALA OKANDA", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "ABRIR DOCUMENTO": { pt: "ABRIR DOCUMENTO", um: "YULULA OKANDA", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  // Common dynamic strings that need AI translation fallback
  "Pagamento Pendente IPU": { pt: "Pagamento Pendente IPU", um: "Ofutila IPU Kevela", ki: "Futua IPU Mbandu", kk: "Tufu IPU Soneka", ch: "Kufuta IPU Kungila", ng: "Futila IPU Lelema", kw: "Futa IPU Mutende", nh: "Okufuta IPU Omatola", fi: "Futis IPU Ndaka" },
  "Levantamento de BI": { pt: "Levantamento de BI", um: "Tambula BI yotepa", ki: "Yatuku BI Mbandu", kk: "Tula BI Soneka", ch: "Kusola BI Ipupolo", ng: "Kunona BI Kinoneno", kw: "Endandeko BI", nh: "Okutaila BI", fi: "Dimbu BI" },
  "Fatura de Energia": { pt: "Fatura de Energia", um: "Fatura Energia", ki: "Fila Energia", kk: "Nsamu Energia", ch: "Chisinde Energia", ng: "Mikando Energia", kw: "Ombila Energia", nh: "Okanda Energia", fi: "Mamboti Energia" },
  "Factura de Energia": { pt: "Factura de Energia", um: "Fatura Energia", ki: "Fila Energia", kk: "Nsamu Energia", ch: "Chisinde Energia", ng: "Mikando Energia", kw: "Ombila Energia", nh: "Okanda Energia", fi: "Mamboti Energia" },
  "Factura e Ajuste de Consumo": { pt: "Factura e Ajuste de Consumo", um: "Fatura lo Olovingonjo", ki: "Fila ye Vihandela", kk: "Nsamu ye Nkenda", ch: "Chisinde ne Mwenya", ng: "Mikando ne Vihandeka", kw: "Ombila yapongoka", nh: "Okanda kofuka", fi: "Mamboti mambote" },
  "Notificação Judicial": { pt: "Notificação Judicial", um: "Olovalulo Judicial", ki: "Mutume Judicial", kk: "Mbote Judicial", ch: "Kusola Judicial", ng: "Mutende Judicial", kw: "Omauyelele Judicial", nh: "Elau Judicial", fi: "Lukelelo Judicial" },
  "Resultado Clínico": { pt: "Resultado Clínico", um: "Osangi Hospital", ki: "Kixilu Hospital", kk: "Lulendo Hospital", ch: "Ipupolo Hospital", ng: "Vihhande Hospital", kw: "Eendunge Hospital", nh: "Epupolo Hospital", fi: "Nzila Hospital" },
  "Auditoria Fiscal Geral": { pt: "Auditoria Fiscal Geral", um: "Olomono AGT", ki: "Jimbidila AGT", kk: "Landa AGT", ch: "Kuhita AGT", ng: "Kunona AGT", kw: "Konaako AGT", nh: "Okanda AGT", fi: "Bisalu AGT" },
  "Sem Documentos Registados": { pt: "Sem Documentos Registados", um: "Kaviakuta Okanda", ki: "Kia miiji", kk: "Kia nkenda", ch: "Kia mwenya", ng: "Kia vihandeka", kw: "Kia oshilongo", nh: "Kia omilandu", fi: "Kia mutinu" },
  "Sem Facturas Emitidas": { pt: "Sem Facturas Emitidas", um: "Kaviakuta Fatura", ki: "Kia fila", kk: "Kia nsamu", ch: "Kia chisinde", ng: "Kia mikando", kw: "Kia ombila", nh: "Kia okanda", fi: "Kia mamboti" },
  "Todas as Cobranças & Facturas Recebidas": { pt: "Todas as Cobranças & Facturas Recebidas", um: "Yonso Yombongo", ki: "Yonso Fila", kk: "Yonso Nsamu", ch: "Yonso Chisinde", ng: "Yonso Mikando", kw: "Yonso Ombila", nh: "Yonso Okanda", fi: "Yonso Mamboti" },
  "Cobranças & Facturas Recebidas": { pt: "Cobranças & Facturas Recebidas", um: "Yombongo", ki: "Fila", kk: "Nsamu", ch: "Chisinde", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Mamboti" },
  "Repositório de Documentos": { pt: "Repositório de Documentos", um: "Okanda Viosha", ki: "Mikanda Vioso", kk: "Nsamu Mia Nzo", ch: "Mukanda Asola", ng: "Mikando Lelev", kw: "Iilonga Ayehe", nh: "Okanda Okutula", fi: "Bisalu Bitunu" },
  "Expediente de Entrada": { pt: "Expediente de Entrada", um: "Okanda Viyo", ki: "Mikanda Viyo", kk: "Nsamu Viyo", ch: "Mukanda Viyo", ng: "Mikando Viyo", kw: "Iilonga Viyo", nh: "Okanda Viyo", fi: "Mamboti Viyo" },
  "Pasta Digital de Documentos Homologados": { pt: "Pasta Digital de Documentos Homologados", um: "Okanda Kosola", ki: "Mikanda Upange", kk: "Nzo Kinkulu", ch: "Mukanda Asola", ng: "Mikando Lelev", kw: "Iilonga Ayehe", nh: "Okanda Okutula", fi: "Bisalu Bitunu" },
  "Gestão unificada de liquidações": { pt: "Gestão unificada de liquidações", um: "Unviali Wosha", ki: "Upange Wosha", kk: "Nkenda Wosha", ch: "Mwenya Wosha", ng: "Vihandeka Vyolola", kw: "Oshilongo Shasala", nh: "Omilandu Vyolola", fi: "Mutinu Ma Batu" },
  "Gestão ativa de liquidações": { pt: "Gestão ativa de liquidações", um: "Unviali Wa", ki: "Upange Wa", kk: "Nkenda Wa", ch: "Mwenya Wa", ng: "Vihandeka Wa", kw: "Oshilongo Wa", nh: "Omilandu Wa", fi: "Mutinu Wa" },
  "Liquidada": { pt: "Liquidada", um: "Yafutwa", ki: "Yafutua", kk: "Tufu", ch: "Kufuta", ng: "Futila", kw: "Futa", nh: "Okufuta", fi: "Futis" },
  "Aguardando": { pt: "Aguardando", um: "Kevela", ki: "Kitegam", kk: "Soneka-na", ch: "Kungila", ng: "Lelema", kw: "Mutende-na", nh: "Omatola", fi: "Ndaka" },
  "Liquidar Fatura Agora": { pt: "Liquidar Fatura Agora", um: "Futwa Fatura Lelo", ki: "Futua Fila Lelo", kk: "Tufu Nsamu Lelo", ch: "Kufuta Chisinde Lelo", ng: "Futila Mikando Lelo", kw: "Futa Ombila Lelo", nh: "Okufuta Okanda Lelo", fi: "Futis Mamboti Lelo" },
  "IMPOSTO PREDIAL URBANO": { pt: "IMPOSTO PREDIAL URBANO", um: "OTAXA YOKUTAMA", ki: "TAX KIXILU", kk: "TAX NKENDA", ch: "TAX MWENYA", ng: "TAX VIHANDEKA", kw: "TAX OSHILONGO", nh: "TAX OMILANDU", fi: "TAX MUTINU" },
  "EMOLUMENTOS REGISTO": { pt: "EMOLUMENTOS REGISTO", um: "OTAXA YOKUSALA", ki: "TAX KUSALA", kk: "TAX NKENDA", ch: "TAX MWENYA", ng: "TAX VIHANDEKA", kw: "TAX OSHILONGO", nh: "TAX OMILANDU", fi: "TAX MUTINU" },
  "TAXA MODERADORA": { pt: "TAXA MODERADORA", um: "OTAXA", ki: "TAX", kk: "TAX", ch: "TAX", ng: "TAX", kw: "TAX", nh: "TAX", fi: "TAX" },
  "PRÉ-PAGO LUANDA": { pt: "PRÉ-PAGO LUANDA", um: "PRÉ-PAGO LUANDA", ki: "PRÉ-PAGO LUANDA", kk: "PRÉ-PAGO LUANDA", ch: "PRÉ-PAGO LUANDA", ng: "PRÉ-PAGO LUANDA", kw: "PRÉ-PAGO LUANDA", nh: "PRÉ-PAGO LUANDA", fi: "PRÉ-PAGO LUANDA" },
  "CONSUMO RESIDENCIAL DE ÁGUA": { pt: "CONSUMO RESIDENCIAL DE ÁGUA", um: "OKANDA KOSOLA", ki: "MIKANDA UPANGE", kk: "NZO KINKULU", ch: "MUKANDA ASOLA", ng: "MIKANDO LELEV", kw: "IILONGA AYEHE", nh: "OKANDA OKUTULA", fi: "BISALU BITUNU" },
  "PAGAR FATURA": { pt: "PAGAR FATURA", um: "FUTWA FATURA", ki: "FUTUA FILA", kk: "TUFU NSAMU", ch: "KUFUTA CHISINDE", ng: "FUTILA MIKANDO", kw: "FUTA OMBILA", nh: "OKUFUTA OKANDA", fi: "FUTIS MAMBOTI" },
  "VER DOCUMENTO": { pt: "VER DOCUMENTO", um: "TALA OKANDA", ki: "KITEKAMA", kk: "NKENDA", ch: "MWENYA", ng: "VIHANDEKA", kw: "OSHILONGO", nh: "OMILANDU", fi: "MUTINU" },
  "Não possui faturas emitidas": { pt: "Não possui faturas emitidas", um: "Kaviakuta fatura", ki: "Kia fila", kk: "Kia nsamu", ch: "Kia chisinde", ng: "Kia mikando", kw: "Kia ombila", nh: "Kia okanda", fi: "Kia mamboti" },
  "Nenhum documento localizado": { pt: "Nenhum documento localizado", um: "Kaviakuta okanda", ki: "Kia miiji", kk: "Kia nkenda", ch: "Kia mwenya", ng: "Kia vihandeka", kw: "Kia oshilongo", nh: "Kia omilandu", fi: "Kia mutinu" },
  // ---- Melhoria de cobertura (2026-08-17): labels comuns de interface ----
  "Perfil": { pt: "Perfil", um: "Ovipala", ki: "Kixala", kk: "Kinkulu", ch: "Kufunga", ng: "Mukalo", kw: "Oshilongwa", nh: "Omuhonga", fi: "Nzila" },
  "Online": { pt: "Online", um: "Okuya", ki: "Kwenda", kk: "Kwiza", ch: "Kuyenda", ng: "Kuyenda", kw: "Okukala", nh: "Okukala", fi: "Kwiza" },
  "Offline": { pt: "Offline", um: "Okuvua", ki: "Kutula", kk: "Kutula", ch: "Kuhita", ng: "Kunona", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
  "Mensagem": { pt: "Mensagem", um: "Ondaka", ki: "Mikanda", kk: "Nsamu", ch: "Chisinde", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
  "Documento": { pt: "Documento", um: "Okanda", ki: "Mukanda", kk: "Nsamu", ch: "Mukanda", ng: "Mikando", kw: "Ombila", nh: "Okanda", fi: "Bisalu" },
  "Pesquisar": { pt: "Pesquisar", um: "Okusanga", ki: "Kufila", kk: "Moneka", ch: "Kusola", ng: "Kulomba", kw: "Yandjeka", nh: "Oityi", fi: "Lomba" },
  "Voltar": { pt: "Voltar", um: "Okutunda", ki: "Kutula", kk: "Kuna", ch: "Kuhita", ng: "Kushola", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
  "Cancelar": { pt: "Cancelar", um: "Okutunda", ki: "Kutula", kk: "Kuna-Ni", ch: "Kuhita-M", ng: "Kushola", kw: "Okushoka", nh: "Okutyi", fi: "Maboti" },
  "Enviar": { pt: "Enviar", um: "Okutuma", ki: "Kutuma", kk: "Kutuma", ch: "Kutuma", ng: "Kutuma", kw: "Okutuma", nh: "Okutuma", fi: "Tuma" },
  "Fechar": { pt: "Fechar", um: "Okuvala", ki: "Kujikila", kk: "Kujikila", ch: "Kujikila", ng: "Kunona", kw: "Okupula", nh: "Okupula", fi: "Fila" },
  "Confirmar": { pt: "Confirmar", um: "Okutavela", ki: "Kutavela", kk: "Kutavela", ch: "Kutavela", ng: "Kutavela", kw: "Okutavela", nh: "Okutavela", fi: "Tavela" },
  "Editar": { pt: "Editar", um: "Okulandula", ki: "Kulandula", kk: "Kulandula", ch: "Kulandula", ng: "Kulandula", kw: "Okulandula", nh: "Okulandula", fi: "Landula" },
  "Eliminar": { pt: "Eliminar", um: "Okupuka", ki: "Kupuka", kk: "Kupuka", ch: "Kupuka", ng: "Kunona", kw: "Okukonakona", nh: "Okukonakona", fi: "Kona" },
  "Guardar": { pt: "Guardar", um: "Okusonga", ki: "Kusonga", kk: "Kusonga", ch: "Kusonga", ng: "Kusonga", kw: "Okusonga", nh: "Okusonga", fi: "Songa" },
  "Carregar": { pt: "Carregar", um: "Okutwala", ki: "Kutwala", kk: "Kutwala", ch: "Kutwala", ng: "Kutwala", kw: "Okutwala", nh: "Okutwala", fi: "Twala" },
  "Abrir": { pt: "Abrir", um: "Okuyulula", ki: "Kuyulula", kk: "Kuyulula", ch: "Kuyulula", ng: "Kuyulula", kw: "Okuyulula", nh: "Okuyulula", fi: "Yulula" },
  "Todas": { pt: "Todas", um: "Ovio", ki: "Vioso", kk: "Moso", ch: "Moso", ng: "Vioshe", kw: "Ayehe", nh: "Oveho", fi: "Bioso" },
  "Aprovado": { pt: "Aprovado", um: "Okusokela", ki: "Kusokela", kk: "Kusokela", ch: "Kusokela", ng: "Kusokela", kw: "Okusokela", nh: "Okusokela", fi: "Sokela" },
  "Rejeitado": { pt: "Rejeitado", um: "Okutunda", ki: "Kutunda", kk: "Kutunda", ch: "Kutunda", ng: "Kutunda", kw: "Okutunda", nh: "Okutunda", fi: "Tunda" },
  "Em análise": { pt: "Em análise", um: "Okuyova", ki: "Kuyova", kk: "Kuyova", ch: "Kuyova", ng: "Kuyova", kw: "Okuyova", nh: "Okuyova", fi: "Yova" },
  "Ver mais": { pt: "Ver mais", um: "Tala ovio", ki: "Tala vioso", kk: "Tala moso", ch: "Tala moso", ng: "Vakula vioshe", kw: "Mona ayehe", nh: "Tala oveho", fi: "Nona bioso" },
  "Estado": { pt: "Estado", um: "Okalo", ki: "Mbandu", kk: "Nsamu", ch: "Kufunga", ng: "Kisalu", kw: "Oshipala", nh: "Ovitu", fi: "Nzila" },
  "Assunto": { pt: "Assunto", um: "Ondaka", ki: "Kinkulu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
  "Data": { pt: "Data", um: "Esiku", ki: "Kizuwa", kk: "Lumbu", ch: "Kizuwa", ng: "Kizuwa", kw: "Esiku", nh: "Esiku", fi: "Lumbu" },
  "Remetente": { pt: "Remetente", um: "Okutuma", ki: "Kutuma", kk: "Kutuma", ch: "Kutuma", ng: "Kutuma", kw: "Okutuma", nh: "Okutuma", fi: "Tuma" },
  "Destinatário": { pt: "Destinatário", um: "Okutambula", ki: "Kutambula", kk: "Kutambula", ch: "Kutambula", ng: "Kutambula", kw: "Okutambula", nh: "Okutambula", fi: "Tambula" },
  "Responder": { pt: "Responder", um: "Okuyula", ki: "Kuyula", kk: "Kuyula", ch: "Kuyula", ng: "Kuyula", kw: "Okuyula", nh: "Okuyula", fi: "Yula" },
  "Arquivar": { pt: "Arquivar", um: "Okusonga", ki: "Kusonga", kk: "Kusonga", ch: "Kusonga", ng: "Kusonga", kw: "Okusonga", nh: "Okusonga", fi: "Songa" },
  "Prioridade": { pt: "Prioridade", um: "Okalo", ki: "Mbandu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
  "Categoria": { pt: "Categoria", um: "Ovikalo", ki: "Mbandu", kk: "Nsamu", ch: "Chisinde", ng: "Mutende", kw: "Ombila", nh: "Okanda", fi: "Bumboti" },
  // ---- Melhoria de cobertura (2026-08-17): detalhes de documento e segurança ----
  "Número do Documento": { pt: "Número do Documento", um: "Epandu lyokanda", ki: "Numbu ya mukanda", kk: "Nsamu ya nzo", ch: "Numbu ya mukanda", ng: "Numbu ya mikando", kw: "Omukanda", nh: "Onumbu yokanda", fi: "Numbu ya mukanda" },
  "NÚMERO DO DOCUMENTO": { pt: "NÚMERO DO DOCUMENTO", um: "EPANDU LYOKANDA", ki: "NUMBU YA MUKANDA", kk: "NSAMU YA NZO", ch: "NUMBU YA MUKANDA", ng: "NUMBU YA MIKANDO", kw: "OMUKANDA", nh: "ONUMBU YOKANDA", fi: "NUMBU YA MUKANDA" },
  "Código Digital": { pt: "Código Digital", um: "Elaka Digital", ki: "Kimbu Digital", kk: "Soneka Digital", ch: "Chinyingika Digital", ng: "Cinoneno Digital", kw: "Endandeko Digital", nh: "Okutaila Digital", fi: "Dimbu Digital" },
  "CÓDIGO DIGITAL": { pt: "CÓDIGO DIGITAL", um: "ELAKA DIGITAL", ki: "KIMBU DIGITAL", kk: "SONEKA DIGITAL", ch: "CHINYINGIKA DIGITAL", ng: "CINONENO DIGITAL", kw: "ENDANDEKO DIGITAL", nh: "OKUTAILA DIGITAL", fi: "DIMBU DIGITAL" },
  "Titular": { pt: "Titular", um: "Omwene", ki: "Mwene", kk: "Mfumu", ch: "Mwenya", ng: "Mwene", kw: "Omwene", nh: "Omwene", fi: "Mwene" },
  "TITULAR": { pt: "TITULAR", um: "OMWENE", ki: "MWENE", kk: "MFUMU", ch: "MWENYA", ng: "MWENE", kw: "OMWENE", nh: "OMWENE", fi: "MWENE" },
  "Resumo Inteligente (IA)": { pt: "Resumo Inteligente (IA)", um: "Olondunge viokanda", ki: "Kixilu kia mikanda", kk: "Lulendo lua nsamu", ch: "Ipupolo ya mukanda", ng: "Vihhande vya mikando", kw: "Eendunge dhombila", nh: "Epupolo lyokanda", fi: "Nzila-Lula ya mukanda" },
  "Certificação": { pt: "Certificação", um: "Okutavela", ki: "Kutavela", kk: "Kutavela", ch: "Kutavela", ng: "Kutavela", kw: "Okutavela", nh: "Okutavela", fi: "Tavela" },
  "Validade Jurídica Total": { pt: "Validade Jurídica Total", um: "Okalo kokola", ki: "Kisalu kia ntoto", kk: "Nsamu ya kinkulu", ch: "Kufunga kwa mutu", ng: "Kisalu kya kukola", kw: "Oshilongwa shaushili", nh: "Ovitu vyokola", fi: "Nzila ya kolo" },
  "Registo de Protocolo": { pt: "Registo de Protocolo", um: "Okala protocolo", ki: "Mbandu protocolo", kk: "Nsamu protocolo", ch: "Kufunga protocolo", ng: "Kisalu protocolo", kw: "Oshipala protocolo", nh: "Omuhonga protocolo", fi: "Nzila protocolo" },
  "Core Digital Ativo": { pt: "Core Digital Ativo", um: "Ondunge yole", ki: "Kixilu kia lumbu", kk: "Lulendo lua lelo", ch: "Ipupolo ya lelo", ng: "Vihhande vya lelo", kw: "Eendunge dha lelo", nh: "Epupolo lyo lelo", fi: "Nzila-Lula ya lelo" },
  "ID Interno": { pt: "ID Interno", um: "Olukuandu lokala", ki: "Soneka mbandu", kk: "Kijimbu kia nzo", ch: "Chinyingika kufunga", ng: "Cinoneno kisalu", kw: "Endandeko oshilongwa", nh: "Okutaila omuhonga", fi: "Dimbu nzila" },
  "Nº Protocolo": { pt: "Nº Protocolo", um: "Nº Protocolo", ki: "Nº Protocolo", kk: "Nº Protocolo", ch: "Nº Protocolo", ng: "Nº Protocolo", kw: "Nº Protocolo", nh: "Nº Protocolo", fi: "Nº Protocolo" },
  "Instituição Emissora": { pt: "Instituição Emissora", um: "Ovingonjo viotuma", ki: "Vihandela viatuma", kk: "Nkenda mia tuma", ch: "Mwenya ya tuma", ng: "Vihandeka vyotuma", kw: "Oshilongo shotuma", nh: "Omilandu votuma", fi: "Mutinu ma tuma" },
  "Data de Emissão": { pt: "Data de Emissão", um: "Esiku lyotuma", ki: "Kizuwa kia tuma", kk: "Lumbu lua tuma", ch: "Kizuwa kya tuma", ng: "Kizuwa kya tuma", kw: "Esiku lyotuma", nh: "Esiku lyotuma", fi: "Lumbu lua tuma" },
  "Hora de Emissão": { pt: "Hora de Emissão", um: "Ola yotuma", ki: "Ola kia tuma", kk: "Ola lua tuma", ch: "Ola kya tuma", ng: "Ola kya tuma", kw: "Ola yotuma", nh: "Ola yotuma", fi: "Ola lua tuma" },
  "Responsável": { pt: "Responsável", um: "Okutwala", ki: "Kutwala", kk: "Kutwala", ch: "Kutwala", ng: "Kutwala", kw: "Okutwala", nh: "Okutwala", fi: "Twala" },
  "Data Limite": { pt: "Data Limite", um: "Esiku lyokule", ki: "Kizuwa kia kule", kk: "Lumbu lua kule", ch: "Kizuwa kya kule", ng: "Kizuwa kya kule", kw: "Esiku lyokule", nh: "Esiku lyokule", fi: "Lumbu lua kule" },
  "Referência de Arquivo": { pt: "Referência de Arquivo", um: "Ondaka yokala", ki: "Kimbu kia kusonga", kk: "Nsamu ya kusonga", ch: "Chinyingika kusonga", ng: "Cinoneno kusonga", kw: "Endandeko okusonga", nh: "Okutaila okusonga", fi: "Dimbu songa" },
  "Localização Formal do Arquivo": { pt: "Localização Formal do Arquivo", um: "Ovitu viokanda", ki: "Kixala kia mukanda", kk: "Kinkulu kia nsamu", ch: "Kufunga kwa mukanda", ng: "Kisalu kya mikando", kw: "Oshilongwa shombila", nh: "Omuhonga yokanda", fi: "Nzila ya mukanda" },
  "Hash de Integridade (SHA-256)": { pt: "Hash de Integridade (SHA-256)", um: "Hash yokola (SHA-256)", ki: "Hash kia ntoto (SHA-256)", kk: "Hash kia kolo (SHA-256)", ch: "Hash kya kolo (SHA-256)", ng: "Hash kya kolo (SHA-256)", kw: "Hash shokolo (SHA-256)", nh: "Hash vyokola (SHA-256)", fi: "Hash ya kolo (SHA-256)" },
  "Emitido por": { pt: "Emitido por", um: "Otumwa na", ki: "Tumwa na", kk: "Tumwa na", ch: "Tumwa na", ng: "Tumwa na", kw: "Otumwa na", nh: "Otumwa na", fi: "Tumwa na" },
  "Estado do Documento": { pt: "Estado do Documento", um: "Okalo kokanda", ki: "Mbandu kia mukanda", kk: "Nsamu kia nzo", ch: "Kufunga kwa mukanda", ng: "Kisalu kya mikando", kw: "Oshipala shombila", nh: "Ovitu vyokanda", fi: "Nzila ya mukanda" },
  "Validado Via QR": { pt: "Validado Via QR", um: "Okuyova QR", ki: "Kuyova QR", kk: "Kuyova QR", ch: "Kuyova QR", ng: "Kuyova QR", kw: "Okuyova QR", nh: "Okuyova QR", fi: "Yova QR" },
  "100% Autêntico": { pt: "100% Autêntico", um: "100% Okola", ki: "100% Kia ntoto", kk: "100% Kia kolo", ch: "100% Kya kolo", ng: "100% Kya kolo", kw: "100% Shokolo", nh: "100% Vyokola", fi: "100% Ya kolo" },
  "Palavra-passe actual": { pt: "Palavra-passe actual", um: "Efutilo lyole", ki: "Mbandu kia futila", kk: "Nsamu kia futila", ch: "Kufunga kwa futila", ng: "Kisalu kya futila", kw: "Oshipala shofutila", nh: "Ovitu vyofutila", fi: "Nzila ya futila" },
  "Nova palavra-passe": { pt: "Nova palavra-passe", um: "Efutilo liohe", ki: "Mbandu kia hima", kk: "Nsamu kia hima", ch: "Kufunga kwa hima", ng: "Kisalu kya hima", kw: "Oshipala shohima", nh: "Ovitu vyohima", fi: "Nzila ya hima" },
  "Confirmar nova": { pt: "Confirmar nova", um: "Okutavela ehe", ki: "Kutavela hima", kk: "Kutavela hima", ch: "Kutavela hima", ng: "Kutavela hima", kw: "Okutavela hima", nh: "Okutavela hima", fi: "Tavela hima" },
  "Palavra-passe inicial": { pt: "Palavra-passe inicial", um: "Efutilo lyotete", ki: "Mbandu kia tete", kk: "Nsamu kia tete", ch: "Kufunga kwa tete", ng: "Kisalu kya tete", kw: "Oshipala shotete", nh: "Ovitu vyotete", fi: "Nzila ya tete" },
  "Logótipo Institucional": { pt: "Logótipo Institucional", um: "Oloko ovingonjo", ki: "Kimbu vihandela", kk: "Soneka nkenda", ch: "Chinyingika mwenya", ng: "Cinoneno vihandeka", kw: "Endandeko oshilongo", nh: "Okutaila omilandu", fi: "Dimbu mutinu" },
  "Defina a sua Palavra-passe Pessoal": { pt: "Defina a sua Palavra-passe Pessoal", um: "Tunga efutilo lyove", ki: "Tunga mbandu kiave", kk: "Tunga nsamu kiave", ch: "Tunga kufunga kwa ve", ng: "Tunga kisalu kya ve", kw: "Tunga oshilongwa shove", nh: "Tunga ovitu vyove", fi: "Tunga nzila yove" },
};

// Dynamic cache that will be populated by the LanguageContext via API
let dynamicCache: TranslationCache = {};

// Load dynamic cache from localStorage on startup
export function initTranslationCache(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const saved = localStorage.getItem('cda_dynamic_translation_cache');
    if (saved) {
      dynamicCache = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load translation cache:', e);
    dynamicCache = {};
  }
}

// Update the dynamic cache (called by LanguageContext)
export function updateDynamicCache(lang: LanguageCode, translations: Record<string, string>): void {
  if (lang !== 'pt') {
    dynamicCache[lang] = { ...(dynamicCache[lang] || {}), ...translations };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cda_dynamic_translation_cache', JSON.stringify(dynamicCache));
      } catch (e) {
        console.warn('Failed to save translation cache:', e);
      }
    }
  }
}

// Get all cached translations for a language
export function getDynamicTranslations(lang: LanguageCode): Record<string, string> {
  return dynamicCache[lang] || {};
}

// Main translation function that checks both static and dynamic translations
export function translateText(text: string, lang: LanguageCode): string {
  if (!text) return "";
  
  const trimmed = text.trim();
  
  // If language is Portuguese, return original
  if (lang === 'pt') return text;
  
  // 1. Check static TRANSLATE_MAP
  const staticTranslation = STATIC_TRANSLATE_MAP[trimmed];
  if (staticTranslation && staticTranslation[lang]) {
    return staticTranslation[lang];
  }
  
  // 2. Check dynamic cache (AI translations)
  const langCache = dynamicCache[lang];
  if (langCache && langCache[trimmed]) {
    return langCache[trimmed];
  }
  
  // 3. Try partial matching in static map
  for (const [key, translations] of Object.entries(STATIC_TRANSLATE_MAP)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) && translations[lang]) {
      return trimmed.replace(new RegExp(key, 'gi'), translations[lang]);
    }
  }
  
  // 4. Try partial matching in dynamic cache
  if (langCache) {
    for (const [key, translatedValue] of Object.entries(langCache)) {
      if (trimmed.toLowerCase().includes(key.toLowerCase())) {
        return trimmed.replace(new RegExp(key, 'gi'), translatedValue);
      }
    }
  }
  
  return text;
}

// Clear translation cache
export function clearTranslationCache(): void {
  dynamicCache = {};
  localStorage.removeItem('cda_dynamic_translation_cache');
}

// Initialize on module load
initTranslationCache();