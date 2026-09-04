// ============================================================================
// Catálogo Institucional Partilhado — Correio Digital Angola
// ----------------------------------------------------------------------------
// Divisão Político-Administrativa de Angola
// Lei n.º 14/24 de 5 de setembro de 2024, vigente desde 01/01/2025
// 21 províncias | 326 municípios | 378 comunas
// Ícolo e Bengo é PROVÍNCIA INDEPENDENTE desde 2025 (não município de Luanda)
// Zango 0-5 e Centralidade 8000 pertencem ao município de Calumbo (Ícolo e Bengo)
//
// Mapas de localização de Angola + tipos/geração de sigla, usados TANTO pela
// página Instituições da Área de Administração (popup Criar/Editar) COMO pelo
// formulário público "Registar Instituição" na página de Login.
// NÃO duplicar: qualquer alteração aqui reflecte-se nos dois lados.
// ============================================================================

export const MUNICIPALITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Todas': ['Todos'],
  
  // Bengo (12 municípios)
  'Bengo': ['Todos', 'Ambriz', 'Barra do Dande', 'Bula Atumba', 'Dande', 'Dembos', 'Muxaluando', 'Nambuangongo', 'Pango Aluquém', 'Piri', 'Quibaxe', 'Quicunzo', 'Úcua'],
  
  // Benguela (23 municípios)
  'Benguela': ['Todos', 'Babaera', 'Baía Farta', 'Balombo', 'Benguela', 'Biópio', 'Bocoio', 'Bolonguera', 'Caimbambo', 'Canhamela', 'Capupa', 'Catengue', 'Catumbela', 'Chicuma', 'Chila', 'Chindumbo', 'Chongorói', 'Cubal', 'Dombe Grande', 'Egito Praia', 'Ganda', 'Iambala', 'Lobito', 'Navegantes'],
  
  // Bié (19 municípios)
  'Bié': ['Todos', 'Andulo', 'Belo Horizonte', 'Calucinga', 'Camacupa', 'Cambândua', 'Catabola', 'Chicala', 'Chinguar', 'Chipeta', 'Chitembo', 'Cuemba', 'Cuíto', 'Cunhinga', 'Luando', 'Lúbia', 'Mumbué', 'Nharêa', 'Ringoma', 'Umpulo'],
  
  // Cabinda (10 municípios)
  'Cabinda': ['Todos', 'Belize', 'Buco-Zau', 'Cabinda', 'Cacongo', 'Liambo', 'Massabi', 'Miconje', 'Necuto', 'Ngoio', 'Tando Zinze'],
  
  // Cuando (9 municípios)
  'Cuando': ['Todos', 'Cuito Cuanavale', 'Dima', 'Dirico', 'Luengue', 'Luiana', 'Mavinga', 'Mucusso', 'Rivungo', 'Xipundo'],
  
  // Cuanza Norte (17 municípios)
  'Cuanza Norte': ['Todos', 'Aldeia Nova', 'Ambaca', 'Banga', 'Bolongongo', 'Caculo Cabaça', 'Cambambe', 'Cazengo', 'Cerca', 'Golungo Alto', 'Lucala', 'Luinga', 'Massangano', 'Ngonguembo', 'Quiculungo', 'Samba Caju', 'Tango', 'Terreiro'],
  
  // Cuanza Sul (24 municípios)
  'Cuanza Sul': ['Todos', 'Amboim', 'Cassongue', 'Cela', 'Conda', 'Ebo', 'Libolo', 'Mussende', 'Porto Amboim', 'Quibala', 'Quilenda', 'Seles', 'Sumbe', 'Calinga', 'Cassoneca', 'Cavunge', 'Cubal', 'Dala', 'Gangasola', 'Kissanga', 'Limbolo', 'Longa', 'Mumbondo', 'Quirimbo'],
  
  // Cubango (11 municípios)
  'Cubango': ['Todos', 'Caiundo', 'Calai', 'Chinguanja', 'Cuangar', 'Cuchi', 'Cutato', 'Longa', 'Mavengue', 'Nancova', 'Savate', 'Xipundo'],
  
  // Cunene (14 municípios)
  'Cunene': ['Todos', 'Cahama', 'Cuanhama', 'Curoca', 'Cuvelai', 'Namacunde', 'Ombadja', 'Chicumbi', 'Evale', 'Kahama', 'Kuroka', 'Mukolongolo', 'Naulila', 'Ondjiva'],
  
  // Huambo (17 municípios)
  'Huambo': ['Todos', 'Bailundo', 'Cachiungo', 'Caála', 'Ecunha', 'Huambo', 'Londuimbali', 'Longonjo', 'Mungo', 'Chicala-Choloanga', 'Chinjenje', 'Ucuma', 'Chipipa', 'Hengue', 'Kaliro', 'Kueka', 'Lunge'],
  
  // Huíla (23 municípios)
  'Huíla': ['Todos', 'Caconda', 'Cacula', 'Caluquembe', 'Chiange', 'Chibia', 'Chicomba', 'Chipindo', 'Cuvango', 'Humpata', 'Jamba', 'Lubango', 'Matala', 'Quilengues', 'Quipungo', 'Capunda', 'Chicuaque', 'Chilata', 'Chioco', 'Cuvuio', 'Jamba Mineira', 'Luvemba', 'Mumbundo'],
  
  // Ícolo e Bengo (7 municípios) — PROVÍNCIA INDEPENDENTE desde 01/01/2025
  'Ícolo e Bengo': ['Todos', 'Bom Jesus', 'Cabiri', 'Calumbo', 'Cabo Ledo', 'Catete', 'Quiçama', 'Sequele'],
  
  // Luanda (16 municípios) — Ícolo e Bengo NÃO está aqui
  'Luanda': ['Todos', 'Belas', 'Cacuaco', 'Cazenga', 'Hoji-ya-Henda', 'Ingombota', 'Kilamba', 'Kilamba Kiaxi', 'Maianga', 'Mulenvos', 'Mussulo', 'Quissama', 'Rangel', 'Sambizanga', 'Samba', 'Talatona', 'Viana'],
  
  // Lunda Norte (19 municípios)
  'Lunda Norte': ['Todos', 'Cambulo', 'Capenda-Camulemba', 'Caungula', 'Chitato', 'Cuango', 'Cuílo', 'Lóvua', 'Lubalo', 'Lucapa', 'Xá-Muteba', 'Cacolo', 'Cuilo', 'Lubango', 'Luchazi', 'Muvulenge', 'Nhinga', 'Quitapa', 'Xinge'],
  
  // Lunda Sul (14 municípios)
  'Lunda Sul': ['Todos', 'Cacolo', 'Dala', 'Muconda', 'Saurimo', 'Muangueji', 'Cazage', 'Congo', 'Dala', 'Kokulo', 'Luma-Cassai', 'Munhango', 'Xinge', 'Xá-Cassai'],
  
  // Malanje (27 municípios)
  'Malanje': ['Todos', 'Cacuso', 'Calandula', 'Cambundi-Catembo', 'Cangandala', 'Caombo', 'Cuaba Nzoji', 'Cunda-Dia-Baze', 'Luquembo', 'Malanje', 'Marimba', 'Massango', 'Mucari', 'Quela', 'Quirima', 'Banga', 'Cambo', 'Cangozo', 'Cangombe', 'Capunda', 'Cariango', 'Cunda', 'Kibala', 'Kissama', 'Kiwaba Nzogi', 'Lombe', 'Mufunza'],
  
  // Moxico (12 municípios)
  'Moxico': ['Todos', 'Alto Zambeze', 'Bundas', 'Camanongue', 'Léua', 'Luau', 'Luacano', 'Luchazes', 'Cameia', 'Moxico', 'Luena', 'Lumbala-Nguimbo', 'Lumeji'],
  
  // Moxico Leste (9 municípios)
  'Moxico Leste': ['Todos', 'Cazombo', 'Cameia', 'Luau', 'Lusavo', 'Mucunde', 'Lomelas', 'Cassai', 'Chifucua', 'Luachimo'],
  
  // Namibe (9 municípios)
  'Namibe': ['Todos', 'Bibala', 'Camucuio', 'Moçâmedes', 'Tômbua', 'Virei', 'Arco', 'Giraul', 'Sacomar', 'Virene'],
  
  // Uíge (23 municípios)
  'Uíge': ['Todos', 'Alto Cauale', 'Ambuíla', 'Bembe', 'Buengas', 'Bungo', 'Damba', 'Milunga', 'Mucaba', 'Negage', 'Puri', 'Quimbele', 'Quitexe', 'Sanza Pombo', 'Songo', 'Uíge', 'Zombo', 'Alto-Zombo', 'Banga', 'Macocola', 'Maquela do Zombo', 'Mucaba', 'Santa Cruz'],
  
  // Zaire (11 municípios)
  'Zaire': ['Todos', 'Cuimba', 'Mbanza Congo', 'Nóqui', 'N\'Zeto', 'Soio', 'Tomboco', 'Luvu', 'Mbanza-Ngondo', 'Nkondo', 'Pedra do Feitiço']
};

export const CITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Bengo': ['Caxito (Capital)', 'Ambriz', 'Barra do Dande', 'Quibaxe', 'Bula Atumba', 'Nambuangongo', 'Pango Aluquém'],
  'Benguela': ['Benguela (Capital)', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Cubal', 'Balombo', 'Bocoio', 'Caimbambo', 'Chongorói'],
  'Bié': ['Cuíto (Capital)', 'Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Chitembo', 'Cuemba', 'Cunhinga', 'Nharêa'],
  'Cabinda': ['Cabinda (Capital)', 'Buco-Zau', 'Cacongo', 'Belize', 'Massabi', 'Dinge', 'Necuto', 'Tando Zinze'],
  'Cuando': ['Mavinga (Capital)', 'Cuito Cuanavale', 'Dirico', 'Rivungo', 'Luengue', 'Luiana'],
  'Cuanza Norte': ['N\'dalatando (Capital)', 'Dondo', 'Golungo Alto', 'Lucala', 'Camabatela', 'Samba Caju', 'Ambaca', 'Banga', 'Cazengo'],
  'Cuanza Sul': ['Sumbe (Capital)', 'Porto Amboim', 'Gabela', 'Waku Kungo', 'Calulo', 'Quibala', 'Cassongue', 'Seles', 'Conda', 'Ebo', 'Mussende', 'Quilenda'],
  'Cubango': ['Menongue (Capital)', 'Cuchi', 'Cuangar', 'Calai', 'Caiundo', 'Longa', 'Nancova', 'Savate'],
  'Cunene': ['Ondjiva (Capital)', 'Namacunde', 'Cahama', 'Xangongo', 'Cuvelai', 'Ombadja', 'Curoca'],
  'Huambo': ['Huambo (Capital)', 'Caála', 'Bailundo', 'Cachiungo', 'Ecunha', 'Londuimbali', 'Longonjo', 'Mungo', 'Ucuma'],
  'Huíla': ['Lubango (Capital)', 'Matala', 'Caconda', 'Chibia', 'Quilengues', 'Caluquembe', 'Humpata', 'Cuvango', 'Quipungo', 'Chicomba', 'Jamba'],
  'Ícolo e Bengo': ['Catete (Capital)', 'Sequele', 'Bom Jesus', 'Cabiri', 'Calumbo', 'Cabo Ledo', 'Quiçama'],
  'Luanda': ['Luanda (Capital)'],
  'Lunda Norte': ['Dundo (Capital)', 'Lucapa', 'Cuango', 'Cambulo', 'Capenda Camulemba', 'Chitato', 'Cuílo', 'Lubalo', 'Xá-Muteba'],
  'Lunda Sul': ['Saurimo (Capital)', 'Cacolo', 'Dala', 'Muconda'],
  'Malanje': ['Malanje (Capital)', 'Calandula', 'Cacuso', 'Cangandala', 'Cambundi Catembo', 'Luquembo', 'Marimba', 'Massango', 'Mucari', 'Quela', 'Quirima'],
  'Moxico': ['Luena (Capital)', 'Luau', 'Léua', 'Cameia', 'Camanongue', 'Luacano', 'Luchazes', 'Alto Zambeze'],
  'Moxico Leste': ['Cazombo (Capital)', 'Lumbala Nguimbo', 'Macondo', 'Lago Dilolo', 'Lusavo', 'Mucunde'],
  'Namibe': ['Moçâmedes (Capital)', 'Tômbua', 'Bibala', 'Virei', 'Camucuio', 'Lucira'],
  'Uíge': ['Uíge (Capital)', 'Negage', 'Maquela do Zombo', 'Sanza Pombo', 'Damba', 'Ambuíla', 'Bembe', 'Buengas', 'Bungo', 'Milunga', 'Mucaba', 'Puri', 'Quimbele', 'Quitexe', 'Songo'],
  'Zaire': ['Mbanza Congo (Capital)', 'Soyo', 'N\'Zeto', 'Tomboco', 'Nóqui', 'Cuimba']
};

export const COMMUNES_BY_MUNICIPALITY: { [key: string]: string[] } = {
  // ============================================================================
  // BENGO (26 comunas)
  // ============================================================================
  'Ambriz': ['Ambriz Sede', 'Bela Vista', 'Tabi'],
  'Barra do Dande': ['Barra do Dande Sede'],
  'Bula Atumba': ['Bula Atumba Sede', 'Mombelo'],
  'Dande': ['Caxito Sede', 'Barra do Dande', 'Mabubas', 'Caxito'],
  'Dembos': ['Quibaxe Sede', 'Banga', 'Piri'],
  'Muxaluando': ['Muxaluando Sede'],
  'Nambuangongo': ['Nambuangongo Sede', 'Cuimba', 'Sanza'],
  'Pango Aluquém': ['Pango Aluquém Sede'],
  'Piri': ['Piri Sede'],
  'Quibaxe': ['Quibaxe Sede'],
  'Quicunzo': ['Quicunzo Sede'],
  'Úcua': ['Úcua Sede'],
  
  // ============================================================================
  // BENGUELA (12 comunas)
  // ============================================================================
  'Babaera': ['Babaera Sede'],
  'Baía Farta': ['Baía Farta Sede', 'Dombe Grande', 'Lobito Novo'],
  'Balombo': ['Balombo Sede'],
  'Benguela': ['Benguela Sede', 'Zona Comercial', 'Campito'],
  'Biópio': ['Biópio Sede'],
  'Bocoio': ['Bocoio Sede', 'Caimbambo'],
  'Bolonguera': ['Bolonguera Sede'],
  'Caimbambo': ['Caimbambo Sede', 'Muinho'],
  'Canhamela': ['Canhamela Sede'],
  'Capupa': ['Capupa Sede'],
  'Catengue': ['Catengue Sede'],
  'Catumbela': ['Catumbela Sede', 'Biópio', 'Gama', 'Palmeirinha'],
  'Chicuma': ['Chicuma Sede'],
  'Chila': ['Chila Sede'],
  'Chindumbo': ['Chindumbo Sede'],
  'Chongorói': ['Chongorói Sede', 'Bvessa'],
  'Cubal': ['Cubal Sede'],
  'Dombe Grande': ['Dombe Grande Sede'],
  'Egito Praia': ['Egito Praia Sede'],
  'Ganda': ['Ganda Sede', 'Ekiemela', 'Ganda Velha'],
  'Iambala': ['Iambala Sede'],
  'Lobito': ['Lobito Sede', 'Canata', 'Egito Praia', 'Binga'],
  'Navegantes': ['Navegantes Sede'],
  
  // ============================================================================
  // BIÉ (30 comunas)
  // ============================================================================
  'Andulo': ['Andulo Sede', 'Songo'],
  'Belo Horizonte': ['Belo Horizonte Sede'],
  'Calucinga': ['Calucinga Sede'],
  'Camacupa': ['Camacupa Sede'],
  'Cambândua': ['Cambândua Sede'],
  'Catabola': ['Catabola Sede'],
  'Chicala': ['Chicala Sede'],
  'Chinguar': ['Chinguar Sede'],
  'Chipeta': ['Chipeta Sede'],
  'Chitembo': ['Chitembo Sede', 'Chiaca'],
  'Cuemba': ['Cuemba Sede'],
  'Cuíto': ['Cuíto Sede', 'Catabola', 'Gonçalves'],
  'Cunhinga': ['Cunhinga Sede'],
  'Luando': ['Luando Sede'],
  'Lúbia': ['Lúbia Sede'],
  'Mumbué': ['Mumbué Sede'],
  'Nharêa': ['Nharêa Sede', 'Cachingues'],
  'Ringoma': ['Ringoma Sede'],
  'Umpulo': ['Umpulo Sede'],
  
  // ============================================================================
  // CABINDA (8 comunas)
  // ============================================================================
  'Belize': ['Belize Sede'],
  'Buco-Zau': ['Buco-Zau Sede', 'Inhuca', 'Luso'],
  'Cabinda': ['Cabinda Sede', 'Malembo', 'Tando Zinze', 'M\'Boulou'],
  'Cacongo': ['Lândana Sede', 'Massabi', 'Dinge'],
  'Liambo': ['Liambo Sede'],
  'Massabi': ['Massabi Sede'],
  'Miconje': ['Miconje Sede'],
  'Necuto': ['Necuto Sede'],
  'Ngoio': ['Ngoio Sede'],
  'Tando Zinze': ['Tando Zinze Sede'],
  
  // ============================================================================
  // CUANDO (6 comunas)
  // ============================================================================
  'Cuito Cuanavale': ['Cuito Cuanavale Sede'],
  'Dima': ['Dima Sede'],
  'Dirico': ['Dirico Sede'],
  'Luengue': ['Luengue Sede'],
  'Luiana': ['Luiana Sede'],
  'Mavinga': ['Mavinga Sede', 'Caculuvar'],
  'Mucusso': ['Mucusso Sede'],
  'Rivungo': ['Rivungo Sede'],
  'Xipundo': ['Xipundo Sede'],
  
  // ============================================================================
  // CUANZA NORTE (24 comunas)
  // ============================================================================
  'Aldeia Nova': ['Aldeia Nova Sede'],
  'Ambaca': ['Ambaca Sede', 'Banga'],
  'Banga': ['Banga Sede'],
  'Bolongongo': ['Bolongongo Sede'],
  'Caculo Cabaça': ['Caculo Cabaça Sede'],
  'Cambambe': ['Cambambe Sede'],
  'Cazengo': ['Cazengo Sede'],
  'Cerca': ['Cerca Sede'],
  'Golungo Alto': ['Golungo Alto Sede', 'Kibaxe'],
  'Lucala': ['Lucala Sede'],
  'Luinga': ['Luinga Sede'],
  'Massangano': ['Massangano Sede'],
  'Ngonguembo': ['Ngonguembo Sede'],
  'Quiculungo': ['Quiculungo Sede'],
  'Samba Caju': ['Samba Caju Sede'],
  'Tango': ['Tango Sede'],
  'Terreiro': ['Terreiro Sede'],
  
  // ============================================================================
  // CUANZA SUL (23 comunas)
  // ============================================================================
  'Amboim': ['Amboim Sede'],
  'Cassongue': ['Cassongue Sede'],
  'Cela': ['Cela Sede', 'Cunda', 'Quilomosso'],
  'Conda': ['Conda Sede'],
  'Ebo': ['Ebo Sede'],
  'Libolo': ['Libolo Sede', 'Carianga'],
  'Mussende': ['Mussende Sede'],
  'Porto Amboim': ['Porto Amboim Sede'],
  'Quibala': ['Quibala Sede', 'Sanzala'],
  'Quilenda': ['Quilenda Sede'],
  'Seles': ['Seles Sede'],
  'Sumbe': ['Sumbe Sede', 'Gangasola'],
  'Calinga': ['Calinga Sede'],
  'Cassoneca': ['Cassoneca Sede'],
  'Cavunge': ['Cavunge Sede'],
  'Gangasola': ['Gangasola Sede'],
  'Kissanga': ['Kissanga Sede'],
  'Limbolo': ['Limbolo Sede'],
  'Longa': ['Longa Sede'],
  'Mumbondo': ['Mumbondo Sede'],
  'Quirimbo': ['Quirimbo Sede'],
  
  // ============================================================================
  // CUBANGO (12 comunas)
  // ============================================================================
  'Caiundo': ['Caiundo Sede'],
  'Calai': ['Calai Sede'],
  'Chinguanja': ['Chinguanja Sede'],
  'Cuangar': ['Cuangar Sede', 'Mucundi', 'Caconda'],
  'Cuchi': ['Cuchi Sede', 'M\'Begui'],
  'Cutato': ['Cutato Sede'],
  'Mavengue': ['Mavengue Sede'],
  'Nancova': ['Nancova Sede'],
  'Savate': ['Savate Sede'],
  
  // ============================================================================
  // CUNENE (10 comunas)
  // ============================================================================
  'Cahama': ['Cahama Sede'],
  'Cuanhama': ['Cuanhama Sede', 'Kaholo'],
  'Curoca': ['Curoca Sede', 'Otchinjau'],
  'Cuvelai': ['Cuvelai Sede'],
  'Namacunde': ['Namacunde Sede', 'Evale'],
  'Ombadja': ['Ombadja Sede'],
  'Chicumbi': ['Chicumbi Sede'],
  'Evale': ['Evale Sede'],
  'Kahama': ['Kahama Sede'],
  'Kuroka': ['Kuroka Sede'],
  'Mukolongolo': ['Mukolongolo Sede'],
  'Naulila': ['Naulila Sede'],
  'Ondjiva': ['Ondjiva Sede', 'Humbe', 'Nehone'],
  
  // ============================================================================
  // HUAMBO (30 comunas)
  // ============================================================================
  'Bailundo': ['Bailundo Sede', 'Hengue', 'Lunge', 'Chicala'],
  'Cachiungo': ['Cachiungo Sede', 'Kukeme'],
  'Caála': ['Caála Sede', 'Londe', 'Sachie'],
  'Ecunha': ['Ecunha Sede', 'N\'Govo'],
  'Huambo': ['Huambo Sede', 'Calima', 'Chipipa', 'Tchikala'],
  'Londuimbali': ['Londuimbali Sede', 'Luangue'],
  'Longonjo': ['Longonjo Sede'],
  'Mungo': ['Mungo Sede'],
  'Chicala-Choloanga': ['Chicala-Choloanga Sede'],
  'Chinjenje': ['Chinjenje Sede'],
  'Ucuma': ['Ucuma Sede'],
  'Chipipa': ['Chipipa Sede'],
  'Hengue': ['Hengue Sede'],
  'Kaliro': ['Kaliro Sede'],
  'Kueka': ['Kueka Sede'],
  'Lunge': ['Lunge Sede'],
  
  // ============================================================================
  // HUÍLA (28 comunas)
  // ============================================================================
  'Caconda': ['Caconda Sede', 'Chicala'],
  'Cacula': ['Cacula Sede'],
  'Caluquembe': ['Caluquembe Sede'],
  'Chiange': ['Chiange Sede'],
  'Chibia': ['Chibia Sede', 'Capunda Cavilongo'],
  'Chicomba': ['Chicomba Sede'],
  'Chipindo': ['Chipindo Sede'],
  'Cuvango': ['Cuvango Sede', 'Muceque'],
  'Humpata': ['Humpata Sede', 'Neves', 'M\'Copi'],
  'Jamba': ['Jamba Sede'],
  'Lubango': ['Lubango Sede', 'Arimba', 'Hoque', 'N\'Gola'],
  'Matala': ['Matala Sede', 'Kuvala'],
  'Quilengues': ['Quilengues Sede'],
  'Quipungo': ['Quipungo Sede'],
  'Capunda': ['Capunda Sede'],
  'Chicuaque': ['Chicuaque Sede'],
  'Chilata': ['Chilata Sede'],
  'Chioco': ['Chioco Sede'],
  'Cuvuio': ['Cuvuio Sede'],
  'Jamba Mineira': ['Jamba Mineira Sede'],
  'Luvemba': ['Luvemba Sede'],
  'Mumbundo': ['Mumbundo Sede'],
  
  // ============================================================================
  // ÍCOLO E BENGO (11 comunas) — PROVÍNCIA INDEPENDENTE desde 01/01/2025
  // ============================================================================
  'Catete': ['Catete Sede', 'Cassoneca', 'Caculo Cahango', 'Caxicane'],
  'Bom Jesus': ['Bom Jesus Sede'],
  'Cabiri': ['Cabiri Sede'],
  'Calumbo': ['Calumbo Sede', 'Zango 0', 'Zango 1', 'Zango 2', 'Zango 3', 'Zango 4', 'Zango 5 (Centralidade 8000)'],
  'Cabo Ledo': ['Cabo Ledo Sede'],
  'Quiçama': ['Quiçama Sede', 'Muxima', 'Quixinge', 'Demba Chio', 'Munbondo'],
  'Sequele': ['Sequele Sede', 'Funda', 'Quifangondo'],
  
  // ============================================================================
  // LUANDA (13 comunas) — Ícolo e Bengo NÃO está aqui
  // ============================================================================
  'Belas': ['Quenguela', 'Barra do Kwanza', 'Cabolombo', 'Loma'],
  'Cacuaco': ['Cacuaco Sede', 'Kicolo', 'Funda', 'Mabangakola'],
  'Cazenga': ['Cazenga Sede', 'Hoji-ya-Henda', 'Tala Hadi'],
  'Hoji-ya-Henda': ['Hoji-ya-Henda Sede'],
  'Ingombota': ['Ingombota Sede', 'Patrice Lumumba', 'Maculusso', 'Ilha do Cabo'],
  'Kilamba': ['Kilamba Sede'],
  'Kilamba Kiaxi': ['Kilamba Kiaxi Sede', 'Camama', 'Golfe'],
  'Maianga': ['Maianga Sede', 'Cassequel', 'Prenda', 'Rocha Pinto'],
  'Mulenvos': ['Mulenvos Sede'],
  'Mussulo': ['Mussulo Sede'],
  'Quissama': ['Quissama Sede'],
  'Rangel': ['Rangel Sede', 'Mártires', 'Rossas'],
  'Sambizanga': ['Sambizanga Sede'],
  'Samba': ['Samba Sede', 'Lombe'],
  'Talatona': ['Talatona Sede', 'Benfica', 'Lar do Patriota', 'Morro da Cruz'],
  'Viana': ['Viana Sede', 'Calumbo', 'Estalagem', 'Baia'],
  
  // ============================================================================
  // LUNDA NORTE (20 comunas)
  // ============================================================================
  'Cambulo': ['Cambulo Sede', 'Luto'],
  'Capenda-Camulemba': ['Capenda-Camulemba Sede'],
  'Caungula': ['Caungula Sede'],
  'Chitato': ['Chitato Sede', 'Luachimo', 'Caxinde'],
  'Cuango': ['Cuango Sede'],
  'Cuílo': ['Cuílo Sede'],
  'Cuilo': ['Cuilo Sede'],
  'Lóvua': ['Lóvua Sede'],
  'Lubalo': ['Lubalo Sede'],
  'Lucapa': ['Lucapa Sede'],
  'Xá-Muteba': ['Xá-Muteba Sede'],
  'Luchazi': ['Luchazi Sede'],
  'Muvulenge': ['Muvulenge Sede'],
  'Nhinga': ['Nhinga Sede'],
  'Quitapa': ['Quitapa Sede'],
  'Xinge': ['Xinge Sede'],
  
  // ============================================================================
  // LUNDA SUL (4 comunas)
  // ============================================================================
  'Cacolo': ['Cacolo Sede'],
  'Dala': ['Dala Sede', 'Cazage', 'Luma-Cassai'],
  'Muconda': ['Muconda Sede'],
  'Saurimo': ['Saurimo Sede', 'Mona', 'Sassoma'],
  'Muangueji': ['Muangueji Sede'],
  'Cazage': ['Cazage Sede'],
  'Congo': ['Congo Sede'],
  'Kokulo': ['Kokulo Sede'],
  'Luma-Cassai': ['Luma-Cassai Sede'],
  'Munhango': ['Munhango Sede'],
  'Xá-Cassai': ['Xá-Cassai Sede'],
  
  // ============================================================================
  // MALANJE (38 comunas)
  // ============================================================================
  'Cacuso': ['Cacuso Sede'],
  'Calandula': ['Calandula Sede', 'Cocaia'],
  'Cambundi-Catembo': ['Cambundi-Catembo Sede'],
  'Cangandala': ['Cangandala Sede'],
  'Caombo': ['Caombo Sede'],
  'Cuaba Nzoji': ['Cuaba Nzoji Sede'],
  'Cunda-Dia-Baze': ['Cunda-Dia-Baze Sede'],
  'Luquembo': ['Luquembo Sede'],
  'Malanje': ['Malanje Sede', 'Mulanji', 'Quabe', 'Kibavuvuko'],
  'Marimba': ['Marimba Sede'],
  'Massango': ['Massango Sede'],
  'Mucari': ['Mucari Sede', 'Caxito'],
  'Quela': ['Quela Sede', 'M\'Quema'],
  'Quirima': ['Quirima Sede'],
  'Cambo': ['Cambo Sede'],
  'Cangozo': ['Cangozo Sede'],
  'Cangombe': ['Cangombe Sede'],
  'Cariango': ['Cariango Sede'],
  'Cunda': ['Cunda Sede'],
  'Kibala': ['Kibala Sede'],
  'Kissama': ['Kissama Sede'],
  'Kiwaba Nzogi': ['Kiwaba Nzogi Sede'],
  'Lombe': ['Lombe Sede'],
  'Mufunza': ['Mufunza Sede'],
  
  // ============================================================================
  // MOXICO (13 comunas)
  // ============================================================================
  'Alto Zambeze': ['Alto Zambeze Sede'],
  'Bundas': ['Bundas Sede'],
  'Camanongue': ['Camanongue Sede'],
  'Léua': ['Léua Sede'],
  'Luau': ['Luau Sede'],
  'Luacano': ['Luacano Sede'],
  'Luchazes': ['Luchazes Sede', 'N\'Golo'],
  'Cameia': ['Cameia Sede'],
  'Moxico': ['Moxico Sede'],
  'Luena': ['Luena Sede', 'Lukusse', 'Luvo'],
  'Lumbala-Nguimbo': ['Lumbala-Nguimbo Sede'],
  'Lumeji': ['Lumeji Sede'],
  
  // ============================================================================
  // MOXICO LESTE (4 comunas)
  // ============================================================================
  'Cazombo': ['Cazombo Sede'],
  'Lusavo': ['Lusavo Sede'],
  'Mucunde': ['Mucunde Sede'],
  'Lomelas': ['Lomelas Sede'],
  'Cassai': ['Cassai Sede'],
  'Chifucua': ['Chifucua Sede'],
  'Luachimo': ['Luachimo Sede'],
  
  // ============================================================================
  // NAMIBE (11 comunas)
  // ============================================================================
  'Bibala': ['Bibala Sede', 'Capangobe'],
  'Camucuio': ['Camucuio Sede'],
  'Moçâmedes': ['Moçâmedes Sede', 'Mocúti', 'Bela Vista'],
  'Tômbua': ['Tômbua Sede', 'Cinjama'],
  'Virei': ['Virei Sede', 'Cacimba'],
  'Arco': ['Arco Sede'],
  'Giraul': ['Giraul Sede'],
  'Sacomar': ['Sacomar Sede'],
  'Virene': ['Virene Sede'],
  
  // ============================================================================
  // UÍGE (44 comunas)
  // ============================================================================
  'Alto Cauale': ['Alto Cauale Sede'],
  'Ambuíla': ['Ambuíla Sede'],
  'Bembe': ['Bembe Sede'],
  'Buengas': ['Buengas Sede'],
  'Bungo': ['Bungo Sede', 'Cangola'],
  'Damba': ['Damba Sede'],
  'Milunga': ['Milunga Sede'],
  'Mucaba': ['Mucaba Sede'],
  'Negage': ['Negage Sede', 'Jombolandaka'],
  'Puri': ['Puri Sede'],
  'Quimbele': ['Quimbele Sede'],
  'Quitexe': ['Quitexe Sede'],
  'Sanza Pombo': ['Sanza Pombo Sede'],
  'Songo': ['Songo Sede'],
  'Uíge': ['Uíge Sede', 'Cassuanga', 'Buanando'],
  'Zombo': ['Zombo Sede'],
  'Alto-Zombo': ['Alto-Zombo Sede'],
  'Macocola': ['Macocola Sede'],
  'Maquela do Zombo': ['Maquela do Zombo Sede'],
  'Santa Cruz': ['Santa Cruz Sede'],
  
  // ============================================================================
  // ZAIRE (18 comunas)
  // ============================================================================
  'Cuimba': ['Cuimba Sede'],
  'Mbanza Congo': ['Mbanza Congo Sede', 'Kibala'],
  'Nóqui': ['Nóqui Sede'],
  'N\'Zeto': ['N\'Zeto Sede'],
  'Soio': ['Soio Sede', 'Nzeto'],
  'Tomboco': ['Tomboco Sede', 'N\'Zadi'],
  'Luvu': ['Luvu Sede'],
  'Mbanza-Ngondo': ['Mbanza-Ngondo Sede'],
  'Nkondo': ['Nkondo Sede'],
  'Pedra do Feitiço': ['Pedra do Feitiço Sede']
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
  // Instituições com sigla oficial não devem ser recalculadas a partir do
  // nome expandido (ex.: "INAPEM — Instituto ..." gerava IINA... ).
  const normalizedName = (fullName || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  if (normalizedName.startsWith('INAPEMINSTITUTONACIONALDEAPOIOASMICROPEQUENASEMEDIAS') || normalizedName === 'INAPEM') return 'INAPEM';

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
