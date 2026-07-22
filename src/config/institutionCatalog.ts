// ============================================================================
// Catálogo Institucional Partilhado — Correio Digital Angola
// ----------------------------------------------------------------------------
// Mapas de localização de Angola + tipos/geração de sigla, usados TANTO pela
// página Instituições da Área de Administração (popup Criar/Editar) COMO pelo
// formulário público "Registar Instituição" na página de Login.
// NÃO duplicar: qualquer alteração aqui reflecte-se nos dois lados.
// ============================================================================

export const MUNICIPALITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Todas': ['Todos'],
  'Bengo': ['Todos', 'Dande', 'Ambriz', 'Nambuangongo', 'Bula Atumba', 'Pango Aluquem'],
  'Icolo e Bengo': ['Todos', 'Icolo e Bengo', 'Cacabo', 'Kibala', 'Piri'],
  'Benguela': ['Todos', 'Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Chongorói', 'Bocoio', 'Caimbambo'],
  'Bié': ['Todos', 'Cuito', 'Cuatro', 'Chitembo', 'Andulo', 'Nharêa', 'Mucuma'],
  'Cabinda': ['Todos', 'Cabinda', 'Cacongo', 'Buco-Zau', 'Dembo'],
  'Cuando': ['Todos', 'Menongue', 'Cuchi', 'Cuangar', 'Cativos', 'Luchazes'],
  'Cubango': ['Todos', 'Cubango', 'Cunje', 'Mavinga', 'Nekiemba', 'Rivungo'],
  'Cuanza Norte': ['Todos', 'N\'Dalatando', 'Ambaca', 'Golungo Alto', 'Ngongui', 'Samba', 'Bula'],
  'Cuanza Sul': ['Todos', 'Sumbe', 'Libolo', 'Quibala', 'Cela', 'Mussende', 'Soyo'],
  'Cunene': ['Todos', 'Ondjiva', 'Cuanhama', 'Curoca', 'Namacunde', 'Ombadiya'],
  'Huambo': ['Todos', 'Huambo', 'Caála', 'Bailundo', 'Catchiungo', 'Londuimbale', 'Longonjo', 'Ecunha'],
  'Huíla': ['Todos', 'Lubango', 'Chibia', 'Humpata', 'Caconda', 'Kuvango', 'Matala', 'Caluquembe', 'Quilengues'],
  'Luanda': ['Todos', 'Viana', 'Belas', 'Cazenga', 'Cacuaco', 'Talatona', 'Ingombota', 'Maianga', 'Rangel', 'Kilamba Kiaxi'],
  'Lunda Norte': ['Todos', 'Dundo', 'Cambulo', 'Lóvua', 'Cuiloa', 'Zaire'],
  'Lunda Sul': ['Todos', 'Saurimo', 'Muconda', 'Laculo', 'Cacolo'],
  'Malanje': ['Todos', 'Malanje', 'Caculama', 'Quela', 'Mucari', 'Calandula', 'Cuaba', 'Marimba', 'Masseira'],
  'Moxico': ['Todos', 'Luena', 'Moxico', 'Luchico', 'Cameia', 'Luahadi'],
  'Moxico Leste': ['Todos', 'Luena', 'Lusavo', 'Mucunde', 'Lomelas'],
  'Namibe': ['Todos', 'Namibe', 'Tombwa', 'Virei', 'Bibala', 'Camucuio'],
  'Uíge': ['Todos', 'Uíge', 'Ambuila', 'Bungo', 'Damba', 'Macosine', 'Mucaba', 'Negage', 'Puri', 'Quimbo', 'Songo'],
  'Zaire': ['Todos', 'Mbanza Congo', 'SoYo', 'N\'Zeto', 'Tomboco', 'Cuimba', 'Musserra']
};

export const CITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Bengo': ['Caxito (Capital)', 'Dande', 'Ambriz', 'Nambuangongo'],
  'Icolo e Bengo': ['Icolo e Bengo (Sede)', 'Cacabo', 'Kibala'],
  'Benguela': ['Benguela (Capital)', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda'],
  'Bié': ['Cuito (Capital)', 'Chitembo', 'Andulo'],
  'Cabinda': ['Cabinda (Capital)', 'Lândana', 'Buco-Zau'],
  'Cuando': ['Menongue (Capital)', 'Cuchi', 'Cuangar', 'Cativos'],
  'Cubango': ['Cubango (Sede)', 'Cunje', 'Mavinga', 'Nekiemba'],
  'Cuanza Norte': ['N\'Dalatando (Capital)', 'Ambaca', 'Golungo Alto'],
  'Cuanza Sul': ['Sumbe (Capital)', 'Libolo', 'Quibala', 'Cela'],
  'Cunene': ['Ondjiva (Capital)', 'Cuanhama', 'Curoca'],
  'Huambo': ['Huambo (Capital)', 'Caála', 'Bailundo', 'Catchiungo'],
  'Huíla': ['Lubango (Capital)', 'Chibia', 'Humpata', 'Caconda', 'Kuvango'],
  'Luanda': ['Luanda (Capital)', 'Talatona', 'Belas', 'Cacuaco', 'Viana'],
  'Lunda Norte': ['Dundo (Capital)', 'Cambulo', 'Lóvua'],
  'Lunda Sul': ['Saurimo (Capital)', 'Muconda', 'Cacolo'],
  'Malanje': ['Malanje (Capital)', 'Caculama', 'Calandula', 'Mucari'],
  'Moxico': ['Luena (Capital)', 'Moxico', 'Cameia', 'Luchico'],
  'Moxico Leste': ['Luena (Sede)', 'Lusavo', 'Mucunde'],
  'Namibe': ['Namibe (Capital)', 'Tombwa', 'Virei', 'Bibala'],
  'Uíge': ['Uíge (Capital)', 'Ambuila', 'Damba', 'Negage', 'Macosine'],
  'Zaire': ['Mbanza Congo (Capital)', 'SoYo', 'N\'Zeto', 'Tomboco']
};

export const COMMUNES_BY_MUNICIPALITY: { [key: string]: string[] } = {
  // Bengo
  'Dande': ['Caxito Sede', 'Barra do Dande', 'Mabubas', 'Caxito'],
  'Ambriz': ['Ambriz Sede', 'Tabi', 'Bela Vista'],
  'Nambuangongo': ['Nambuangongo Sede', 'Cuimba', 'Sanza'],
  'Bula Atumba': ['Bula Atumba Sede', 'Mombelo'],
  'Pango Aluquem': ['Pango Aluquem Sede'],
  // Icolo e Bengo
  'Icolo e Bengo': ['Icolo e Bengo Sede', 'Cacavo', 'Quindenga'],
  'Cacabo': ['Cacabo Sede'],
  'Kibala': ['Kibala Sede'],
  'Piri': ['Piri Sede'],
  // Benguela
  'Benguela': ['Benguela Sede', 'Zona Comercial', 'Campito'],
  'Lobito': ['Lobito Sede', 'Canata', 'Egito Praia', 'Binga'],
  'Catumbela': ['Catumbela Sede', 'Biópio', 'Gama', ' Palmeirinha'],
  'Baía Farta': ['Baía Farta Sede', 'Dombe Grande', 'Lobito Novo'],
  'Ganda': ['Ganda Sede', 'Ekiemela', 'Ganda Velha'],
  'Chongorói': ['Chongorói Sede', 'Bvessa'],
  'Bocoio': ['Bocoio Sede', 'Caimbambo'],
  'Caimbambo': ['Caimbambo Sede', 'Muinho'],
  // Bié
  'Cuito': ['Cuito Sede', 'Catabola', 'Gonçalves'],
  'Cuatro': ['Cuatro Sede', 'M\'Bangala'],
  'Chitembo': ['Chitembo Sede', 'Chiaca'],
  'Andulo': ['Andulo Sede', 'Songo'],
  'Nharêa': ['Nharêa Sede', 'Cachingues'],
  'Mucuma': ['Mucuma Sede'],
  // Cabinda
  'Cabinda': ['Cabinda Sede', 'Malembo', 'Tando Zinze', 'M\'Boulou'],
  'Cacongo': ['Lândana Sede', 'Massabi', 'Dinge'],
  'Buco-Zau': ['Buco-Zau Sede', 'Inhuca', 'Luso'],
  'Dembo': ['Dembo Sede'],
  // Cuando
  'Menongue': ['Menongue Sede', 'Kama', 'Luangua', 'Longa'],
  'Cuchi': ['Cuchi Sede', 'M\'Begui'],
  'Cuangar': ['Cuangar Sede', 'Mucundi', 'Caconda'],
  'Cativos': ['Cativos Sede', 'Tchongue'],
  'Luchazes': ['Luchazes Sede', 'N\'Golo'],
  // Cubango
  'Cubango': ['Cubango Sede', 'Cangalo', 'Muculo'],
  'Cunje': ['Cunje Sede', 'Cuateke'],
  'Mavinga': ['Mavinga Sede', 'Caculuvar'],
  'Nekiemba': ['Nekiemba Sede'],
  'Rivungo': ['Rivungo Sede'],
  // Cuanza Norte
  'N\'Dalatando': ['N\'Dalatando Sede', 'Kacuso', 'Quixinge'],
  'Ambaca': ['Ambaca Sede', 'Banga'],
  'Golungo Alto': ['Golungo Alto Sede', 'Kibaxe'],
  'Ngongui': ['Ngongui Sede'],
  'Samba': ['Samba Sede', 'Lombe'],
  'Bula': ['Bula Sede'],
  // Cuanza Sul
  'Sumbe': ['Sumbe Sede', 'Gangasola'],
  'Libolo': ['Libolo Sede', 'Carianga'],
  'Quibala': ['Quibala Sede', 'Sanzala'],
  'Cela': ['Cela Sede', 'Cunda', 'Quilomosso'],
  'Mussende': ['Mussende Sede'],
  'Soyo': ['Soyo Sede'],
  // Cunene
  'Ondjiva': ['Ondjiva Sede', 'Humbe', 'Nehone'],
  'Cuanhama': ['Cuanhama Sede', 'Kaholo'],
  'Curoca': ['Curoca Sede', 'Otchinjau'],
  'Namacunde': ['Namacunde Sede', 'Evale'],
  'Ombadiya': ['Ombadiya Sede'],
  // Huambo
  'Huambo': ['Huambo Sede', 'Calima', 'Chipipa', 'Tchikala'],
  'Caála': ['Caála Sede', 'Londe', 'Sachie'],
  'Bailundo': ['Bailundo Sede', 'Hengue', 'Lunge', 'Chicala'],
  'Catchiungo': ['Catchiungo Sede', 'Kukeme'],
  'Londuimbale': ['Londuimbale Sede', 'Luangue'],
  'Longonjo': ['Longonjo Sede'],
  'Ecunha': ['Ecunha Sede', 'N\'Govo'],
  // Huíla
  'Lubango': ['Lubango Sede', 'Arimba', 'Hoque', 'N\'Gola'],
  'Chibia': ['Chibia Sede', 'Capunda Cavilongo'],
  'Humpata': ['Humpata Sede', 'Neves', 'M\'Copi'],
  'Caconda': ['Caconda Sede', 'Chicala'],
  'Kuvango': ['Kuvango Sede', 'Muceque'],
  'Matala': ['Matala Sede', 'Kuvala'],
  'Caluquembe': ['Caluquembe Sede'],
  'Quilengues': ['Quilengues Sede'],
  // Luanda
  'Viana': ['Viana Sede', 'Calumbo', 'Estalagem', 'Baia', 'Zango'],
  'Belas': ['Quenguela', 'Barra do Kwanza', 'Cabolombo', 'Loma'],
  'Cazenga': ['Cazenga Sede', 'Hoji ya Henda', 'Tala Hadi'],
  'Cacuaco': ['Cacuaco Sede', 'Kicolo', 'Funda', 'Mabangakola'],
  'Talatona': ['Talatona Sede', 'Benfica', 'Lar do Patriota', 'Morro da Cruz'],
  'Ingombota': ['Ingombota Sede', 'Patrice Lumumba', 'Maculusso', 'Ilha do Cabo'],
  'Maianga': ['Maianga Sede', 'Cassequel', 'Prenda', 'Rocha Pinto'],
  'Rangel': ['Rangel Sede', 'Mártires', 'Rossas'],
  'Kilamba Kiaxi': ['Kilamba Kiaxi Sede', 'Camama', 'Golfe'],
  'Luanda': ['Luanda Sede', 'Ingombota', 'Maianga', 'Rangel'],
  // Lunda Norte
  'Dundo': ['Dundo Sede', 'Luachimo', 'Chitato', 'Caxinde'],
  'Cambulo': ['Cambulo Sede', 'Luto'],
  'Lóvua': ['Lóvua Sede'],
  'Cuiloa': ['Cuiloa Sede'],
  // Lunda Sul
  'Saurimo': ['Saurimo Sede', 'Mona', 'Sassoma'],
  'Muconda': ['Muconda Sede'],
  'Laculo': ['Laculo Sede'],
  'Cacolo': ['Cacolo Sede'],
  // Malanje
  'Malanje': ['Malanje Sede', 'Mulanji', 'Quabe', 'Kibavuvuko'],
  'Caculama': ['Caculama Sede', 'Cangandala'],
  'Quela': ['Quela Sede', 'M\'Quema'],
  'Mucari': ['Mucari Sede', 'Caxito'],
  'Calandula': ['Calandula Sede', 'Cocaia'],
  'Cuaba': ['Cuaba Sede'],
  'Marimba': ['Marimba Sede'],
  'Masseira': ['Masseira Sede'],
  // Moxico
  'Luena': ['Luena Sede', 'Lukusse', 'Luvo'],
  'Moxico': ['Moxico Sede'],
  'Luchico': ['Luchico Sede'],
  'Cameia': ['Cameia Sede'],
  'Luahadi': ['Luahadi Sede'],
  // Moxico Leste
  'Lusavo': ['Lusavo Sede'],
  'Mucunde': ['Mucunde Sede'],
  'Lomelas': ['Lomelas Sede'],
  // Namibe
  'Namibe': ['Namibe Sede', 'Mocúti', 'Bela Vista'],
  'Tombwa': ['Tombwa Sede', 'Cinjama'],
  'Virei': ['Virei Sede', 'Cacimba'],
  'Bibala': ['Bibala Sede', 'Capangobe'],
  'Camucuio': ['Camucuio Sede'],
  // Uíge
  'Uíge': ['Uíge Sede', 'Cassuanga', 'Buanando'],
  'Ambuila': ['Ambuila Sede'],
  'Bungo': ['Bungo Sede', 'Cangola'],
  'Damba': ['Damba Sede'],
  'Macosine': ['Macosine Sede'],
  'Mucaba': ['Mucaba Sede'],
  'Negage': ['Negage Sede', 'Jombolandaka'],
  'Puri': ['Puri Sede'],
  'Quimbo': ['Quimbo Sede'],
  'Songo': ['Songo Sede'],
  // Zaire
  'Mbanza Congo': ['Mbanza Congo Sede', 'Kibala'],
  'SoYo': ['SoYo Sede', 'Nzeto'],
  'N\'Zeto': ['N\'Zeto Sede'],
  'Tomboco': ['Tomboco Sede', 'N\'Zadi'],
  'Cuimba': ['Cuimba Sede'],
  'Musserra': ['Musserra Sede']
};

export const INSTITUTION_TYPES = [
  'Ministério',
  'Instituto Público',
  'Administração Geral',
  'Serviço de Migração/Segurança',
  'Empresa Pública',
  'Gabinete Provincial',
  'Administração Municipal',
  'Administração Comunal'
];

export const mapTypeToCategory = (type: string): 'Finanças' | 'Infraestrutura' | 'Serviços' | 'Segurança' | 'Saúde' | 'Justiça' => {
  if (type === 'Administração Geral') return 'Finanças';
  if (type === 'Empresa Pública') return 'Infraestrutura';
  if (type === 'Serviço de Migração/Segurança') return 'Segurança';
  if (type === 'Ministério') return 'Justiça';
  if (type === 'Instituto Público') return 'Saúde';
  return 'Serviços';
};

export const generateSigla = (fullName: string): string => {
  const wordsToSkip = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para', 'em', 'público', 'pública'];
  const sigla = fullName
    .split(/\s+/)
    .filter(word => {
      const w = word.toLowerCase().replace(/[^a-z0-9áéíóúâêôãõç]/g, '');
      return w && !wordsToSkip.includes(w);
    })
    .map(word => (word[0] || ''))
    .join('')
    .toUpperCase();
  if (sigla.length >= 2) return sigla;
  return fullName.substring(0, 4).toUpperCase();
};
