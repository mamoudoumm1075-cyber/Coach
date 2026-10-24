/* Monde de Lingua Quest : univers, personnages, chapitres, quêtes, dialogues, boss, évaluation, objets.
   Halden City ressemble à une ville d’aujourd’hui. Les Ombres y volent le sens des mots :
   quand les gens ne se comprennent plus, elles grandissent. La Société des Lanternes les combat. */

export const CHARACTERS = {
  nora: { name: 'Nora Vance', role: 'Agente de la Société des Lanternes, ta mentore', color: '#6C4CF1', initials: 'NV' },
  leo: { name: 'Leo Hart', role: 'Barista au Copper Cup, il sait tout ce qui se passe en ville', color: '#FF6B9A', initials: 'LH' },
  priya: { name: 'Priya Shah', role: 'Analyste de la Société, spécialiste des signaux d’Ombre', color: '#2F80ED', initials: 'PS' },
  marcus: { name: 'Marcus Osei', role: 'Coursier du Réseau des voyageurs', color: '#FFD166', initials: 'MO' },
  shadow: { name: 'Le Seigneur des Ombres', role: 'Il veut un monde où plus personne ne se comprend', color: '#FF5B6E', initials: 'SO' },
  hero: { name: 'Toi', role: '', color: '#2ECC71', initials: '' }
};

export const CLASS_INFO = {
  combattant: { name: 'Combattant', desc: 'Tu avances par les défis : épreuves chronométrées et combats.', power: 'Lame de lumière', color: '#FF5B6E', side: 'Défis contre la montre' },
  stratege: { name: 'Stratège', desc: 'Tu résous les problèmes : tu analyses et tu choisis la meilleure option.', power: 'Bouclier logique', color: '#6C4CF1', side: 'Énigmes de construction de phrases' },
  explorateur: { name: 'Explorateur', desc: 'Tu découvres : lieux cachés, documents, conversations à décrypter.', power: 'Boussole des voix', color: '#2ECC71', side: 'Documents à explorer' },
  technicien: { name: 'Technicien', desc: 'Tu aimes les systèmes : tu décortiques les règles et les mécanismes.', power: 'Gant d’analyse', color: '#2F80ED', side: 'Transformations de phrases' }
};

/* ---------- Éléments réutilisables ---------- */
const qcm = (id, skill, diff, prompt, text, options, answer, explain, extra = {}) => ({ id, type: 'qcm', skill, diff, tags: extra.tags || [], prompt, text, options, answer, explain, ...extra });
const listen = (id, diff, audio, question, options, answer, explain, tags = []) => ({ id, type: 'listen', skill: 'listening', diff, tags, prompt: 'Écoute, puis réponds.', audio, question, options, answer, explain, transcript: audio.map(l => l[0] + ' : ' + l[1]).join('\n') });
const repeat = (id, diff, target, fr, tags = []) => ({ id, type: 'speak', mode: 'repeat', skill: 'speaking', diff, tags, prompt: 'Écoute puis répète la phrase.', target, fr });
const answer = (id, diff, question, fr, model, checks, tags = []) => ({ id, type: 'speak', mode: 'answer', skill: 'speaking', diff, tags, prompt: 'Réponds à voix haute (ou par écrit).', question, fr, model, checks });
const order = (id, diff, prompt, words, ans, fr, explain, tags = []) => ({ id, type: 'order', skill: 'reflexes', diff, tags, prompt, words, answer: ans, fr, explain });
const typed = (id, skill, diff, prompt, text, answers, explain, tags = []) => ({ id, type: 'type', skill, diff, tags, prompt, text, answer: answers, explain });

/* ---------- Items propres au monde ---------- */
export const WORLD_ITEMS = [
  /* Chapitre 1 */
  qcm('w1-hello', 'reflexes', 1, 'Nora te dit « Nice to meet you. » Que réponds-tu ?', '', ['Nice to meet you too.', 'Yes, I meet.', 'I am fine meet.'], 0, '« Nice to meet you too » = enchanté aussi.', { why: ['Correct.', 'Ce n’est pas une réponse naturelle.', 'Phrase incorrecte.'], tags: ['ch1'] }),
  qcm('w1-what-do', 'reflexes', 1, '« What do you do? » veut dire…', '', ['Que fais-tu en ce moment ?', 'Que fais-tu dans la vie (métier) ?', 'Qu’as-tu fait ?'], 1, 'Question au present simple sur une situation stable : le métier.', { why: ['Ce serait « What are you doing? ».', 'Correct.', 'Ce serait « What did you do? ».'], tags: ['ch1', 'present-simple'], tense: 'present-simple' }),
  qcm('w1-live', 'grammar', 1, 'Complète.', 'I ___ in Halden City.', ['live', 'lives', 'am live'], 0, 'I + verbe à la base au present simple.', { why: ['Correct.', 'Le -s, c’est pour he / she / it.', 'On ne met pas be devant un verbe d’action ici.'], tags: ['present-simple'], tense: 'present-simple' }),
  order('w1-o1', 1, 'Remets dans l’ordre pour te présenter.', ['my', 'name', 'is', 'Alex'], 'my name is alex', 'Je m’appelle Alex.', 'Sujet (my name) + be + complément.', ['ch1']),
  order('w1-o2', 1, 'Remets dans l’ordre.', ['I', 'work', 'in', 'an', 'office'], 'i work in an office', 'Je travaille dans un bureau.', 'Present simple : sujet + verbe + complément.', ['present-simple']),
  typed('w1-t1', 'grammar', 1, 'Complète avec le verbe « wake up » (habitude, sujet she).', 'She ___ at 7 every day.', ['wakes up'], 'she → -s sur le verbe : wakes up.', ['present-simple']),
  repeat('w1-r1', 1, 'Hi, my name is Alex. Nice to meet you.', 'Salut, je m’appelle Alex. Enchanté.', ['ch1']),
  repeat('w1-r2', 1, 'I live in Halden City and I work in an office.', 'J’habite à Halden City et je travaille dans un bureau.', ['present-simple']),
  answer('w1-a1', 1, 'What do you do?', 'Que fais-tu dans la vie ?', 'I work in a bank. / I’m a student.', [['\\b(i work|i\'m a|i am a|i study|i\'m an|i am an)\\b', 'Une phrase sur ton métier ou tes études']], ['present-simple']),
  answer('w1-a2', 1, 'What do you usually do on weekends?', 'Que fais-tu généralement le week-end ?', 'I usually see my friends and I play football.', [['\\b(usually|often|sometimes|always)\\b', 'Un mot de fréquence'], ['\\bi\\s+\\w+', 'Une phrase avec « I »']], ['present-simple']),
  listen('w1-l1', 1, [['Nora', 'Where do you live?']], 'Quelle est la question de Nora ?', ['Où habites-tu ?', 'Où travailles-tu ?', 'Comment vas-tu ?'], 0, '« Where do you live? » = Où habites-tu ?', ['ch1']),
  /* Boss chapitre 1 : conversation simple */
  listen('b1-1', 1, [['Echo', 'Hello. What is your name?']], 'Quelle réponse est correcte ?', ['My name is Alex.', 'I am fine, thanks.', 'I live in Halden.'], 0, 'On demande ton nom : My name is…', ['ch1']),
  listen('b1-2', 1, [['Echo', 'And where do you live?']], 'Quelle réponse est correcte ?', ['I live near the station.', 'I am living tomorrow.', 'Yes, I do.'], 0, 'Where → un lieu : I live near…', ['present-simple']),
  answer('b1-3', 1, 'What do you do?', 'Que fais-tu dans la vie ?', 'I work in a shop. / I’m a student.', [['\\b(i work|i\'m a|i am a|i study|i\'m an|i am an)\\b', 'Une phrase sur ton métier ou tes études']], ['present-simple']),
  listen('b1-4', 2, [['Echo', 'Do you like your job?']], 'Quelle réponse est correcte ?', ['Yes, I do. It’s interesting.', 'Yes, I like.', 'Yes, I am.'], 0, 'Réponse courte au present simple : Yes, I do. « Yes, I like » est incomplet.', ['present-simple']),
  answer('b1-5', 2, 'What do you usually do in the evening?', 'Que fais-tu généralement le soir ?', 'I usually cook dinner and watch a series.', [['\\b(usually|often|sometimes|always)\\b', 'Un mot de fréquence'], ['\\bi\\s+\\w+', 'Une phrase avec « I »']], ['present-simple']),
  qcm('b1-6', 'reflexes', 2, 'Echo répète « Sorry? ». Il n’a pas compris. Que dis-tu ?', '', ['I said I work in an office.', 'I say you work.', 'Office I work.'], 0, 'Reformuler : « I said… » (j’ai dit…).', { tags: ['ch1'] }),

  /* Chapitre 2 */
  qcm('w2-order', 'reflexes', 1, 'Au café, quelle phrase est la plus polie ?', '', ['I want a coffee.', 'I would like a coffee, please.', 'Give coffee.'], 1, '« I would like… please » est poli. « I want » peut sonner direct.', { why: ['Compréhensible mais direct.', 'Correct.', 'Trop brusque et incorrect.'], tags: ['ch2'] }),
  qcm('w2-can', 'grammar', 1, 'Complète.', '___ I pay by card?', ['Can', 'Do', 'Am'], 0, 'Demander une permission : Can I…?', { why: ['Correct.', '« Do I pay » demande si c’est obligatoire, pas une permission.', 'Incorrect avec pay.'], tags: ['ch2'] }),
  listen('w2-l1', 1, [['Leo', 'Go straight ahead, then turn left at the bank. The library is on your right.']], 'Où est la bibliothèque ?', ['Tout droit puis à gauche après la banque, sur la droite.', 'À droite de la banque, tout de suite.', 'Derrière la gare.'], 0, 'straight ahead = tout droit · turn left = tourne à gauche · on your right = sur ta droite.', ['ch2']),
  listen('w2-l2', 2, [['Clerk', 'That’s twelve fifty, please.'], ['You', 'Here you are.'], ['Clerk', 'Thanks. Would you like a receipt?']], 'Que propose le vendeur ?', ['Une réduction.', 'Un ticket de caisse.', 'Un sac.'], 1, 'receipt = ticket de caisse.', ['ch2']),
  listen('w2-l3', 2, [['Announcer', 'The next train to Riverside leaves from platform three in five minutes.']], 'D’où part le train ?', ['Du quai 3.', 'Du quai 5.', 'Du quai 13.'], 0, 'platform three = quai 3. « five minutes » est le délai.', ['ch2']),
  typed('w2-t1', 'grammar', 1, 'Complète la demande polie.', 'Could you ___ me the way to the station? (montrer)', ['show', 'tell'], 'Après could, verbe à la base : show / tell.', ['ch2']),
  order('w2-o1', 1, 'Remets dans l’ordre.', ['how', 'much', 'is', 'this', 'jacket'], 'how much is this jacket', 'Combien coûte cette veste ?', 'How much is… ? = combien coûte… ?', ['ch2']),
  repeat('w2-r1', 1, 'Could I have a coffee, please?', 'Pourrais-je avoir un café, s’il vous plaît ?', ['ch2']),
  repeat('w2-r2', 1, 'Excuse me, how do I get to the station?', 'Excusez-moi, comment puis-je aller à la gare ?', ['ch2']),
  answer('w2-a1', 2, 'What would you like to drink?', 'Que veux-tu boire ?', 'I would like a tea, please.', [['\\b(would like|\'d like|can i have|could i have)\\b', 'Une demande polie']], ['ch2']),
  answer('w2-a2', 2, 'You are lost. Ask someone how to go to the station.', 'Tu es perdu. Demande le chemin de la gare.', 'Excuse me, how do I get to the station, please?', [['\\b(how do i get|where is|could you tell me|can you tell me)\\b', 'Une question pour demander le chemin'], ['\\bstation\\b', 'Le mot station']], ['ch2']),
  listen('b2-1', 2, [['Merchant', 'Our shop opens at nine, but on Sundays we open at eleven.']], 'À quelle heure ouvre la boutique le dimanche ?', ['À 9 h.', 'À 11 h.', 'Elle est fermée.'], 1, '« on Sundays we open at eleven ».', ['ch2']),
  listen('b2-2', 2, [['Customer', 'I bought this yesterday, but it doesn’t work.'], ['Merchant', 'Do you have the receipt?'], ['Customer', 'Yes, here it is. Can I get a refund?']], 'Que veut la cliente ?', ['Un remboursement.', 'Une autre couleur.', 'Une réduction.'], 0, 'refund = remboursement.', ['ch2']),
  listen('b2-3', 2, [['Leo', 'The meeting point is the café next to the bus station, not the train station.']], 'Où est le point de rendez-vous ?', ['Au café à côté de la gare routière.', 'Au café à côté de la gare ferroviaire.', 'À la gare ferroviaire.'], 0, 'next to the bus station = à côté de la gare routière. « not the train station » est un piège.', ['ch2']),
  listen('b2-4', 3, [['Priya', 'Take the number twelve bus and get off at the third stop. Then walk past the bank.']], 'À quel arrêt faut-il descendre ?', ['Au premier.', 'Au troisième.', 'Au douzième.'], 1, 'get off at the third stop = descends au troisième arrêt.', ['ch2']),
  answer('b2-5', 2, 'The merchant asks: “Can I help you?” Ask for the price of the lantern.', 'Le marchand dit « Je peux vous aider ? ». Demande le prix de la lanterne.', 'Yes, how much is this lantern, please?', [['\\bhow much\\b', 'how much'], ['\\blantern\\b', 'Le mot lantern']], ['ch2']),

  /* Chapitre 3 */
  qcm('w3-1', 'reading', 2, 'Lis le fragment d’archive.', 'Last night, the guard was sleeping when the lights went out. Nobody saw the shadow.', ['Le garde dormait déjà quand les lumières se sont éteintes.', 'Le garde s’est endormi après la panne.', 'Le garde a vu l’ombre.'], 0, 'was sleeping (en cours) + went out (action courte qui arrive pendant).', { tags: ['past-continuous'], tense: 'past-continuous', passage: '' }),
  qcm('w3-2', 'reading', 2, 'Lis la note de Priya.', 'I have checked the archives twice. I haven’t found the code yet.', ['Elle a trouvé le code.', 'Elle n’a pas encore trouvé le code.', 'Elle vérifiera les archives demain.'], 1, 'haven’t found… yet = pas encore trouvé.', { tags: ['present-perfect'], tense: 'present-perfect' }),
  qcm('w3-3', 'reading', 3, 'Quelle phrase de l’archive décrit une habitude passée ?', '', ['The keeper locked the door every night.', 'The keeper was locking the door when he heard a noise.', 'The keeper has locked the door.'], 0, 'every night + past simple = habitude passée.', { tags: ['past-simple'], tense: 'past-simple' }),
  { id: 'w3-dec', type: 'decode', skill: 'grammar', diff: 2, tags: ['present-perfect'], prompt: 'Décode la phrase de l’archive : quel rôle joue « have » ?', decode: 'd-have-lived', options: ['Verbe principal « avoir »', 'Auxiliaire du present perfect', 'Marqueur de temps'], answer: 1, explain: 'have + participe passé (lived) = present perfect. Ici have est un auxiliaire, pas le verbe « posséder ».' },
  { id: 'b3-1', type: 'qcm', skill: 'grammar', diff: 1, tags: ['past-simple'], tense: 'past-simple', prompt: 'Énigme 1 : la porte s’ouvre si la phrase est correcte.', text: 'The keeper ___ the key yesterday.', options: ['lose', 'lost', 'has lost'], answer: 1, explain: 'yesterday, action terminée : past simple lost.' },
  { id: 'b3-2', type: 'type', skill: 'grammar', diff: 2, tags: ['past-continuous'], tense: 'past-continuous', prompt: 'Énigme 2 : complète avec « read » au past continuous.', text: 'I ___ when the lights went out.', answer: ['was reading'], explain: 'Action en cours interrompue : was + reading.' },
  { id: 'b3-3', type: 'qcm', skill: 'grammar', diff: 2, tags: ['present-perfect'], tense: 'present-perfect', prompt: 'Énigme 3 : choisis la phrase vraie.', text: 'The archive is still closed. Someone ___ the code.', options: ['changed yesterday', 'has changed', 'is change'], answer: 1, explain: 'Le résultat est visible maintenant (toujours fermé) : present perfect.' },
  { id: 'b3-4', type: 'type', skill: 'grammar', diff: 2, tags: ['past-simple'], tense: 'past-simple', prompt: 'Énigme 4 : transforme en question.', text: 'The shadow took the book. → What ___ ?', answer: ['did the shadow take'], explain: 'What + did + sujet + verbe à la base.' },
  { id: 'b3-5', type: 'qcm', skill: 'grammar', diff: 3, tags: ['present-perfect'], tense: 'present-perfect', prompt: 'Énigme 5 : since ou for ?', text: 'The tower has been closed ___ 1998.', options: ['for', 'since', 'during'], answer: 1, explain: 'since + point de départ (1998).' },
  { id: 'b3-6', type: 'order', skill: 'reflexes', diff: 3, tags: ['present-perfect'], tense: 'present-perfect', prompt: 'Énigme finale : remets la formule dans l’ordre.', words: ['we', 'have', 'never', 'given', 'up'], answer: 'we have never given up', fr: 'Nous n’avons jamais abandonné.', explain: 'have + never + participe passé.' },

  /* Chapitre 4 */
  answer('w4-a1', 2, 'Have you ever travelled abroad? Tell me about it.', 'As-tu déjà voyagé à l’étranger ? Raconte.', 'Yes, I have. I went to Spain last year. It was great.', [['\\b(have|has|\'ve)\\b', 'Present perfect (expérience)'], ['\\b(went|was|visited|saw|stayed)\\b', 'Past simple pour les détails']], ['present-perfect']),
  answer('w4-a2', 2, 'What are you going to do next weekend?', 'Que vas-tu faire le week-end prochain ?', 'I’m going to visit my parents.', [['going\\s+to', 'be going to']], ['future-going-to']),
  listen('w4-l1', 2, [['Marcus', 'I’ve been to twelve countries, but I’ve never been to Japan. I’m going to go there next spring.']], 'Que dit Marcus sur le Japon ?', ['Il y est déjà allé.', 'Il n’y est jamais allé mais va y aller au printemps.', 'Il y habite.'], 1, 'never been = jamais allé · going to go = va y aller.', ['present-perfect']),
  repeat('w4-r1', 2, 'I have never been to Japan, but I would love to go.', 'Je ne suis jamais allé au Japon, mais j’adorerais y aller.', ['present-perfect']),
  answer('b4-1', 2, 'Hi! I’m Marcus. Where are you from?', 'Salut, je suis Marcus. D’où viens-tu ?', 'I’m from France. I live in Lyon.', [['\\b(i\'m from|i am from|i come from)\\b', 'D’où tu viens']], ['ch4']),
  answer('b4-2', 2, 'Have you ever been to London?', 'Es-tu déjà allé à Londres ?', 'No, I haven’t, but I’d like to go. / Yes, I have. I went there in 2019.', [['\\b(i have|i haven\'t|i\'ve|i have never|no i haven\'t|yes i have)\\b', 'Réponse au present perfect']], ['present-perfect']),
  answer('b4-3', 2, 'What did you do last weekend?', 'Qu’as-tu fait le week-end dernier ?', 'I visited a friend and we watched a film.', [['\\b(went|visited|watched|saw|played|had|ate|did|stayed|met|cooked|worked)\\b', 'Un verbe au past simple']], ['past-simple']),
  answer('b4-4', 3, 'How long have you been learning English?', 'Depuis combien de temps apprends-tu l’anglais ?', 'I have been learning English for three years.', [['been\\s+learning|been\\s+studying', 'have been + -ing'], ['\\b(for|since)\\b', 'for ou since']], ['present-perfect-continuous']),
  answer('b4-5', 2, 'What are you going to do after this conversation?', 'Que vas-tu faire après cette conversation ?', 'I’m going to have dinner.', [['going\\s+to|\\bwill\\b|\'ll', 'Une forme du futur']], ['future-going-to']),
  answer('b4-6', 3, 'Why do you want to speak English?', 'Pourquoi veux-tu parler anglais ?', 'Because I want to travel and I need it for my job.', [['\\bbecause\\b', 'because (parce que)']], ['ch4']),

  /* Chapitre 6 : boss final, combinaison des compétences */
  listen('b6-1', 2, [['Shadow Lord', 'You will never understand me. Nobody here has ever understood anyone.']], 'Que prétend le Seigneur des Ombres ?', ['Que personne ici n’a jamais compris personne.', 'Qu’il va t’aider.', 'Qu’il ne parle pas anglais.'], 0, 'has ever understood = a jamais compris (present perfect, expérience).', ['present-perfect']),
  { id: 'b6-2', type: 'qcm', skill: 'grammar', diff: 2, tags: ['future-compare'], tense: 'future-compare', prompt: 'Riposte : choisis la forme qui exprime ta décision immédiate.', text: '“Then I ___ show you!”', options: ['’ll', '’m going to', 'am showing'], answer: 0, explain: 'Décision prise à l’instant : will (’ll).' },
  { id: 'b6-3', type: 'qcm', skill: 'reading', diff: 3, tags: ['toeic-p7'], prompt: 'Lis le message intercepté.', passage: 'To all shadow units:\nThe Lantern Society has moved its archive to the north tower. The transfer was completed yesterday. Do not attack before midnight.', options: ['L’archive sera déplacée demain.', 'Le transfert a été terminé hier.', 'Les Ombres doivent attaquer avant minuit.'], answer: 1, explain: '« The transfer was completed yesterday » = terminé hier.' },
  { id: 'b6-4', type: 'type', skill: 'grammar', diff: 3, tags: ['present-perfect-continuous'], tense: 'present-perfect-continuous', prompt: 'Complète avec « fight » (durée qui continue).', text: 'We ___ the shadows for months.', answer: ['have been fighting', "'ve been fighting"], explain: 'have been + -ing : action qui dure et continue.' },
  answer('b6-5', 3, 'Tell the Shadow Lord why words matter to you.', 'Dis au Seigneur des Ombres pourquoi les mots comptent pour toi.', 'Words matter because they help people understand each other.', [['\\bbecause\\b', 'because'], ['\\b(understand|help|people|connect|talk)\\b', 'Une idée sur la compréhension']], ['ch6']),
  order('b6-6', 3, 'Le mot de pouvoir final : remets dans l’ordre.', ['I', 'have', 'learned', 'to', 'speak', 'without', 'fear'], 'i have learned to speak without fear', 'J’ai appris à parler sans peur.', 'have + participe passé + to + verbe.', ['present-perfect'])
];

/* ---------- Dialogues ---------- */
/* Chaque ligne : [personnage, anglais, français, phrase à décoder (facultatif)] ; choice = réponse du joueur */
export const DIALOGUES = {
  'd1-intro': [
    ['nora', 'Hey. You can see the shadows too, right?', 'Hé. Toi aussi, tu vois les ombres, n’est-ce pas ?'],
    ['nora', 'Don’t worry. My name is Nora. I work for the Lantern Society.', 'Ne t’inquiète pas. Je m’appelle Nora. Je travaille pour la Société des Lanternes.'],
    ['nora', 'The shadows steal words. When people stop understanding each other, the shadows grow.', 'Les ombres volent les mots. Quand les gens arrêtent de se comprendre, les ombres grandissent.'],
    { choice: 'Comment réponds-tu ?', options: [['Nice to meet you, Nora. How can I help?', true, 'Parfait : poli et naturel.'], ['I am help you.', false, 'On dirait « I can help you » ou « How can I help? ».'], ['Yes, I see.', true, 'Correct, même si c’est un peu court.']] },
    ['nora', 'Good. Words are your power now. Every word you learn is a light.', 'Bien. Les mots sont ton pouvoir maintenant. Chaque mot que tu apprends est une lumière.'],
    ['nora', 'Let’s start with the basics. Tell me about yourself.', 'Commençons par les bases. Parle-moi de toi.']
  ],
  'd1-day': [
    ['nora', 'To find the shadows, we need to know the city. What do you usually do every day?', 'Pour trouver les ombres, il faut connaître la ville. Que fais-tu généralement chaque jour ?'],
    ['nora', 'I usually wake up at six. I run, then I go to the office.', 'D’habitude, je me réveille à six heures. Je cours, puis je vais au bureau.'],
    ['nora', 'She is working today.', 'Elle travaille aujourd’hui.', 'd-she-working'],
    ['nora', 'That woman over there? She is working today, but she usually works at night. Strange, right?', 'Cette femme là-bas ? Elle travaille aujourd’hui, mais d’habitude elle travaille la nuit. Bizarre, non ?']
  ],
  'd2-cafe': [
    ['leo', 'Welcome to the Copper Cup! What would you like?', 'Bienvenue au Copper Cup ! Que désires-tu ?'],
    { choice: 'Commande poliment.', options: [['I would like a coffee, please.', true, 'Parfait.'], ['Coffee. Now.', false, 'Compréhensible mais impoli.'], ['Can I have a coffee, please?', true, 'Parfait aussi.']] },
    ['leo', 'Sure. That’s three fifty. By the way, Nora told me about you.', 'Bien sûr. Ça fait trois cinquante. Au fait, Nora m’a parlé de toi.'],
    ['leo', 'People in the market can’t understand each other anymore. Prices, directions… everything is confusing.', 'Les gens du marché n’arrivent plus à se comprendre. Les prix, les directions… tout est confus.'],
    ['leo', 'Could you help them? Go straight ahead, then turn left at the bank.', 'Tu pourrais les aider ? Va tout droit, puis tourne à gauche à la banque.', 'd-could-you']
  ],
  'd3-archives': [
    ['priya', 'These are the Forgotten Archives. The shadows have erased half of the books.', 'Voici les Archives oubliées. Les ombres ont effacé la moitié des livres.'],
    ['priya', 'I have lived here since 2020. I have never seen it this dark.', 'J’habite ici depuis 2020. Je ne l’ai jamais vu aussi sombre.', 'd-have-lived'],
    ['priya', 'The keeper was sleeping when they came. He didn’t see anything.', 'Le gardien dormait quand elles sont venues. Il n’a rien vu.', 'd-was-sleeping'],
    { choice: 'Qu’a fait le gardien ?', options: [['He was sleeping, so he didn’t see the shadows.', true, 'Exact : was sleeping + didn’t see.'], ['He saw the shadows.', false, 'Relis : « He didn’t see anything ».']] },
    ['priya', 'To restore the books, you must master the tenses. Time is the key here.', 'Pour restaurer les livres, tu dois maîtriser les temps. Ici, le temps est la clé.']
  ],
  'd4-network': [
    ['marcus', 'So you’re the new Lantern. I’m Marcus. I’ve been to twelve countries for the Network.', 'Alors c’est toi la nouvelle Lanterne. Je suis Marcus. Je suis allé dans douze pays pour le Réseau.'],
    ['marcus', 'Have you ever been abroad?', 'Es-tu déjà allé à l’étranger ?', 'd-have-you-ever'],
    { choice: 'Réponds à Marcus.', options: [['No, I haven’t, but I’m going to travel next year.', true, 'Très bien : present perfect + projet.'], ['No, I didn’t never.', false, 'Double négation, et on dirait « No, I haven’t ».'], ['Yes, I have. I went to Italy.', true, 'Parfait : expérience puis détail au past simple.']] },
    ['marcus', 'Travellers have to talk to strangers, fast. That’s where you’ll grow.', 'Les voyageurs doivent parler à des inconnus, vite. C’est là que tu vas progresser.']
  ],
  'd5-tower': [
    ['nora', 'This is the Tower of Trials. Each floor is a part of the exam the shadows fear the most.', 'Voici la Tour des épreuves. Chaque étage est une partie de l’examen que les ombres redoutent le plus.'],
    ['nora', 'Listening, reading, time pressure. Don’t panic. Read the question first, then listen.', 'Écoute, lecture, pression du temps. Pas de panique. Lis la question d’abord, puis écoute.'],
    ['priya', 'The exercises here are our own training, not the official test. But the format is the same.', 'Les exercices d’ici sont notre propre entraînement, pas le test officiel. Mais le format est le même.']
  ],
  'd6-fortress': [
    ['shadow', 'So, the little Lantern has come. Do you really think words can stop me?', 'Alors, la petite Lanterne est venue. Tu crois vraiment que des mots peuvent m’arrêter ?'],
    { choice: 'Ta réponse :', options: [['Yes. I have learned to understand, and I won’t stop now.', true, 'Puissant et correct.'], ['Yes. I learn since months.', false, 'On dirait « I have been learning for months ».']] },
    ['nora', 'Everything you’ve learned is with you. Listen, read, speak. Together.', 'Tout ce que tu as appris est avec toi. Écoute, lis, parle. Ensemble.']
  ]
};

/* ---------- Chapitres et quêtes ---------- */
/* step : { dialogue } | { items: [...ids] } | { tense: id, count } | { vocab: [...ids] } | { toeic: [parts], count } */
export const CHAPTERS = [
  {
    n: 1, title: 'Le quartier des premières voix', region: 'Maple District', color: '#6C4CF1',
    intro: 'Un quartier tranquille où les voisins ne se parlent plus. Tu y rencontres Nora, qui t’ouvre les yeux sur les Ombres.',
    goals: 'Se présenter, parler de sa journée, construire des phrases simples, comprendre les questions courantes.',
    quests: [
      { id: 'q1-1', cat: 'principale', title: 'L’éveil', objective: 'Rencontrer Nora et apprendre à se présenter.', mins: 6, skill: 'reflexes', diff: 1, xp: 40, steps: [{ dialogue: 'd1-intro' }, { vocab: ['nice-to-meet', 'what-do-you-do', 'live', 'work', 'job'] }, { items: ['w1-hello', 'w1-what-do', 'w1-live', 'w1-o1'] }] },
      { id: 'q1-2', cat: 'principale', title: 'La routine de la ville', objective: 'Décrire une journée au present simple.', mins: 7, skill: 'grammar', diff: 1, xp: 50, steps: [{ dialogue: 'd1-day' }, { tense: 'present-simple', count: 5 }, { items: ['w1-o2', 'w1-t1'] }] },
      { id: 'q1-3', cat: 'orale', title: 'Ta première voix', objective: 'Te présenter à voix haute.', mins: 6, skill: 'speaking', diff: 1, xp: 50, steps: [{ items: ['w1-r1', 'w1-r2', 'w1-a1', 'w1-a2'] }] },
      { id: 'q1-4', cat: 'secondaire', title: 'Les mots du quartier', objective: 'Découvrir le vocabulaire de la vie quotidienne.', mins: 5, skill: 'grammar', diff: 1, xp: 30, steps: [{ vocab: ['wake-up', 'commute', 'busy', 'tired', 'neighbour', 'groceries', 'early', 'late'] }, { items: ['w1-l1'] }] },
      { id: 'q1-5', cat: 'secondaire', title: 'Ce qui se passe maintenant', objective: 'Distinguer habitude et action en cours.', mins: 6, skill: 'grammar', diff: 1, xp: 40, steps: [{ tense: 'present-continuous', count: 5 }] }
    ],
    boss: { id: 'boss1', name: 'Echo, l’Ombre muette', desc: 'Une ombre qui vole les premières phrases. Tiens une conversation simple d’environ une minute.', items: ['b1-1', 'b1-2', 'b1-3', 'b1-4', 'b1-5', 'b1-6'], pass: 0.7, reward: { xp: 150, item: 'aura-dawn' } }
  },
  {
    n: 2, title: 'La cité des échanges', region: 'Copper Market', color: '#FF6B9A',
    intro: 'Le grand marché de Halden : cafés, boutiques, gares. Les Ombres y brouillent les prix et les directions.',
    goals: 'Demander une information, comprendre des instructions, utiliser les expressions courantes.',
    quests: [
      { id: 'q2-1', cat: 'principale', title: 'Le Copper Cup', objective: 'Commander poliment et comprendre Leo.', mins: 7, skill: 'reflexes', diff: 1, xp: 50, steps: [{ dialogue: 'd2-cafe' }, { vocab: ['would-like', 'order', 'price', 'receipt', 'by-the-way'] }, { items: ['w2-order', 'w2-can', 'w2-o1'] }] },
      { id: 'q2-2', cat: 'principale', title: 'Les rues brouillées', objective: 'Comprendre un itinéraire et des annonces.', mins: 7, skill: 'listening', diff: 2, xp: 60, steps: [{ vocab: ['straight', 'turn', 'platform', 'get-off', 'miss', 'ticket'] }, { items: ['w2-l1', 'w2-l3', 'w2-t1'] }] },
      { id: 'q2-3', cat: 'orale', title: 'La voix du marché', objective: 'Commander et demander ton chemin à l’oral.', mins: 7, skill: 'speaking', diff: 1, xp: 60, steps: [{ items: ['w2-r1', 'w2-r2', 'w2-a1', 'w2-a2'] }] },
      { id: 'q2-4', cat: 'secondaire', title: 'Le comptoir des prix', objective: 'Vocabulaire des achats.', mins: 5, skill: 'grammar', diff: 1, xp: 30, steps: [{ vocab: ['afford', 'refund', 'discount', 'size', 'how-about'] }, { items: ['w2-l2'] }] }
    ],
    boss: { id: 'boss2', name: 'Le Marchand d’Ombres', desc: 'Il embrouille tout ce qu’il dit. Comprends ses dialogues pour accomplir la mission.', items: ['b2-1', 'b2-2', 'b2-3', 'b2-4', 'b2-5'], pass: 0.7, reward: { xp: 180, item: 'comp-fox' } }
  },
  {
    n: 3, title: 'Les archives oubliées', region: 'Old Library', color: '#2F80ED',
    intro: 'Une bibliothèque immense dont les livres s’effacent. Priya y cherche le code des Ombres.',
    goals: 'Comprendre des textes courts, les structures grammaticales et les temps du passé.',
    quests: [
      { id: 'q3-1', cat: 'principale', title: 'Le gardien endormi', objective: 'Raconter une action passée et une action en cours.', mins: 8, skill: 'grammar', diff: 2, xp: 60, steps: [{ dialogue: 'd3-archives' }, { tense: 'past-simple', count: 4 }, { tense: 'past-continuous', count: 3 }] },
      { id: 'q3-2', cat: 'principale', title: 'Le lien du temps', objective: 'Comprendre le present perfect.', mins: 8, skill: 'grammar', diff: 2, xp: 70, steps: [{ tense: 'present-perfect', count: 6 }, { items: ['w3-dec'] }] },
      { id: 'q3-3', cat: 'secondaire', title: 'Fragments d’archives', objective: 'Lire de courts textes.', mins: 5, skill: 'reading', diff: 2, xp: 40, steps: [{ items: ['w3-1', 'w3-2', 'w3-3'] }] }
    ],
    boss: { id: 'boss3', name: 'Le Gardien des Archives', desc: 'Six énigmes de plus en plus difficiles. Chaque bonne réponse rallume une étagère.', items: ['b3-1', 'b3-2', 'b3-3', 'b3-4', 'b3-5', 'b3-6'], pass: 0.7, reward: { xp: 200, item: 'aura-archive' } }
  },
  {
    n: 4, title: 'Le réseau des voyageurs', region: 'Harbor Station', color: '#FFD166',
    intro: 'Un réseau secret de voyageurs qui relient les villes. Ici, il faut parler vite et spontanément.',
    goals: 'Dialogues spontanés, expériences, projets, compréhension orale.',
    quests: [
      { id: 'q4-1', cat: 'principale', title: 'Marcus', objective: 'Parler de tes expériences.', mins: 7, skill: 'speaking', diff: 2, xp: 60, steps: [{ dialogue: 'd4-network' }, { vocab: ['abroad', 'flight', 'luggage', 'booking', 'check-in', 'delay'] }, { items: ['w4-l1', 'w4-r1', 'w4-a1'] }] },
      { id: 'q4-2', cat: 'principale', title: 'Cap sur demain', objective: 'Parler de tes projets avec les bons futurs.', mins: 7, skill: 'grammar', diff: 2, xp: 60, steps: [{ tense: 'future-will', count: 3 }, { tense: 'future-going-to', count: 3 }, { tense: 'future-compare', count: 3 }, { items: ['w4-a2'] }] },
      { id: 'q4-3', cat: 'secondaire', title: 'Le temps qui dure', objective: 'Present perfect continuous.', mins: 5, skill: 'grammar', diff: 2, xp: 40, steps: [{ tense: 'present-perfect-continuous', count: 4 }] }
    ],
    boss: { id: 'boss4', name: 'Le Passeur silencieux', desc: 'Une conversation simulée d’environ deux minutes avec un voyageur pressé.', items: ['b4-1', 'b4-2', 'b4-3', 'b4-4', 'b4-5', 'b4-6'], pass: 0.65, reward: { xp: 220, item: 'outfit-traveller' } }
  },
  {
    n: 5, title: 'La tour des épreuves', region: 'Tower of Trials', color: '#FF5B6E',
    intro: 'Chaque étage reproduit une partie du TOEIC Listening & Reading. Les Ombres détestent les gens préparés.',
    goals: 'Types de questions, dialogues, textes professionnels, grammaire utile, gestion du temps.',
    quests: [
      { id: 'q5-1', cat: 'toeic', title: 'Étage de l’écoute', objective: 'Parties 2, 3 et 4.', mins: 8, skill: 'listening', diff: 2, xp: 70, steps: [{ dialogue: 'd5-tower' }, { toeic: [2, 3, 4], count: 8 }] },
      { id: 'q5-2', cat: 'toeic', title: 'Étage de la lecture', objective: 'Parties 5, 6 et 7.', mins: 8, skill: 'reading', diff: 2, xp: 70, steps: [{ toeic: [5, 6, 7], count: 8 }] },
      { id: 'q5-3', cat: 'secondaire', title: 'Le vocabulaire des bureaux', objective: 'Mots professionnels fréquents au TOEIC.', mins: 6, skill: 'grammar', diff: 2, xp: 40, steps: [{ vocab: ['invoice', 'shipment', 'warehouse', 'branch', 'inquiry', 'due', 'in-charge', 'purchase'] }] }
    ],
    boss: { id: 'boss5', name: 'La Sentinelle du chronomètre', desc: 'Mini-test chronométré (écoute + lecture), puis bilan de tes erreurs par partie.', toeicTest: { parts: [2, 3, 4, 5, 6, 7], count: 12, seconds: 600 }, pass: 0.65, reward: { xp: 260, item: 'aura-gold' } }
  },
  {
    n: 6, title: 'La forteresse des Ombres', region: 'Shadow Keep', color: '#1E1B2E',
    intro: 'Le cœur des Ombres. Tout ce que tu as appris doit fonctionner ensemble.',
    goals: 'Combiner écoute, lecture, vocabulaire, grammaire et expression orale.',
    quests: [
      { id: 'q6-1', cat: 'principale', title: 'Les portes noires', objective: 'Affronter la voix du Seigneur des Ombres.', mins: 5, skill: 'reflexes', diff: 3, xp: 60, steps: [{ dialogue: 'd6-fortress' }] }
    ],
    boss: { id: 'boss6', name: 'Le Seigneur des Ombres', desc: 'L’épreuve de maîtrise : écoute, lecture, grammaire et oral. Les questions s’adaptent à ton niveau.', items: ['b6-1', 'b6-2', 'b6-3', 'b6-4', 'b6-5', 'b6-6'], pass: 0.7, reward: { xp: 400, item: 'form-lantern' } }
  }
];

/* Quêtes secondaires propres à chaque classe (mêmes contenus pédagogiques, présentation différente) */
export const CLASS_QUESTS = {
  combattant: { id: 'qc-combattant', ch: 1, cat: 'secondaire', title: 'L’arène des réflexes', objective: 'Réponds vite : 8 questions de grammaire contre la montre.', mins: 5, skill: 'reflexes', diff: 1, xp: 40, timed: 90, steps: [{ tense: 'present-simple', count: 4 }, { tense: 'present-continuous', count: 4 }] },
  stratege: { id: 'qc-stratege', ch: 1, cat: 'secondaire', title: 'L’échiquier des phrases', objective: 'Reconstruis des phrases mot à mot.', mins: 5, skill: 'reflexes', diff: 1, xp: 40, steps: [{ items: ['w1-o1', 'w1-o2', 'ps5', 'pc5', 'w2-o1'] }] },
  explorateur: { id: 'qc-explorateur', ch: 1, cat: 'secondaire', title: 'Le carnet de Leo', objective: 'Explore des documents de la ville.', mins: 5, skill: 'reading', diff: 1, xp: 40, steps: [{ toeic: [7], count: 3 }] },
  technicien: { id: 'qc-technicien', ch: 1, cat: 'secondaire', title: 'Le mécanisme des questions', objective: 'Transforme des phrases en questions et négations.', mins: 5, skill: 'grammar', diff: 1, xp: 40, steps: [{ items: ['ps3', 'ps6', 'pc6', 'pa3', 'pa6'] }] }
};

export const QUEST_CATS = {
  principale: 'Quête principale', quotidienne: 'Quête quotidienne', secondaire: 'Quête secondaire', revision: 'Quête de révision',
  maitrise: 'Quête de maîtrise', toeic: 'Quête TOEIC', orale: 'Quête orale'
};

/* ---------- Évaluation initiale (courte) ---------- */
export const PLACEMENT = [
  { id: 'pl1', area: 'vocab', type: 'qcm', skill: 'grammar', diff: 1, prompt: 'Que veut dire « busy » ?', text: 'I’m busy right now.', options: ['occupé', 'fatigué', 'en retard'], answer: 0, explain: 'busy = occupé.' },
  { id: 'pl2', area: 'vocab', type: 'qcm', skill: 'grammar', diff: 2, prompt: 'Que veut dire « actually » ?', text: 'Actually, I live in Lyon.', options: ['actuellement', 'en fait', 'finalement'], answer: 1, explain: 'actually = en fait (faux ami).' },
  { id: 'pl3', area: 'vocab', type: 'qcm', skill: 'grammar', diff: 3, prompt: 'Que veut dire « postpone » ?', text: 'They postponed the meeting.', options: ['annuler', 'reporter', 'préparer'], answer: 1, explain: 'postpone = reporter.' },
  { id: 'pl4', area: 'sentences', type: 'qcm', skill: 'reading', diff: 1, prompt: 'Traduction de « She doesn’t work on Mondays. »', text: '', options: ['Elle ne travaille pas le lundi.', 'Elle n’a pas travaillé lundi.', 'Elle ne travaillera pas lundi.'], answer: 0, explain: 'doesn’t + work : présent, habitude.' },
  { id: 'pl5', area: 'tenses', type: 'qcm', skill: 'grammar', diff: 1, prompt: 'Complète.', text: 'Look! The children ___ in the garden.', options: ['play', 'are playing', 'played'], answer: 1, explain: 'Action en cours : are playing.' },
  { id: 'pl6', area: 'tenses', type: 'qcm', skill: 'grammar', diff: 2, prompt: 'Complète.', text: 'I ___ him yesterday.', options: ['have seen', 'saw', 'see'], answer: 1, explain: 'Moment passé terminé : saw.' },
  { id: 'pl7', area: 'tenses', type: 'qcm', skill: 'grammar', diff: 3, prompt: 'Complète.', text: 'She ___ here since 2018.', options: ['works', 'has worked', 'worked'], answer: 1, explain: 'Situation qui continue depuis 2018 : has worked.' },
  { id: 'pl8', area: 'reading', type: 'qcm', skill: 'reading', diff: 2, prompt: 'Lis l’affiche.', passage: 'NOTICE: The office will be closed on Friday. Urgent requests: call 555-0199.', options: ['Le bureau ouvre vendredi.', 'Le bureau est fermé vendredi.', 'Il faut écrire un e-mail.'], answer: 1, explain: 'will be closed on Friday = sera fermé vendredi.' },
  { id: 'pl9', area: 'listening', type: 'listen', skill: 'listening', diff: 1, prompt: 'Écoute, puis réponds.', audio: [['A', 'What time does the meeting start?']], question: 'Que demande la personne ?', options: ['L’heure de la réunion.', 'Le lieu de la réunion.', 'Le nom du responsable.'], answer: 0, explain: 'What time = à quelle heure.', transcript: 'What time does the meeting start?' },
  { id: 'pl10', area: 'listening', type: 'listen', skill: 'listening', diff: 2, prompt: 'Écoute, puis réponds.', audio: [['A', 'I’m sorry, the manager has just left. Can I take a message?']], question: 'Où est le responsable ?', options: ['Il vient de partir.', 'Il arrive bientôt.', 'Il est en réunion.'], answer: 0, explain: 'has just left = vient de partir.', transcript: 'I’m sorry, the manager has just left. Can I take a message?' },
  { id: 'pl11', area: 'building', type: 'order', skill: 'reflexes', diff: 1, prompt: 'Remets les mots dans l’ordre.', words: ['do', 'you', 'live', 'where'], answer: 'where do you live', fr: 'Où habites-tu ?', explain: 'Mot interrogatif + do + sujet + verbe.' },
  { id: 'pl12', area: 'building', type: 'order', skill: 'reflexes', diff: 2, prompt: 'Remets les mots dans l’ordre.', words: ['have', 'never', 'I', 'been', 'London', 'to'], answer: 'i have never been to london', fr: 'Je ne suis jamais allé à Londres.', explain: 'have + never + participe passé.' }
];
export const PLACEMENT_AREAS = { vocab: 'Vocabulaire', sentences: 'Phrases simples', tenses: 'Temps principaux', reading: 'Compréhension écrite', listening: 'Compréhension orale', building: 'Construction de phrases' };

/* ---------- Objets cosmétiques (n’influencent jamais l’apprentissage) ---------- */
export const COSMETICS = [
  { id: 'outfit-start', kind: 'outfit', name: 'Tenue de départ', unlock: 'Dès le début', level: 1 },
  { id: 'outfit-street', kind: 'outfit', name: 'Veste urbaine', unlock: 'Niveau 4', level: 4 },
  { id: 'outfit-agent', kind: 'outfit', name: 'Manteau d’agent', unlock: 'Niveau 8', level: 8 },
  { id: 'outfit-traveller', kind: 'outfit', name: 'Tenue de voyageur', unlock: 'Boss du chapitre 4' },
  { id: 'aura-dawn', kind: 'aura', name: 'Aura de l’aube', unlock: 'Boss du chapitre 1', color: '#FFD166' },
  { id: 'aura-archive', kind: 'aura', name: 'Aura des archives', unlock: 'Boss du chapitre 3', color: '#2F80ED' },
  { id: 'aura-gold', kind: 'aura', name: 'Aura dorée', unlock: 'Boss du chapitre 5', color: '#FFD166' },
  { id: 'comp-fox', kind: 'companion', name: 'Renard de lumière', unlock: 'Boss du chapitre 2' },
  { id: 'comp-drone', kind: 'companion', name: 'Drone éclaireur', unlock: 'Série de 7 jours', streak: 7 },
  { id: 'form-lantern', kind: 'form', name: 'Forme Lanterne', unlock: 'Boss final' }
];

export const BADGES = {
  'first-session': 'Première session complète',
  'streak-7': '7 jours de série',
  'streak-30': '30 jours de série',
  'boss-1': 'Echo vaincu', 'boss-2': 'Marchand vaincu', 'boss-3': 'Gardien vaincu', 'boss-4': 'Passeur vaincu', 'boss-5': 'Sentinelle vaincue', 'boss-6': 'Seigneur des Ombres vaincu',
  'tense-master': 'Premier temps maîtrisé',
  'words-25': '25 mots retenus'
};

/* ---------- Direction artistique : illustrations du jeu (dossier img/) ---------- */
/* Portraits jouables par classe. Une seule illustration par portrait : l’apparence se choisit parmi ces héros. */
export const PORTRAITS = [
  { id: 'heros-toi', cls: 'combattant', name: 'Le Combattant', img: 'img/heros-toi.webp', face: '47% 7%', full: '50% 8%' },
  { id: 'combattant', cls: 'combattant', name: 'La Combattante', img: 'img/combattant.webp', face: '50% 12%', full: '50% 18%' },
  { id: 'stratege', cls: 'stratege', name: 'Le Stratège', img: 'img/stratege.webp', face: '50% 14%', full: '50% 24%' },
  { id: 'explorateur', cls: 'explorateur', name: 'L’Exploratrice', img: 'img/explorateur.webp', face: '40% 9%', full: '38% 16%' },
  { id: 'technicien', cls: 'technicien', name: 'Le Technicien', img: 'img/technicien.webp', face: '50% 6%', full: '42% 14%' }
];
export const PORTRAIT_BY_ID = Object.fromEntries(PORTRAITS.map(p => [p.id, p]));

/* Décor de chaque chapitre, et position de son quartier sur la carte (en % de l’illustration img/carte.webp) */
export const CHAPTER_ART = {
  1: { img: 'img/titre.webp', pos: '50% 70%', x: 52, y: 80 },
  2: { img: 'img/cafe.webp', pos: '50% 20%', x: 38, y: 62 },
  3: { img: 'img/explorateur.webp', pos: '70% 40%', x: 46, y: 41 },
  4: { img: 'img/technicien.webp', pos: '60% 30%', x: 76, y: 27 },
  5: { img: 'img/stratege.webp', pos: '50% 30%', x: 51, y: 16 },
  6: { img: 'img/boss.webp', pos: '50% 20%', x: 53, y: 5 }
};
/* Décor des dialogues */
export const DIALOGUE_ART = {
  'd1-intro': 'img/titre.webp', 'd1-day': 'img/titre.webp', 'd2-cafe': 'img/cafe.webp', 'd3-archives': 'img/explorateur.webp',
  'd4-network': 'img/technicien.webp', 'd5-tower': 'img/stratege.webp', 'd6-fortress': 'img/boss.webp'
};
/* Les boss partagent l’illustration de l’Ombre ; chacun a sa teinte */
export const BOSS_HUE = { 1: 0, 2: 40, 3: 200, 4: 120, 5: 280, 6: 330 };

/* ---------- Exercices de traduction (français → anglais), corrigés avec une règle et un exemple ---------- */
const tr = (id, diff, fr, answers, explain, tags) => ({ id, type: 'type', skill: 'grammar', diff, tags: ['traduction', ...tags], prompt: 'Traduis en anglais.', text: '« ' + fr + ' »', answer: answers, explain });
WORLD_ITEMS.push(
  tr('tr1-1', 1, 'Je travaille dans un bureau.', ['I work in an office'], 'Règle : habitude ou fait = present simple, sujet + verbe. Exemple : She works in a shop.', ['present-simple']),
  tr('tr1-2', 1, 'Elle ne parle pas anglais.', ["She doesn't speak English", 'She does not speak English'], 'Règle : négation au present simple = doesn’t + verbe à la base (speak, pas speaks). Exemple : He doesn’t eat meat.', ['present-simple']),
  tr('tr1-3', 1, 'Où habites-tu ?', ['Where do you live'], 'Règle : question = mot interrogatif + do + sujet + verbe. Exemple : What do you do?', ['present-simple']),
  tr('tr1-4', 2, 'Je suis en train de lire.', ["I'm reading", 'I am reading'], 'Règle : action en cours = be + verbe en -ing. Exemple : They are waiting.', ['present-continuous']),
  tr('tr2-1', 1, 'Je voudrais un café, s’il vous plaît.', ["I would like a coffee please", "I'd like a coffee please", 'Could I have a coffee please', 'Can I have a coffee please'], 'Règle : demande polie = I would like / Could I have… Exemple : I’d like a tea, please.', ['ch2']),
  tr('tr2-2', 2, 'Combien coûte ce billet ?', ['How much is this ticket', 'How much does this ticket cost'], 'Règle : prix = How much is… ? Exemple : How much is this jacket?', ['ch2']),
  tr('tr2-3', 2, 'J’ai raté le bus hier.', ['I missed the bus yesterday', 'Yesterday I missed the bus'], 'Règle : action terminée avec un moment passé = past simple (-ed). Exemple : I called him yesterday.', ['past-simple']),
  tr('tr2-4', 3, 'J’habite ici depuis deux ans.', ["I have lived here for two years", "I've lived here for two years", "I have been living here for two years", "I've been living here for two years"], 'Règle : situation qui dure encore = present perfect + for (durée). Le français dit « j’habite », l’anglais non. Exemple : She has worked here since 2020.', ['present-perfect'])
);
CHAPTERS[0].quests.push({ id: 'q1-6', cat: 'secondaire', title: 'Le carnet de Nora', objective: 'Traduire tes premières phrases sans aide.', mins: 5, skill: 'grammar', diff: 1, xp: 40, steps: [{ items: ['tr1-1', 'tr1-2', 'tr1-3', 'tr1-4'] }] });
CHAPTERS[1].quests.push({ id: 'q2-5', cat: 'secondaire', title: 'Les messages du marché', objective: 'Traduire des phrases de la vie courante.', mins: 6, skill: 'grammar', diff: 2, xp: 50, steps: [{ items: ['tr2-1', 'tr2-2', 'tr2-3', 'tr2-4'] }] });
