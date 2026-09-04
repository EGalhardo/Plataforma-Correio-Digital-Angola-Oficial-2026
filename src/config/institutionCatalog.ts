// ============================================================================
// Catálogo Institucional Partilhado — Correio Digital Angola
// ----------------------------------------------------------------------------
// Divisão Político-Administrativa de Angola (actualizada — 2025)
// Enquadramento legal: Lei n.º 14/24 de 5 de Janeiro e Regulamento DPA
// 21 províncias | 326 municípios | 378 comunas
// Ícolo e Bengo (Catete), Cuando (Mavinga) e Moxico Leste (Cazombo) criadas em 2025.
// ============================================================================

export const MUNICIPALITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Todas': ['Todos'],
  
  // 1. Cabinda (10 municípios)
  'Cabinda': [
    'Cabinda', 'Cacongo', 'Buco-Zau', 'Belize', 'Ngoio',
    'Liambo', 'Tando-Zinze', 'Massabi', 'Necuto', 'Miconje'
  ],

  // 2. Zaire (11 municípios)
  'Zaire': [
    'Mbanza Congo', 'Soyo', 'Nóqui', "N'zeto", 'Tomboco', 'Cuimba',
    'Madimba', 'Caluca', 'Luvo', 'Sumba', 'Mangue Grande'
  ],

  // 3. Uíge (23 municípios)
  'Uíge': [
    'Uíge', 'Alto Cauale', 'Ambuíla', 'Bembe', 'Buengas', 'Bungo',
    'Damba', 'Milunga', 'Maquela do Zombo', 'Mucaba', 'Negage', 'Puri',
    'Quimbele', 'Quitexe', 'Sanza Pombo', 'Songo', 'Quipedro', 'Vista Alegre',
    'Nova Esperança', 'Sacandica', 'Massau', 'Nsosso', 'Cangola'
  ],

  // 4. Bengo (12 municípios)
  'Bengo': [
    'Dande', 'Ambriz', 'Bula Atumba', 'Quibaxe', 'Nambuangongo',
    'Pango Aluquém', 'Barra do Dande', 'Panguila', 'Úcua', 'Piri',
    'Muxaluando', 'Quicunzo'
  ],

  // 5. Luanda (16 municípios)
  'Luanda': [
    'Luanda', 'Belas', 'Cacuaco', 'Cazenga', 'Viana', 'Talatona',
    'Kilamba Kiaxi', 'Mussulo', 'Sambizanga', 'Rangel', 'Maianga',
    'Samba', 'Camama', 'Mulenvos', 'Kilamba', 'Hoji-ya-Henda'
  ],

  // 6. Ícolo e Bengo (7 municípios) — Nova Província DPA 2025
  'Ícolo e Bengo': [
    'Ícolo e Bengo', 'Quiçama', 'Calumbo', 'Sequele',
    'Bom Jesus', 'Cabo Ledo', 'Cabiri'
  ],

  // 7. Cuanza Norte (17 municípios)
  'Cuanza Norte': [
    'Cazengo', 'Golungo Alto', 'Cambambe', 'Samba Cajú', 'Ambaca',
    'Lucala', 'Banga', 'Bolongongo', 'Quiculungo', 'Ngonguembo',
    'Massangano', 'Sanga', 'Cêrca', 'Tango', 'Terreiro', 'Aldeia Nova', 'Caculo Cabaça'
  ],

  // 8. Cuanza Sul (24 municípios)
  'Cuanza Sul': [
    'Sumbe', 'Amboim', 'Porto Amboim', 'Cassongue', 'Cela', 'Conda',
    'Ebo', 'Libolo', 'Mussende', 'Quibala', 'Quilenda', 'Seles',
    'Munenga', 'Gungo', 'Quicombo', 'Assango', 'Capolo', 'Uaco Cungo',
    'Calulo', 'Cariango', 'Quirimbo', 'Amboiva', 'Botera', 'Dumbi'
  ],

  // 9. Malanje (27 municípios)
  'Malanje': [
    'Malanje', 'Cacuso', 'Calandula', 'Cambundi-Catembo', 'Cangandala',
    'Caombo', 'Cuaba Nzoji', 'Cunda-Dia-Baze', 'Luquembo', 'Marimba',
    'Massango', 'Mucari', 'Quela', 'Quirima', 'Lombe', 'Quizenga',
    'Pungo-Andongo', 'Cota', 'Cuale', 'Tala-Mungongo', 'Bembo',
    'Bange-Angola', 'Milando', 'Capunda', 'Tembo-Aluma', 'Catala', 'Xandele'
  ],

  // 10. Lunda Norte (19 municípios)
  'Lunda Norte': [
    'Chitato', 'Cambulo', 'Capenda-Camulemba', 'Caungula', 'Cuango',
    'Cuílo', 'Lóvua', 'Lubalo', 'Lucapa', 'Xá-Muteba', 'Camaxilo',
    'Xá-Cassau', 'Cafunfo', 'Mussungue', 'Calucala', 'Cassanje',
    'Canzar', 'Luremo', 'Luangue'
  ],

  // 11. Lunda Sul (14 municípios)
  'Lunda Sul': [
    'Saurimo', 'Cacolo', 'Dala', 'Muconda', 'Chiluage', 'Cassai-Sul',
    'Xassengue', 'Alto-Chicapa', 'Sombo', 'Muriege', 'Luma-Cassai',
    'Cazage', 'Muangueji', 'Cassengo'
  ],

  // 12. Moxico (12 municípios)
  'Moxico': [
    'Moxico', 'Alto-Zambeze', 'Bundas', 'Camanongue', 'Léua',
    'Luchazes', 'Lutuai', 'Cangamba', 'Lucusse', 'Lutembo',
    'Cangumbe', 'Lumbala-Nguimbo'
  ],

  // 13. Moxico Leste (9 municípios) — Nova Província DPA 2025
  'Moxico Leste': [
    'Cazombo', 'Luacano', 'Cameia', 'Luau', 'Caianda',
    'Macondo', 'Candundo', 'Nana', 'Lóvua-do-Zambeze'
  ],

  // 14. Bié (19 municípios)
  'Bié': [
    'Cuíto', 'Andulo', 'Belo-Horizonte', 'Calucinga', 'Camacupa',
    'Cambândua', 'Catabola', 'Chicala', 'Chinguar', 'Chipeta',
    'Chitembo', 'Cuemba', 'Cunhinga', 'Luando', 'Lúbia', 'Mumbué',
    'Nharêa', 'Ringoma', 'Umpulo'
  ],

  // 15. Huambo (17 municípios)
  'Huambo': [
    'Huambo', 'Bailundo', 'Caála', 'Cachiungo', 'Chinjenje',
    'Ecunha', 'Londuimbali', 'Longonjo', 'Mungo', 'Ucuma',
    'Chicala-Choloanga', 'Bimbe', 'Sambo', 'Alto-Hama', 'Cuima', 'Galanga', 'Chilata'
  ],

  // 16. Huíla (23 municípios)
  'Huíla': [
    'Lubango', 'Caconda', 'Cacula', 'Caluquembe', 'Chibia', 'Chicomba',
    'Chipindo', 'Cuvango', 'Humpata', 'Matala', 'Quilengues', 'Quipungo',
    'Gambos', 'Jamba', 'Dongo', 'Hoque', 'Capelongo', 'Chituto',
    'Capunda-Cavilongo', 'Viti', 'Vivali', 'Galangue', 'Palanca'
  ],

  // 17. Cunene (14 municípios)
  'Cunene': [
    'Cuanhama', 'Cahama', 'Curoca', 'Cuvelai', 'Namacunde', 'Ombadja',
    'Chitado', 'Nehone', 'Humbe', 'Mupa', 'Naulila', 'Cafima', 'Chissuata', 'Chiéde'
  ],

  // 18. Cubango (11 municípios) — Divisão DPA 2025
  'Cubango': [
    'Menongue', 'Cuchi', 'Calai', 'Nancova', 'Cuangar', 'Savate',
    'Caiundo', 'Longa', 'Cutato', 'Chinguanja', 'Mavengue'
  ],

  // 19. Cuando (9 municípios) — Nova Província DPA 2025
  'Cuando': [
    'Mavinga', 'Cuito Cuanavale', 'Dirico', 'Rivungo', 'Xipundo',
    'Dima', 'Luiana', 'Mucusso', 'Luengue'
  ],

  // 20. Benguela (23 municípios)
  'Benguela': [
    'Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Balombo',
    'Bocoio', 'Caimbambo', 'Chongorói', 'Cubal', 'Ganda', 'Babaera',
    'Biópio', 'Bolonguera', 'Canhamela', 'Capupa', 'Catengue',
    'Chicuma', 'Chila', 'Chindumbo', 'Dombe-Grande', 'Egipto-Praia',
    'Iambala', 'Navegantes'
  ],

  // 21. Namibe (9 municípios)
  'Namibe': [
    'Moçâmedes', 'Bibala', 'Camucuio', 'Tômbwa', 'Virei',
    'Lucira', 'Cacimbas', 'Iona', 'Sacomar'
  ]
};

export const CITIES_BY_PROVINCE: { [key: string]: string[] } = {
  'Bengo': ['Caxito (Capital)', 'Ambriz', 'Barra do Dande', 'Quibaxe', 'Bula Atumba', 'Nambuangongo', 'Pango Aluquém', 'Panguila'],
  'Benguela': ['Benguela (Capital)', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Cubal', 'Balombo', 'Bocoio', 'Caimbambo', 'Chongorói'],
  'Bié': ['Cuíto (Capital)', 'Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Chitembo', 'Cuemba', 'Cunhinga', 'Nharêa'],
  'Cabinda': ['Cabinda (Capital)', 'Buco-Zau', 'Cacongo', 'Belize', 'Massabi', 'Tando-Zinze', 'Necuto', 'Miconje'],
  'Cuando': ['Mavinga (Capital)', 'Cuito Cuanavale', 'Dirico', 'Rivungo', 'Luengue', 'Luiana', 'Mucusso'],
  'Cuanza Norte': ["N'dalatando (Capital)", 'Cambambe (Dondo)', 'Golungo Alto', 'Lucala', 'Camabatela', 'Samba Cajú', 'Ambaca', 'Banga'],
  'Cuanza Sul': ['Sumbe (Capital)', 'Porto Amboim', 'Gabela', 'Uaco Cungo', 'Calulo', 'Quibala', 'Cassongue', 'Seles', 'Conda', 'Ebo', 'Mussende', 'Quilenda'],
  'Cubango': ['Menongue (Capital)', 'Cuchi', 'Cuangar', 'Calai', 'Caiundo', 'Longa', 'Nancova', 'Savate'],
  'Cunene': ['Ondjiva (Capital)', 'Namacunde', 'Cahama', 'Ombadja (Xangongo)', 'Cuvelai', 'Curoca'],
  'Huambo': ['Huambo (Capital)', 'Caála', 'Bailundo', 'Cachiungo', 'Ecunha', 'Londuimbali', 'Longonjo', 'Mungo', 'Ucuma'],
  'Huíla': ['Lubango (Capital)', 'Matala', 'Caconda', 'Chibia', 'Quilengues', 'Caluquembe', 'Humpata', 'Cuvango', 'Quipungo', 'Chicomba', 'Jamba'],
  'Ícolo e Bengo': ['Catete (Capital)', 'Sequele', 'Bom Jesus', 'Cabiri', 'Calumbo', 'Cabo Ledo', 'Quiçama'],
  'Luanda': ['Luanda (Capital)'],
  'Lunda Norte': ['Dundo (Capital)', 'Lucapa', 'Cuango', 'Cambulo', 'Capenda-Camulemba', 'Chitato', 'Cuílo', 'Lubalo', 'Xá-Muteba'],
  'Lunda Sul': ['Saurimo (Capital)', 'Cacolo', 'Dala', 'Muconda'],
  'Malanje': ['Malanje (Capital)', 'Calandula', 'Cacuso', 'Cangandala', 'Cambundi-Catembo', 'Luquembo', 'Marimba', 'Massango', 'Mucari', 'Quela', 'Quirima'],
  'Moxico': ['Luena (Capital)', 'Luau', 'Léua', 'Cameia', 'Camanongue', 'Luacano', 'Luchazes', 'Alto-Zambeze'],
  'Moxico Leste': ['Cazombo (Capital)', 'Luau', 'Cameia', 'Caianda', 'Macondo', 'Candundo', 'Nana'],
  'Namibe': ['Moçâmedes (Capital)', 'Tômbwa', 'Bibala', 'Virei', 'Camucuio', 'Lucira'],
  'Uíge': ['Uíge (Capital)', 'Negage', 'Maquela do Zombo', 'Sanza Pombo', 'Damba', 'Ambuíla', 'Bembe', 'Buengas', 'Bungo', 'Milunga', 'Mucaba', 'Puri', 'Quimbele', 'Quitexe', 'Songo'],
  'Zaire': ['Mbanza Congo (Capital)', 'Soyo', "N'zeto", 'Tomboco', 'Nóqui', 'Cuimba']
};

export const COMMUNES_BY_MUNICIPALITY: { [key: string]: string[] } = {
  // ============================================================================
  // 1. CABINDA (10 municípios)
  // ============================================================================
  'Cabinda': ['Cabinda (Sede)', 'Malembo', 'Tando Zinze'],
  'Cacongo': ['Lândana/Cacongo (Sede)', 'Dinge'],
  'Buco-Zau': ['Buco-Zau (Sede)', 'Necuto', 'Inhuca'],
  'Belize': ['Belize (Sede)', 'Luali'],
  'Ngoio': ['Ngoio (Sede)'],
  'Liambo': ['Liambo (Sede)'],
  'Tando-Zinze': ['Tando-Zinze (Sede)', 'Malembo'],
  'Massabi': ['Massabi (Sede)'],
  'Necuto': ['Necuto (Sede)', 'Inhuca'],
  'Miconje': ['Miconje (Sede)'],

  // ============================================================================
  // 2. ZAIRE (11 municípios)
  // ============================================================================
  'Mbanza Congo': ['Mbanza Congo (Sede)', 'Madimba', 'Caluca', 'Kiende', 'Calambata', 'Luvo'],
  'Soyo': ['Soyo (Sede)', 'Sumba', 'Pedra de Feitiço', 'Quêlo', 'Mangue Grande'],
  'Nóqui': ['Nóqui (Sede)', 'Lufico', 'Mepala (Lulendo)'],
  "N'zeto": ["N'zeto (Sede)", 'Musserra', 'Quibala Norte', 'Quindeje'],
  'Tomboco': ['Tomboco (Sede)', 'Quinsimba', 'Quinzau'],
  'Cuimba': ['Cuimba (Sede)', 'Buela', 'Serra da Canda', 'Luvaca'],
  'Madimba': ['Madimba (Sede)'],
  'Caluca': ['Caluca (Sede)'],
  'Luvo': ['Luvo (Sede)'],
  'Sumba': ['Sumba (Sede)'],
  'Mangue Grande': ['Mangue Grande (Sede)'],

  // ============================================================================
  // 3. UÍGE (23 municípios)
  // ============================================================================
  'Uíge': ['Uíge (Sede)'],
  'Alto Cauale': ['Cangola (Sede)', 'Bengo', 'Caiongo'],
  'Ambuíla': ['Nova Ambuíla (Sede)', 'Quipedro'],
  'Bembe': ['Bembe (Sede)', 'Lucunga', 'Mabaia'],
  'Buengas': ['Nova Esperança (Sede)', 'Cuilo-Camboso'],
  'Bungo': ['Bungo (Sede)'],
  'Damba': ['Damba (Sede)', 'Mabanza Sosso', 'Camatambo', 'Lêmboa', 'Petecusso'],
  'Milunga': ['Milunga (Sede)', 'Macocola', 'Macolo', 'Massau'],
  'Maquela do Zombo': ['Maquela do Zombo (Sede)', 'Béu', 'Cuilo-Futa', 'Quibocolo', 'Sacandica'],
  'Mucaba': ['Mucaba (Sede)', 'Uando'],
  'Negage': ['Negage (Sede)', 'Dimuca', 'Quisseque'],
  'Puri': ['Puri (Sede)'],
  'Quimbele': ['Quimbele (Sede)', 'Cuango', 'Icoca', 'Alto-Zaza'],
  'Quitexe': ['Quitexe (Sede)', 'Aldeia Viçosa', 'Cambamba', 'Vista Alegre'],
  'Sanza Pombo': ['Sanza Pombo (Sede)', 'Cuilo-Pombo', 'Uamba', 'Alfândega'],
  'Songo': ['Songo (Sede)', 'Quivuenga'],
  'Quipedro': ['Quipedro (Sede)'],
  'Vista Alegre': ['Vista Alegre (Sede)'],
  'Nova Esperança': ['Nova Esperança (Sede)'],
  'Sacandica': ['Sacandica (Sede)'],
  'Massau': ['Massau (Sede)'],
  'Nsosso': ['Nsosso (Sede)'],
  'Cangola': ['Cangola (Sede)'],

  // ============================================================================
  // 4. BENGO (12 municípios)
  // ============================================================================
  'Dande': ['Caxito (Sede)', 'Barra do Dande', 'Mabubas', 'Quicabo', 'Úcua'],
  'Ambriz': ['Ambriz (Sede)', 'Bela Vista', 'Tabi'],
  'Bula Atumba': ['Bula Atumba (Sede)', 'Quiage'],
  'Quibaxe': ['Quibaxe (Sede)', 'Coxe', 'Paredes', 'Piri'],
  'Nambuangongo': ['Muxaluando (Sede)', 'Canacassala', 'Gombe', 'Zala', 'Cage', 'Quixico', 'Quicunzo'],
  'Pango Aluquém': ['Pango Aluquém (Sede)', 'Cazuangongo'],
  'Barra do Dande': ['Barra do Dande (Sede)'],
  'Panguila': ['Panguila (Sede)'],
  'Úcua': ['Úcua (Sede)'],
  'Piri': ['Piri (Sede)'],
  'Muxaluando': ['Muxaluando (Sede)', 'Quixico', 'Cage-Mazumbo'],
  'Quicunzo': ['Quicunzo (Sede)'],

  // ============================================================================
  // 5. LUANDA (16 municípios)
  // ============================================================================
  'Luanda': ['Luanda (Sede)', 'Ingombota', 'Sambizanga', 'Rangel', 'Maianga', 'Samba', 'Neves Bendinha', 'Ngola Kiluanje'],
  'Belas': ['Belas (Sede)', 'Quenguela', 'Barra do Cuanza', 'Cabolombo', 'Ramiros'],
  'Cacuaco': ['Cacuaco (Sede)', 'Kicolo', 'Funda', 'Mabangakola'],
  'Cazenga': ['Cazenga (Sede)', 'Hoji-ya-Henda', 'Tala Hadi', 'Calawenda'],
  'Viana': ['Viana (Sede)', 'Estalagem', 'Baia', 'Kikuxi', 'Vila Flor'],
  'Talatona': ['Talatona (Sede)', 'Benfica', 'Lar do Patriota', 'Morro dos Veados'],
  'Kilamba Kiaxi': ['Kilamba Kiaxi (Sede)', 'Golfe', 'Palanca', 'Havemos de Voltar'],
  'Mussulo': ['Mussulo (Sede)', 'Priam', 'Pontinha'],
  'Sambizanga': ['Sambizanga (Sede)', 'Ngola Kiluanje', 'Bairro Operário'],
  'Rangel': ['Rangel (Sede)', 'Terra Nova', 'Marçal'],
  'Maianga': ['Maianga (Sede)', 'Cassequel', 'Prenda', 'Rocha Pinto'],
  'Samba': ['Samba (Sede)', 'Corimba', 'Morro Bento'],
  'Camama': ['Camama (Sede)'],
  'Mulenvos': ['Mulenvos (Sede)'],
  'Kilamba': ['Kilamba (Sede)', 'Vila Flor'],
  'Hoji-ya-Henda': ['Hoji-ya-Henda (Sede)'],

  // ============================================================================
  // 6. ÍCOLO E BENGO (7 municípios) — Nova Província DPA 2025
  // ============================================================================
  'Ícolo e Bengo': ['Catete (Sede)', 'Cassoneca', 'Caculo Cahango', 'Caxicane'],
  'Quiçama': ['Muxima (Sede)', 'Quixinge', 'Mumbondo', 'Demba-Chio', 'Cabo Ledo'],
  'Calumbo': ['Calumbo (Sede)', 'Zango 0', 'Zango 1', 'Zango 2', 'Zango 3', 'Zango 4', 'Zango 5 (Centralidade 8000)'],
  'Sequele': ['Sequele (Sede)', 'Funda'],
  'Bom Jesus': ['Bom Jesus (Sede)'],
  'Cabo Ledo': ['Cabo Ledo (Sede)'],
  'Cabiri': ['Cabiri (Sede)'],

  // ============================================================================
  // 7. CUANZA NORTE (17 municípios)
  // ============================================================================
  'Cazengo': ["N'dalatando (Sede)"],
  'Golungo Alto': ['Golungo Alto (Sede)', 'Cêrca'],
  'Cambambe': ['Cambambe/Dondo (Sede)', 'Massangano', 'Zenza do Itombe'],
  'Samba Cajú': ['Samba Cajú (Sede)'],
  'Ambaca': ['Ambaca/Camabatela (Sede)', 'Tango', 'Máua', 'Bindo', 'Luinga'],
  'Lucala': ['Lucala (Sede)', 'Quiangombe'],
  'Banga': ['Banga (Sede)', 'Aldeia Nova', 'Caculo Cabaça'],
  'Bolongongo': ['Bolongongo (Sede)', 'Terreiro', 'Quiquiemba'],
  'Quiculungo': ['Quiculungo (Sede)'],
  'Ngonguembo': ['Ngonguembo (Sede)', 'Camome', 'Cavunga'],
  'Massangano': ['Massangano (Sede)'],
  'Sanga': ['Sanga (Sede)'],
  'Cêrca': ['Cêrca (Sede)'],
  'Tango': ['Tango (Sede)'],
  'Terreiro': ['Terreiro (Sede)'],
  'Aldeia Nova': ['Aldeia Nova (Sede)'],
  'Caculo Cabaça': ['Caculo Cabaça (Sede)'],

  // ============================================================================
  // 8. CUANZA SUL (24 municípios)
  // ============================================================================
  'Sumbe': ['Sumbe (Sede)', 'Gungo', 'Quicombo', 'Gangula'],
  'Amboim': ['Gabela (Sede)', 'Assango'],
  'Porto Amboim': ['Porto Amboim (Sede)', 'Capolo'],
  'Cassongue': ['Cassongue (Sede)', 'Pambangala', 'Dumbi', 'Atome'],
  'Cela': ['Uaco Cungo (Sede)', 'Quissanga', 'Sanga'],
  'Conda': ['Conda (Sede)', 'Cunjo'],
  'Ebo': ['Ebo (Sede)', 'Condé', 'Quissanje'],
  'Libolo': ['Calulo (Sede)', 'Munenga', 'Cabuta', 'Quissongo'],
  'Mussende': ['Mussende (Sede)', 'São Lucas', 'Quienha'],
  'Quibala': ['Quibala (Sede)', 'Cariango', 'Dala-Cachibo', 'Lonhe'],
  'Quilenda': ['Quilenda (Sede)', 'Quirimbo'],
  'Seles': ['Seles (Sede)', 'Amboiva', 'Botera'],
  'Munenga': ['Munenga (Sede)'],
  'Gungo': ['Gungo (Sede)'],
  'Quicombo': ['Quicombo (Sede)'],
  'Assango': ['Assango (Sede)'],
  'Capolo': ['Capolo (Sede)'],
  'Uaco Cungo': ['Uaco Cungo (Sede)'],
  'Calulo': ['Calulo (Sede)'],
  'Cariango': ['Cariango (Sede)'],
  'Quirimbo': ['Quirimbo (Sede)'],
  'Amboiva': ['Amboiva (Sede)'],
  'Botera': ['Botera (Sede)'],
  'Dumbi': ['Dumbi (Sede)'],

  // ============================================================================
  // 9. MALANJE (27 municípios)
  // ============================================================================
  'Malanje': ['Malanje (Sede)', 'Cambaxe', 'Ngola-Luije'],
  'Cacuso': ['Cacuso (Sede)', 'Lombe', 'Quizenga', 'Pungo-Andongo', 'Soqueco'],
  'Calandula': ['Calandula (Sede)', 'Cateco', 'Cangola', 'Cota', 'Cuale', 'Quinje'],
  'Cambundi-Catembo': ['Cambundi-Catembo (Sede)', 'Quitapa', 'Tala-Mungongo', 'Dumba-Cambango'],
  'Cangandala': ['Cangandala (Sede)', 'Bembo', 'Culamagia', 'Caribo'],
  'Caombo': ['Caombo (Sede)', 'Bange-Angola', 'Cambo-Suinginge', 'Micanda'],
  'Cuaba Nzoji': ['Cuaba Nzoji (Sede)', 'Mufuma'],
  'Cunda-Dia-Baze': ['Cunda-Dia-Baze (Sede)', 'Lemba', 'Milando'],
  'Luquembo': ['Luquembo (Sede)', 'Quimbango', 'Capunda', 'Dombo', 'Cunga-Palanga', 'Rimba'],
  'Marimba': ['Marimba (Sede)', 'Cabombo', 'Tembo-Aluma'],
  'Massango': ['Massango (Sede)', 'Quihuhu', 'Quinguengue'],
  'Mucari': ['Mucari (Sede)', 'Catala', 'Caxinga', 'Muquixe'],
  'Quela': ['Quela (Sede)', 'Xandele', 'Moma', 'Bângalas'],
  'Quirima': ['Quirima (Sede)', 'Sautar'],
  'Lombe': ['Lombe (Sede)'],
  'Quizenga': ['Quizenga (Sede)'],
  'Pungo-Andongo': ['Pungo-Andongo (Sede)'],
  'Cota': ['Cota (Sede)'],
  'Cuale': ['Cuale (Sede)'],
  'Tala-Mungongo': ['Tala-Mungongo (Sede)'],
  'Bembo': ['Bembo (Sede)'],
  'Bange-Angola': ['Bange-Angola (Sede)'],
  'Milando': ['Milando (Sede)'],
  'Capunda': ['Capunda (Sede)'],
  'Tembo-Aluma': ['Tembo-Aluma (Sede)'],
  'Catala': ['Catala (Sede)'],
  'Xandele': ['Xandele (Sede)'],

  // ============================================================================
  // 10. LUNDA NORTE (19 municípios)
  // ============================================================================
  'Chitato': ['Dundo (Sede)', 'Luachimo', 'Mussungue'],
  'Cambulo': ['Cambulo (Sede)', 'Luia', 'Canzar'],
  'Capenda-Camulemba': ['Capenda-Camulemba (Sede)', 'Xinge'],
  'Caungula': ['Caungula (Sede)', 'Camaxilo'],
  'Cuango': ['Cuango (Sede)', 'Cafunfo', 'Luremo'],
  'Cuílo': ['Cuílo (Sede)', 'Calucala', 'Luangue'],
  'Lóvua': ['Lóvua (Sede)'],
  'Lubalo': ['Lubalo (Sede)', 'Luangue', 'Muvulenge'],
  'Lucapa': ['Lucapa (Sede)', 'Camissombo', 'Capaia', 'Xá-Cassau'],
  'Xá-Muteba': ['Xá-Muteba (Sede)', 'Cassanje', 'Iongo'],
  'Camaxilo': ['Camaxilo (Sede)'],
  'Xá-Cassau': ['Xá-Cassau (Sede)'],
  'Cafunfo': ['Cafunfo (Sede)'],
  'Mussungue': ['Mussungue (Sede)'],
  'Calucala': ['Calucala (Sede)'],
  'Cassanje': ['Cassanje (Sede)'],
  'Canzar': ['Canzar (Sede)'],
  'Luremo': ['Luremo (Sede)'],
  'Luangue': ['Luangue (Sede)'],

  // ============================================================================
  // 11. LUNDA SUL (14 municípios)
  // ============================================================================
  'Saurimo': ['Saurimo (Sede)', 'Mona-Quimbundo', 'Sombo'],
  'Cacolo': ['Cacolo (Sede)', 'Cucumbi', 'Alto-Chicapa', 'Xassengue'],
  'Dala': ['Dala (Sede)', 'Luma-Cassai', 'Cazage'],
  'Muconda': ['Muconda (Sede)', 'Chiluage', 'Cassai-Sul', 'Muriege'],
  'Chiluage': ['Chiluage (Sede)'],
  'Cassai-Sul': ['Cassai-Sul (Sede)'],
  'Xassengue': ['Xassengue (Sede)'],
  'Alto-Chicapa': ['Alto-Chicapa (Sede)'],
  'Sombo': ['Sombo (Sede)'],
  'Muriege': ['Muriege (Sede)'],
  'Luma-Cassai': ['Luma-Cassai (Sede)'],
  'Cazage': ['Cazage (Sede)'],
  'Muangueji': ['Muangueji (Sede)'],
  'Cassengo': ['Cassengo (Sede)'],

  // ============================================================================
  // 12. MOXICO (12 municípios)
  // ============================================================================
  'Moxico': ['Luena (Sede)', 'Cangumbe', 'Lucusse', 'Lutuai'],
  'Alto-Zambeze': ['Cazombo (Sede)', 'Lóvua-do-Zambeze', 'Caianda', 'Lago-Dilolo'],
  'Bundas': ['Lumbala-Nguimbo (Sede)', 'Lutembo', 'Ninda', 'Chiúme'],
  'Camanongue': ['Camanongue (Sede)'],
  'Léua': ['Léua (Sede)', 'Liangongo'],
  'Luchazes': ['Cangamba/Luchazes (Sede)', 'Camgombo', 'Cassamba', 'Muié', 'Tempue'],
  'Lutuai': ['Lutuai (Sede)'],
  'Cangamba': ['Cangamba (Sede)'],
  'Lucusse': ['Lucusse (Sede)'],
  'Lutembo': ['Lutembo (Sede)'],
  'Cangumbe': ['Cangumbe (Sede)'],
  'Lumbala-Nguimbo': ['Lumbala-Nguimbo (Sede)'],

  // ============================================================================
  // 13. MOXICO LESTE (9 municípios) — Nova Província DPA 2025
  // ============================================================================
  'Cazombo': ['Cazombo (Sede)'],
  'Luacano': ['Luacano (Sede)', 'Lago-Dilolo'],
  'Cameia': ['Cameia/Lumeje (Sede)'],
  'Luau': ['Luau (Sede)'],
  'Caianda': ['Caianda (Sede)'],
  'Macondo': ['Macondo (Sede)'],
  'Candundo': ['Candundo (Sede)'],
  'Nana': ['Nana (Sede)'],
  'Lóvua-do-Zambeze': ['Lóvua-do-Zambeze (Sede)'],

  // ============================================================================
  // 14. BIÉ (19 municípios)
  // ============================================================================
  'Cuíto': ['Cuíto (Sede)', 'Chicala', 'Chipeta'],
  'Andulo': ['Andulo (Sede)', 'Calucinga', 'Cassumbe', 'Chivaúlo'],
  'Belo-Horizonte': ['Belo-Horizonte (Sede)'],
  'Calucinga': ['Calucinga (Sede)'],
  'Camacupa': ['Camacupa (Sede)', 'Ringoma', 'Santo António da Muinha', 'Umpulo', 'Cuanza'],
  'Cambândua': ['Cambândua (Sede)'],
  'Catabola': ['Catabola (Sede)', 'Chipeta', 'Caiuera', 'Chiúca', 'Sande'],
  'Chicala': ['Chicala (Sede)'],
  'Chinguar': ['Chinguar (Sede)', 'Cutato', 'Cangote'],
  'Chipeta': ['Chipeta (Sede)'],
  'Chitembo': ['Chitembo (Sede)', 'Cachingues', 'Mutumbo', 'Mumbué', 'Malengue', 'Soma-Cuanza'],
  'Cuemba': ['Cuemba (Sede)', 'Luando', 'Munhango', 'Sachinemuna'],
  'Cunhinga': ['Cunhinga (Sede)'],
  'Luando': ['Luando (Sede)'],
  'Lúbia': ['Lúbia (Sede)'],
  'Mumbué': ['Mumbué (Sede)'],
  'Nharêa': ['Nharêa (Sede)'],
  'Ringoma': ['Ringoma (Sede)'],
  'Umpulo': ['Umpulo (Sede)'],

  // ============================================================================
  // 15. HUAMBO (17 municípios)
  // ============================================================================
  'Huambo': ['Huambo (Sede)'],
  'Bailundo': ['Bailundo (Sede)'],
  'Caála': ['Caála (Sede)'],
  'Cachiungo': ['Cachiungo (Sede)'],
  'Chinjenje': ['Chinjenje (Sede)'],
  'Ecunha': ['Ecunha (Sede)'],
  'Londuimbali': ['Londuimbali (Sede)'],
  'Longonjo': ['Longonjo (Sede)'],
  'Mungo': ['Mungo (Sede)'],
  'Ucuma': ['Ucuma (Sede)'],
  'Chicala-Choloanga': ['Chicala-Choloanga (Sede)'],
  'Bimbe': ['Bimbe (Sede)'],
  'Sambo': ['Sambo (Sede)'],
  'Alto-Hama': ['Alto-Hama (Sede)'],
  'Cuima': ['Cuima (Sede)'],
  'Galanga': ['Galanga (Sede)'],
  'Chilata': ['Chilata (Sede)'],

  // ============================================================================
  // 16. HUÍLA (23 municípios)
  // ============================================================================
  'Lubango': ['Lubango (Sede)', 'Arrimba', 'Huíla', 'Quilenda'],
  'Caconda': ['Caconda (Sede)'],
  'Cacula': ['Cacula (Sede)'],
  'Caluquembe': ['Caluquembe (Sede)'],
  'Chibia': ['Chibia (Sede)', 'Capunda-Cavilongo', 'Jau'],
  'Chicomba': ['Chicomba (Sede)'],
  'Chipindo': ['Chipindo (Sede)'],
  'Cuvango': ['Cuvango (Sede)'],
  'Humpata': ['Humpata (Sede)'],
  'Matala': ['Matala (Sede)'],
  'Quilengues': ['Quilengues (Sede)'],
  'Quipungo': ['Quipungo (Sede)'],
  'Gambos': ['Chiange/Gambos (Sede)'],
  'Jamba': ['Jamba (Sede)', 'Dongo'],
  'Dongo': ['Dongo (Sede)'],
  'Hoque': ['Hoque (Sede)'],
  'Capelongo': ['Capelongo (Sede)'],
  'Chituto': ['Chituto (Sede)'],
  'Capunda-Cavilongo': ['Capunda-Cavilongo (Sede)'],
  'Viti': ['Viti (Sede)'],
  'Vivali': ['Vivali (Sede)'],
  'Galangue': ['Galangue (Sede)'],
  'Palanca': ['Palanca (Sede)'],

  // ============================================================================
  // 17. CUNENE (14 municípios)
  // ============================================================================
  'Cuanhama': ['Ondjiva (Sede)'],
  'Cahama': ['Cahama (Sede)'],
  'Curoca': ['Curoca (Sede)', 'Chitado', 'Chissuata'],
  'Cuvelai': ['Cuvelai (Sede)'],
  'Namacunde': ['Namacunde (Sede)'],
  'Ombadja': ['Ombadja/Xangongo (Sede)', 'Humbe', 'Mupa'],
  'Chitado': ['Chitado (Sede)'],
  'Nehone': ['Nehone (Sede)'],
  'Humbe': ['Humbe (Sede)'],
  'Mupa': ['Mupa (Sede)'],
  'Naulila': ['Naulila (Sede)'],
  'Cafima': ['Cafima (Sede)'],
  'Chissuata': ['Chissuata (Sede)'],
  'Chiéde': ['Chiéde (Sede)'],

  // ============================================================================
  // 18. CUBANGO (11 municípios) — Divisão DPA 2025
  // ============================================================================
  'Menongue': ['Menongue (Sede)'],
  'Cuchi': ['Cuchi (Sede)', 'Cutato', 'Chinguanja'],
  'Calai': ['Calai (Sede)', 'Maue', 'Mavengue'],
  'Nancova': ['Nancova (Sede)'],
  'Cuangar': ['Cuangar (Sede)'],
  'Savate': ['Savate (Sede)'],
  'Caiundo': ['Caiundo (Sede)'],
  'Longa': ['Longa (Sede)'],
  'Cutato': ['Cutato (Sede)'],
  'Chinguanja': ['Chinguanja (Sede)'],
  'Mavengue': ['Mavengue (Sede)'],

  // ============================================================================
  // 19. CUANDO (9 municípios) — Nova Província DPA 2025
  // ============================================================================
  'Mavinga': ['Mavinga (Sede)'],
  'Cuito Cuanavale': ['Cuito Cuanavale (Sede)'],
  'Dirico': ['Dirico (Sede)', 'Mucusso', 'Xamavera'],
  'Rivungo': ['Rivungo (Sede)'],
  'Xipundo': ['Xipundo (Sede)'],
  'Dima': ['Dima (Sede)'],
  'Luiana': ['Luiana (Sede)'],
  'Mucusso': ['Mucusso (Sede)'],
  'Luengue': ['Luengue (Sede)'],

  // ============================================================================
  // 20. BENGUELA (23 municípios)
  // ============================================================================
  'Benguela': ['Benguela (Sede)'],
  'Lobito': ['Lobito (Sede)', 'Egipto-Praia', 'Canjala'],
  'Catumbela': ['Catumbela (Sede)', 'Gama', 'Biópio', 'Praia-Bebe'],
  'Baía Farta': ['Baía Farta (Sede)', 'Dombe-Grande', 'Calahanga', 'Equimina'],
  'Balombo': ['Balombo (Sede)', 'Chindumbo', 'Chingongo', 'Maca-Mombolo'],
  'Bocoio': ['Bocoio (Sede)', 'Chila', 'Monte-Belo', 'Passe', 'Cavimbe', 'Cubal-do-Lumbo'],
  'Caimbambo': ['Caimbambo (Sede)', 'Catengue', 'Caiave', 'Canhamela', 'Viangombe'],
  'Chongorói': ['Chongorói (Sede)', 'Bolonguera', 'Camuine'],
  'Cubal': ['Cubal (Sede)', 'Iambala', 'Capupa', 'Tumbulo (Lomaum)'],
  'Ganda': ['Ganda (Sede)', 'Babaera', 'Chicuma', 'Ebanga', 'Casseque'],
  'Babaera': ['Babaera (Sede)'],
  'Biópio': ['Biópio (Sede)'],
  'Bolonguera': ['Bolonguera (Sede)'],
  'Canhamela': ['Canhamela (Sede)'],
  'Capupa': ['Capupa (Sede)'],
  'Catengue': ['Catengue (Sede)'],
  'Chicuma': ['Chicuma (Sede)'],
  'Chila': ['Chila (Sede)'],
  'Chindumbo': ['Chindumbo (Sede)'],
  'Dombe-Grande': ['Dombe-Grande (Sede)'],
  'Egipto-Praia': ['Egipto-Praia (Sede)'],
  'Iambala': ['Iambala (Sede)'],
  'Navegantes': ['Navegantes (Sede)'],

  // ============================================================================
  // 21. NAMIBE (9 municípios)
  // ============================================================================
  'Moçâmedes': ['Moçâmedes (Sede)'],
  'Bibala': ['Bibala (Sede)'],
  'Camucuio': ['Camucuio (Sede)'],
  'Tômbwa': ['Tômbwa (Sede)', 'Baía dos Tigres'],
  'Virei': ['Virei (Sede)', 'Cainde'],
  'Lucira': ['Lucira (Sede)'],
  'Cacimbas': ['Cacimbas (Sede)'],
  'Iona': ['Iona (Sede)'],
  'Sacomar': ['Sacomar (Sede)']
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
