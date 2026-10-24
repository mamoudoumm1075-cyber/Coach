/* Académie des temps anglais.
   Règle d’or rappelée partout : un marqueur (yesterday, already…) est un indice, pas une règle automatique.
   C’est le sens et le contexte qui décident du temps. */

const q = (id, tense, diff, prompt, text, options, answer, explain, why) =>
  ({ id, type: 'qcm', skill: 'grammar', tense, tags: [tense], diff, prompt, text, options, answer, explain, why });
const t = (id, tense, diff, prompt, text, answers, explain) =>
  ({ id, type: 'type', skill: 'grammar', tense, tags: [tense], diff, prompt, text, answer: answers, explain });
const o = (id, tense, diff, prompt, words, answer, fr, explain) =>
  ({ id, type: 'order', skill: 'reflexes', tense, tags: [tense], diff, prompt, words, answer, fr, explain });

export const TENSES = [
  {
    id: 'present-simple', name: 'Present Simple', fr: 'Le présent des habitudes, des faits et des vérités générales.',
    when: ['Une habitude : I go to the gym on Mondays.', 'Un fait, une situation stable : She lives in Paris.', 'Une vérité générale : Water boils at 100 °C.', 'Un horaire officiel : The train leaves at 6.'],
    aff: ['Sujet + verbe à la base (+ -s avec he / she / it)', 'She works in a bank.', 'Elle travaille dans une banque.'],
    neg: ['Sujet + don’t / doesn’t + verbe à la base', 'He doesn’t eat meat.', 'Il ne mange pas de viande.'],
    qu: ['Do / Does + sujet + verbe à la base ?', 'Do you speak English?', 'Parles-tu anglais ?'],
    aux: 'do / does pour les questions et les négations. Aucun auxiliaire à l’affirmatif.',
    examples: [['I usually take the bus.', 'Je prends généralement le bus.'], ['My manager works from home on Fridays.', 'Mon responsable travaille de chez lui le vendredi.'], ['What do you do?', 'Que fais-tu dans la vie ?']],
    clues: ['always', 'usually', 'sometimes', 'never', 'every day', 'on Mondays'],
    errors: [['She work in a bank.', 'She works in a bank.', 'Avec he / she / it, on ajoute -s.'], ['Does he works?', 'Does he work?', 'Le -s est déjà sur does : le verbe reste à la base.'], ['I don’t never eat meat.', 'I never eat meat.', 'never porte déjà la négation.']],
    compare: ['present-continuous', 'I work in Lyon (situation stable) ≠ I’m working in Lyon this month (situation temporaire).'],
    exercises: [
      q('ps1', 'present-simple', 1, 'Choisis la forme correcte.', 'She ___ in a bank.', ['work', 'works', 'is work', 'working'], 1, 'Avec she, le present simple prend un -s : works.', ['Il manque le -s avec she.', 'Correct.', '« is » + base n’existe pas.', 'Il faudrait un auxiliaire (is working) et le sens changerait.']),
      q('ps2', 'present-simple', 1, 'Choisis la question correcte.', '___ you speak English?', ['Are', 'Do', 'Does', 'Is'], 1, 'Question au present simple avec you : Do + sujet + verbe à la base.', ['« Are you speak » mélange be et un verbe d’action.', 'Correct.', 'Does s’utilise avec he / she / it.', 'Is ne sert pas à poser une question avec un verbe d’action.']),
      t('ps3', 'present-simple', 1, 'Mets à la forme négative.', 'He eats meat. → He ___ meat.', ["doesn't eat", 'does not eat'], 'Négation : doesn’t + verbe à la base (eat, pas eats).'),
      q('ps4', 'present-simple', 2, 'Quelle phrase est correcte ?', '', ['Does he works here?', 'Does he work here?', 'Do he work here?', 'He does works here?'], 1, 'Does + sujet + verbe à la base.', ['Le -s est déjà sur does.', 'Correct.', 'Avec he, on utilise does.', 'Ce n’est pas une structure de question.']),
      o('ps5', 'present-simple', 1, 'Remets les mots dans l’ordre.', ['I', 'usually', 'take', 'the', 'bus'], 'I usually take the bus', 'Je prends généralement le bus.', 'Les mots de fréquence (usually) se placent avant le verbe.'),
      t('ps6', 'present-simple', 2, 'Transforme en question.', 'They work on Sundays. → ___ on Sundays?', ['do they work', 'Do they work'], 'Do + they + verbe à la base.'),
      q('ps7', 'present-simple', 2, 'Quel sens a cette phrase ? « The train leaves at 6. »', '', ['Le train est en train de partir.', 'Le train part à 6 h (horaire).', 'Le train est parti à 6 h.'], 1, 'Un horaire officiel s’exprime souvent au present simple, même pour le futur.', ['Ce serait « is leaving ».', 'Correct.', 'Ce serait le passé : left.'])
    ],
    oral: { prompt: 'Décris ta routine du matin en 3 phrases au present simple.', model: 'I wake up at seven. I usually drink coffee. I take the bus to work.', checks: [['\\b(wake|get|drink|take|go|eat|have|leave)s?\\b', 'Un verbe d’action au present simple'], ['\\b(usually|always|sometimes|often|never|every)\\b', 'Un mot de fréquence']] }
  },
  {
    id: 'present-continuous', name: 'Present Continuous', fr: 'Une action en cours en ce moment, ou une situation temporaire. Aussi un rendez-vous déjà fixé.',
    when: ['Une action en cours : I’m cooking right now.', 'Une situation temporaire : She’s working in London this month.', 'Un projet déjà organisé : I’m meeting Tom tomorrow.'],
    aff: ['Sujet + am / is / are + verbe en -ing', 'They are waiting outside.', 'Ils attendent dehors.'],
    neg: ['Sujet + am not / isn’t / aren’t + verbe en -ing', 'I’m not listening.', 'Je n’écoute pas.'],
    qu: ['Am / Is / Are + sujet + verbe en -ing ?', 'Are you working today?', 'Tu travailles aujourd’hui ?'],
    aux: 'be (am / is / are).',
    examples: [['She is working today.', 'Elle travaille aujourd’hui.'], ['What are you doing?', 'Qu’est-ce que tu fais ?'], ['We’re having lunch with clients on Friday.', 'Nous déjeunons avec des clients vendredi (c’est prévu).']],
    clues: ['now', 'right now', 'currently', 'at the moment', 'today', 'this week'],
    errors: [['I am agree.', 'I agree.', 'Certains verbes d’état (agree, know, like, want) s’emploient rarement en -ing.'], ['She working.', 'She is working.', 'Il manque l’auxiliaire be.'], ['I’m knowing the answer.', 'I know the answer.', 'know est un verbe d’état.']],
    compare: ['present-simple', 'He plays tennis (habitude) ≠ He is playing tennis (en ce moment).'],
    exercises: [
      q('pc1', 'present-continuous', 1, 'Choisis la forme correcte.', 'Look! It ___ .', ['rains', 'is raining', 'rain', 'raining'], 1, '« Look! » montre une action en cours : be + -ing.', ['C’est un fait général, pas ce qui se passe maintenant.', 'Correct.', 'Il manque le -s et le sens n’est pas le bon.', 'Il manque l’auxiliaire is.']),
      t('pc2', 'present-continuous', 1, 'Complète avec le verbe « wait » au present continuous.', 'They ___ outside.', ['are waiting', "'re waiting"], 'Avec they : are + waiting.'),
      q('pc3', 'present-continuous', 2, 'Quelle phrase est correcte ?', '', ['I am knowing her.', 'I know her.', 'I knowing her.'], 1, 'know est un verbe d’état : on ne le met généralement pas en -ing.', ['Verbe d’état : pas de -ing ici.', 'Correct.', 'Il manque be, et know reste un verbe d’état.']),
      q('pc4', 'present-continuous', 2, '« I’m meeting Tom tomorrow. » Que veut dire la phrase ?', '', ['Je rencontre Tom en ce moment.', 'J’ai rendez-vous avec Tom demain (c’est organisé).', 'Je rencontre Tom tous les jours.'], 1, 'Le present continuous peut exprimer un projet déjà fixé. « tomorrow » aide, mais c’est le contexte qui donne le sens.', ['« tomorrow » situe l’action dans le futur.', 'Correct.', 'Une habitude serait au present simple.']),
      o('pc5', 'present-continuous', 1, 'Remets les mots dans l’ordre.', ['are', 'you', 'what', 'doing'], 'what are you doing', 'Qu’est-ce que tu fais ?', 'Question : mot interrogatif + be + sujet + -ing.'),
      t('pc6', 'present-continuous', 2, 'Mets à la forme négative.', 'She is listening. → She ___ .', ["isn't listening", 'is not listening'], 'Négation : isn’t + -ing.'),
      q('pc7', 'present-continuous', 2, 'Choisis la phrase qui décrit une situation temporaire.', '', ['I live with my parents.', 'I’m living with my parents this month.', 'I lived with my parents.'], 1, 'this month + be + -ing : situation temporaire.', ['Situation stable.', 'Correct.', 'Passé terminé.'])
    ],
    oral: { prompt: 'Imagine que tu appelles un ami. Dis ce que tu es en train de faire (2 ou 3 phrases).', model: 'I’m sitting in a café. I’m drinking a coffee and I’m reading my notes.', checks: [['\\b(am|is|are|\'m|\'re|\'s)\\s+\\w+ing\\b', 'be + verbe en -ing']] }
  },
  {
    id: 'past-simple', name: 'Past Simple', fr: 'Une action passée et terminée, souvent à un moment précis.',
    when: ['Une action terminée : I called him yesterday.', 'Une suite d’actions passées : I got up, had breakfast and left.', 'Une habitude passée : I played football when I was a child.'],
    aff: ['Sujet + verbe au prétérit (-ed ou forme irrégulière)', 'We met last week.', 'Nous nous sommes rencontrés la semaine dernière.'],
    neg: ['Sujet + didn’t + verbe à la base', 'I didn’t see him.', 'Je ne l’ai pas vu.'],
    qu: ['Did + sujet + verbe à la base ?', 'Did you call her?', 'L’as-tu appelée ?'],
    aux: 'did (questions et négations), le même pour toutes les personnes.',
    examples: [['She went to London last year.', 'Elle est allée à Londres l’an dernier.'], ['The meeting began late.', 'La réunion a commencé en retard.'], ['What did you do last weekend?', 'Qu’as-tu fait le week-end dernier ?']],
    clues: ['yesterday', 'last week', 'in 2019', 'two days ago', 'when I was…'],
    errors: [['I didn’t called him.', 'I didn’t call him.', 'Après didn’t, verbe à la base.'], ['Did you went?', 'Did you go?', 'La marque du passé est sur did.'], ['I have seen him yesterday.', 'I saw him yesterday.', 'Un moment passé précis et terminé appelle en général le past simple.']],
    compare: ['present-perfect', 'I lost my keys (c’est arrivé, point) ≠ I have lost my keys (je ne les ai toujours pas).'],
    exercises: [
      q('pa1', 'past-simple', 1, 'Choisis la forme correcte.', 'Yesterday, I ___ my manager.', ['call', 'called', 'have called', 'calling'], 1, 'Action terminée à un moment passé précis : past simple.', ['C’est le présent.', 'Correct.', 'Le present perfect ne s’emploie normalement pas avec un moment passé précis comme yesterday.', 'Il manque un auxiliaire.']),
      t('pa2', 'past-simple', 1, 'Écris le prétérit de « go ».', 'She ___ to London last year.', ['went'], 'go → went → gone (verbe irrégulier).'),
      t('pa3', 'past-simple', 1, 'Mets à la forme négative.', 'I saw him. → I ___ him.', ["didn't see", 'did not see'], 'didn’t + verbe à la base (see, pas saw).'),
      q('pa4', 'past-simple', 2, 'Quelle question est correcte ?', '', ['Did you went there?', 'Did you go there?', 'Went you there?', 'Do you went there?'], 1, 'Did + sujet + verbe à la base.', ['Le passé est déjà dans did.', 'Correct.', 'L’inversion directe ne marche pas avec les verbes d’action.', 'On mélange présent et passé.']),
      o('pa5', 'past-simple', 1, 'Remets les mots dans l’ordre.', ['we', 'met', 'last', 'week'], 'we met last week', 'Nous nous sommes rencontrés la semaine dernière.', 'Sujet + verbe au prétérit + marqueur de temps.'),
      t('pa6', 'past-simple', 2, 'Transforme en question.', 'She bought a ticket. → ___ a ticket?', ['did she buy', 'Did she buy'], 'Did + she + buy (base).'),
      q('pa7', 'past-simple', 2, 'Choisis la meilleure suite.', 'When I was a child, I ___ football every Saturday.', ['play', 'played', 'have played'], 1, 'Habitude passée terminée : past simple (ou « used to play »).', ['C’est le présent.', 'Correct.', 'L’enfance est une période terminée.'])
    ],
    oral: { prompt: 'Raconte ce que tu as fait hier en 3 phrases.', model: 'Yesterday I went to work. I had lunch with a colleague. In the evening I watched a film.', checks: [['\\b(went|had|watched|worked|ate|saw|met|did|called|played|took|got|made|read)\\b', 'Un verbe au prétérit'], ['\\b(yesterday|last|ago|in the evening|in the morning)\\b', 'Un repère passé']] }
  },
  {
    id: 'past-continuous', name: 'Past Continuous', fr: 'Une action en cours à un moment du passé, souvent interrompue.',
    when: ['Une action en cours à un moment précis : At 8, I was having dinner.', 'Une action interrompue : I was sleeping when you called.', 'Le décor d’une histoire : It was raining and people were running.'],
    aff: ['Sujet + was / were + verbe en -ing', 'They were talking.', 'Ils parlaient.'],
    neg: ['Sujet + wasn’t / weren’t + verbe en -ing', 'I wasn’t listening.', 'Je n’écoutais pas.'],
    qu: ['Was / Were + sujet + verbe en -ing ?', 'What were you doing?', 'Que faisais-tu ?'],
    aux: 'be au passé (was / were).',
    examples: [['I was sleeping when you called.', 'Je dormais quand tu as appelé.'], ['While she was working, the phone rang.', 'Pendant qu’elle travaillait, le téléphone a sonné.']],
    clues: ['while', 'when', 'at 8 o’clock yesterday', 'all evening'],
    errors: [['I was sleep.', 'I was sleeping.', 'Il faut le -ing.'], ['When you called, I slept.', 'When you called, I was sleeping.', 'Pour une action en cours au moment de l’interruption, on utilise le past continuous.']],
    compare: ['past-simple', 'I was cooking (en cours) when he arrived (action courte, past simple).'],
    exercises: [
      q('pv1', 'past-continuous', 1, 'Choisis la forme correcte.', 'I ___ when you called.', ['slept', 'was sleeping', 'am sleeping', 'have slept'], 1, 'Action en cours interrompue par un appel : past continuous.', ['Possible dans certains contextes, mais ici on décrit l’action en cours.', 'Correct.', 'C’est le présent.', 'Ne convient pas à un moment passé précis.']),
      t('pv2', 'past-continuous', 1, 'Complète avec « talk » au past continuous.', 'They ___ about the project.', ['were talking'], 'Avec they : were + talking.'),
      q('pv3', 'past-continuous', 2, 'Choisis la phrase correcte.', '', ['While I was working, the alarm rang.', 'While I worked, the alarm was ringing.', 'While I was work, the alarm rang.'], 0, 'L’action longue (was working) est interrompue par l’action courte (rang).', ['Correct.', 'Les rôles sont inversés : c’est le travail qui dure.', 'Il manque le -ing.']),
      t('pv4', 'past-continuous', 2, 'Transforme en question.', 'You were doing something. → What ___ ?', ['were you doing'], 'Mot interrogatif + were + sujet + -ing.'),
      o('pv5', 'past-continuous', 2, 'Remets les mots dans l’ordre.', ['it', 'was', 'raining', 'when', 'I', 'left'], 'it was raining when I left', 'Il pleuvait quand je suis parti.', 'Décor (past continuous) + action courte (past simple).')
    ],
    oral: { prompt: 'Dis ce que tu faisais hier à 20 h, puis ce qui t’a interrompu.', model: 'At eight o’clock I was cooking dinner when my phone rang.', checks: [['\\b(was|were)\\s+\\w+ing\\b', 'was / were + -ing'], ['\\bwhen\\b', 'when pour l’interruption']] }
  },
  {
    id: 'present-perfect', name: 'Present Perfect', fr: 'Un lien entre le passé et le présent : une expérience, un résultat visible maintenant, ou une situation qui dure encore.',
    when: ['Une expérience (sans dire quand) : I have been to London.', 'Un résultat présent : I have lost my keys (je ne les ai pas).', 'Une situation qui continue : I have lived here since 2020.', 'Une action très récente : She has just left.'],
    aff: ['Sujet + have / has + participe passé', 'I have finished.', 'J’ai fini.'],
    neg: ['Sujet + haven’t / hasn’t + participe passé', 'They haven’t finished yet.', 'Ils n’ont pas encore fini.'],
    qu: ['Have / Has + sujet + participe passé ?', 'Have you ever been to London?', 'Es-tu déjà allé à Londres ?'],
    aux: 'have / has.',
    examples: [['I have lived here since 2020.', 'J’habite ici depuis 2020.'], ['Have you finished yet?', 'As-tu déjà fini ?'], ['She has just left.', 'Elle vient de partir.']],
    clues: ['ever', 'never', 'already', 'yet', 'just', 'since', 'for', 'so far'],
    errors: [['I have seen him yesterday.', 'I saw him yesterday.', 'Avec un moment passé précis et terminé, on préfère le past simple.'], ['I live here since 2020.', 'I have lived here since 2020.', 'Le français dit « j’habite depuis », l’anglais utilise le present perfect.'], ['Did you ever go to London?', 'Have you ever been to London?', 'Pour l’expérience de vie, on utilise surtout le present perfect (le past simple s’entend en anglais américain).']],
    compare: ['past-simple', 'I have been to Rome (expérience, peu importe quand) ≠ I went to Rome in 2019 (moment précis).'],
    exercises: [
      q('pp1', 'present-perfect', 1, 'Choisis la forme correcte.', 'I ___ here since 2020.', ['live', 'lived', 'have lived', 'am living'], 2, 'Situation commencée en 2020 qui continue : present perfect.', ['Le français dit « j’habite depuis », mais l’anglais ne met pas le présent ici.', 'Le past simple voudrait dire que c’est terminé.', 'Correct.', 'Possible dans certains contextes, mais avec since on emploie surtout le present perfect (ou perfect continuous).']),
      t('pp2', 'present-perfect', 1, 'Complète avec « finish » au present perfect.', 'She ___ the report.', ['has finished', "'s finished"], 'Avec she : has + participe passé.'),
      q('pp3', 'present-perfect', 2, 'since ou for ?', 'I have worked here ___ three years.', ['since', 'for'], 1, 'for + une durée (three years). since + un point de départ (since 2021).', ['since demande un point de départ, pas une durée.', 'Correct.']),
      q('pp4', 'present-perfect', 2, 'Quelle phrase est la plus naturelle ?', '', ['I have seen him yesterday.', 'I saw him yesterday.'], 1, 'yesterday situe l’action à un moment passé terminé : past simple.', ['Avec un moment passé précis, le present perfect sonne faux.', 'Correct.']),
      t('pp5', 'present-perfect', 2, 'Écris le participe passé de « write ».', 'I have ___ three e-mails.', ['written'], 'write → wrote → written.'),
      o('pp6', 'present-perfect', 2, 'Remets les mots dans l’ordre.', ['have', 'you', 'ever', 'been', 'abroad'], 'have you ever been abroad', 'Es-tu déjà allé à l’étranger ?', 'Question d’expérience : Have + sujet + ever + participe passé.'),
      q('pp7', 'present-perfect', 3, 'yet ou already ?', 'Have you finished ___?', ['already', 'yet'], 1, 'yet se place en fin de question ou de négation.', ['already se met plutôt dans les affirmations ou avant le participe.', 'Correct.'])
    ],
    oral: { prompt: 'Parle de deux expériences de ta vie (un pays, un plat, une activité).', model: 'I have been to Spain. I have never eaten sushi, but I have tried Korean food.', checks: [['\\b(have|has|\'ve|\'s)\\s+(never\\s+|ever\\s+|already\\s+)?\\w+(ed|en|been|done|gone|seen|eaten|had|made|met|tried|visited|lived|worked)\\b', 'have + participe passé'], ['\\b(never|ever|already|been)\\b', 'Un marqueur d’expérience']] }
  },
  {
    id: 'present-perfect-continuous', name: 'Present Perfect Continuous', fr: 'Une action qui dure depuis un moment et continue encore (ou vient de s’arrêter). On insiste sur la durée.',
    when: ['Durée d’une action en cours : I have been waiting for an hour.', 'Une activité récente qui laisse une trace : You’re tired because you’ve been running.'],
    aff: ['Sujet + have / has been + verbe en -ing', 'She has been working all day.', 'Elle travaille depuis ce matin / toute la journée.'],
    neg: ['Sujet + haven’t / hasn’t been + -ing', 'I haven’t been sleeping well.', 'Je ne dors pas bien ces temps-ci.'],
    qu: ['Have / Has + sujet + been + -ing ?', 'How long have you been learning English?', 'Depuis combien de temps apprends-tu l’anglais ?'],
    aux: 'have / has + been.',
    examples: [['How long have you been waiting?', 'Depuis combien de temps attends-tu ?'], ['It has been raining since this morning.', 'Il pleut depuis ce matin.']],
    clues: ['for', 'since', 'how long', 'all day', 'lately'],
    errors: [['I am waiting since an hour.', 'I have been waiting for an hour.', 'Calque du français : en anglais, durée qui continue = have been + -ing, et for + durée.'], ['I have been knowing him for years.', 'I have known him for years.', 'Verbe d’état : present perfect simple.']],
    compare: ['present-perfect', 'I have written three e-mails (résultat, quantité) ≠ I have been writing e-mails all morning (durée de l’activité).'],
    exercises: [
      q('pq1', 'present-perfect-continuous', 2, 'Choisis la forme correcte.', 'I ___ for an hour.', ['am waiting', 'have been waiting', 'waited', 'wait'], 1, 'Durée d’une action qui continue : have been + -ing.', ['Calque du français « j’attends depuis une heure ».', 'Correct.', 'Le past simple voudrait dire que c’est terminé.', 'Le présent simple ne convient pas.']),
      t('pq2', 'present-perfect-continuous', 2, 'Complète avec « rain ».', 'It ___ since this morning.', ['has been raining', "'s been raining"], 'Avec it : has been + raining.'),
      t('pq3', 'present-perfect-continuous', 2, 'Écris la question.', '« Depuis combien de temps apprends-tu l’anglais ? » → How long ___ English?', ['have you been learning'], 'How long + have + you + been + -ing.'),
      q('pq4', 'present-perfect-continuous', 3, 'Quelle phrase insiste sur la quantité terminée ?', '', ['I have been writing e-mails all morning.', 'I have written ten e-mails.'], 1, 'Pour un résultat chiffré, on emploie le present perfect simple.', ['Ici on insiste sur la durée de l’activité.', 'Correct.'])
    ],
    oral: { prompt: 'Dis depuis combien de temps tu fais une activité (travail, sport, anglais).', model: 'I have been learning English for two months. I have been working here since 2021.', checks: [['\\b(have|has|\'ve|\'s)\\s+been\\s+\\w+ing\\b', 'have been + -ing'], ['\\b(for|since)\\b', 'for ou since']] }
  },
  {
    id: 'future-will', name: 'Futur avec will', fr: 'Une décision prise sur le moment, une promesse, une offre, ou une prévision.',
    when: ['Décision sur le moment : I’ll take the blue one.', 'Promesse / offre : I’ll help you.', 'Prévision, opinion : I think it will rain.'],
    aff: ['Sujet + will (’ll) + verbe à la base', 'I’ll call you tonight.', 'Je t’appellerai ce soir.'],
    neg: ['Sujet + won’t + verbe à la base', 'It won’t take long.', 'Ça ne prendra pas longtemps.'],
    qu: ['Will + sujet + verbe à la base ?', 'Will you be there?', 'Seras-tu là ?'],
    aux: 'will (identique pour toutes les personnes).',
    examples: [['Don’t worry, I’ll help you.', 'Ne t’inquiète pas, je vais t’aider.'], ['I think she will like it.', 'Je pense qu’elle va aimer.']],
    clues: ['I think', 'probably', 'tomorrow', 'one day', 'OK, I’ll…'],
    errors: [['I will to call you.', 'I will call you.', 'Pas de « to » après will.'], ['She wills come.', 'She will come.', 'will ne prend jamais de -s.']],
    compare: ['future-going-to', 'The phone is ringing. – I’ll get it! (décision sur le moment) ≠ I’m going to buy a car (décidé avant).'],
    exercises: [
      q('fw1', 'future-will', 1, 'Choisis la forme correcte.', 'Don’t worry, I ___ you.', ['help', 'will help', 'will to help', 'helping'], 1, 'Offre spontanée : will + base.', ['Le présent ne convient pas à une offre.', 'Correct.', 'Pas de « to » après will.', 'Il manque un auxiliaire.']),
      t('fw2', 'future-will', 1, 'Mets à la forme négative.', 'It will take long. → It ___ long.', ["won't take", 'will not take'], 'won’t + verbe à la base.'),
      q('fw3', 'future-will', 2, 'Le téléphone sonne. Que dis-tu ?', '', ['I’m going to answer it!', 'I’ll answer it!'], 1, 'Décision prise à l’instant : will.', ['going to suppose que c’était décidé avant.', 'Correct.'])
    ],
    oral: { prompt: 'Fais deux promesses pour ta semaine (travail, sport, anglais).', model: 'I will practise English every day. I will go to bed earlier.', checks: [['\\b(will|\'ll)\\s+\\w+', 'will + verbe']] }
  },
  {
    id: 'future-going-to', name: 'Futur avec be going to', fr: 'Une intention ou un projet décidé avant de parler, ou une prédiction basée sur ce qu’on voit.',
    when: ['Projet déjà décidé : We’re going to visit Rome next week.', 'Prédiction évidente : Look at the sky, it’s going to rain.'],
    aff: ['Sujet + am / is / are going to + verbe à la base', 'I’m going to study tonight.', 'Je vais étudier ce soir.'],
    neg: ['Sujet + am not / isn’t / aren’t going to + base', 'She isn’t going to come.', 'Elle ne va pas venir.'],
    qu: ['Am / Is / Are + sujet + going to + base ?', 'Are you going to apply?', 'Vas-tu postuler ?'],
    aux: 'be (am / is / are) + going to.',
    examples: [['We are going to visit Rome next week.', 'Nous allons visiter Rome la semaine prochaine.'], ['Be careful, you’re going to fall!', 'Attention, tu vas tomber !']],
    clues: ['next week', 'this weekend', 'look!', 'I’ve decided'],
    errors: [['I going to study.', 'I’m going to study.', 'Il manque be.'], ['She is going to studies.', 'She is going to study.', 'Après going to, verbe à la base.']],
    compare: ['future-will', 'I’ve decided: I’m going to learn Spanish (projet) ≠ Maybe I’ll learn Spanish one day (idée vague).'],
    exercises: [
      q('fg1', 'future-going-to', 1, 'Choisis la forme correcte.', 'We ___ visit Rome next week. We booked the hotel.', ['will', 'are going to', 'go to'], 1, 'Projet déjà organisé (l’hôtel est réservé) : be going to.', ['will marche pour une décision du moment, pas pour un projet déjà réservé.', 'Correct.', 'Il manque be et le sens est différent.']),
      t('fg2', 'future-going-to', 1, 'Complète.', 'Look at the clouds! It ___ rain.', ['is going to', "'s going to"], 'Prédiction basée sur ce qu’on voit : be going to.'),
      t('fg3', 'future-going-to', 2, 'Transforme en question.', 'You are going to apply. → ___ to apply?', ['are you going'], 'Are + you + going to + base.')
    ],
    oral: { prompt: 'Dis ce que tu vas faire ce week-end (un projet déjà décidé).', model: 'This weekend I’m going to visit my family and I’m going to cook a big dinner.', checks: [['\\b(am|is|are|\'m|\'re|\'s)\\s+going\\s+to\\s+\\w+', 'be going to + verbe']] }
  },
  {
    id: 'future-compare', name: 'Les futurs : will, going to, present continuous', fr: 'Trois façons de parler du futur. Le choix dépend de ce que tu veux dire, pas d’un mot comme « tomorrow ».',
    when: ['will : décision sur le moment, promesse, prévision.', 'be going to : intention déjà décidée, prédiction évidente.', 'present continuous : rendez-vous ou plan déjà organisé (date, heure, personnes).', 'present simple : horaire officiel (The train leaves at 6).'],
    aff: ['Même phrase, trois nuances', 'I’ll see Tom / I’m going to see Tom / I’m seeing Tom tomorrow.', 'Je verrai Tom (décision) / J’ai l’intention de voir Tom / J’ai rendez-vous avec Tom demain.'],
    neg: ['Négations', 'I won’t / I’m not going to / I’m not seeing…', ''],
    qu: ['Questions', 'Will you…? / Are you going to…? / Are you seeing…?', ''],
    aux: 'will · be going to · be + -ing.',
    examples: [['“We’re out of milk.” “OK, I’ll buy some.”', '« Il n’y a plus de lait. » « D’accord, je vais en acheter. » (décision immédiate)'], ['I’m going to buy milk after work.', 'Je vais acheter du lait après le travail (déjà prévu).'], ['I’m meeting the client at 3.', 'J’ai rendez-vous avec le client à 15 h.']],
    clues: ['Le mot « tomorrow » ne suffit pas : regarde si c’est décidé, organisé ou spontané.'],
    errors: [['I will meet the client at 3, it’s in my calendar.', 'I’m meeting the client at 3.', 'Rendez-vous organisé : present continuous plus naturel.']],
    compare: ['future-will', 'Voir aussi les fiches will et be going to.'],
    exercises: [
      q('fc1', 'future-compare', 2, 'C’est noté dans ton agenda. Que dis-tu ?', 'I ___ the dentist at 10 tomorrow.', ['will see', 'am seeing', 'see'], 1, 'Rendez-vous déjà organisé : present continuous.', ['Possible mais moins naturel pour un rendez-vous fixé.', 'Correct.', 'Le present simple sert aux horaires officiels.']),
      q('fc2', 'future-compare', 2, '« Il fait froid. » Tu décides maintenant :', '', ['I’m going to close the window.', 'I’ll close the window.'], 1, 'Décision prise à l’instant : will.', ['going to = décidé avant.', 'Correct.']),
      q('fc3', 'future-compare', 3, 'Quelle phrase exprime une intention décidée avant ?', '', ['I think I’ll study tonight.', 'I’m going to study tonight, I’ve planned it.'], 1, '« I’ve planned it » confirme l’intention préalable.', ['« I think I’ll » marque une décision ou une prévision vague.', 'Correct.'])
    ],
    oral: { prompt: 'Donne un rendez-vous fixé, un projet, et une décision spontanée.', model: 'I’m meeting my sister on Saturday. I’m going to learn to cook. OK, I’ll call you later.', checks: [['\\b(am|is|are|\'m|\'re)\\s+\\w+ing\\b', 'present continuous'], ['going\\s+to', 'be going to'], ['\\b(will|\'ll)\\b', 'will']] }
  }
];

export const TENSE_BY_ID = Object.fromEntries(TENSES.map(x => [x.id, x]));
export const TENSE_ITEMS = TENSES.flatMap(x => x.exercises);
