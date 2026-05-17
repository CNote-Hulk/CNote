require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const translations = [
// ─── FRENCH ────────────────────────────────────────────────────────────────
{lesson_id:1,lang:'fr',title:`Qu'est-ce qu'une Console, en fait ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce qu'est réellement une console de jeu, en quoi elle diffère d'un PC ou d'un téléphone, et pourquoi elle existe en tant qu'appareil à part entière.</p>
</div>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/ps2.webp" alt="PlayStation 2" loading="lazy">
</figure>

<p>Tu les as déjà vues. Sous une télé, dans une vitrine de magasin, dans une pub. PlayStation. Xbox. Nintendo Switch.</p>
<p>Mais voici une question que la plupart des gens ne se posent jamais : qu'est-ce qu'une console, en fait ?</p>
<p>Une console de jeu est un appareil conçu pour un seul but : faire tourner des jeux. Pas des tableurs. Pas des e-mails. Juste des jeux — sur ton écran, avec une manette entre les mains.</p>
<blockquote>&ldquo;Mais mon téléphone fait tourner des jeux. Mon laptop aussi. Alors pourquoi acheter un appareil séparé juste pour ça ?&rdquo;</blockquote>
<p>Bonne question. Réfléchissons-y.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Imagine que tu es un développeur qui crée un jeu. Tu veux qu'il soit parfait en termes d'apparence et de fonctionnement. Mais tes joueurs ont tous des téléphones différents — certains anciens, certains récents, certains lents, certains rapides. Comment faire pour que le jeu soit excellent pour tous ?</p>
  <p>La réponse honnête ? C'est impossible. Pas parfaitement.</p>
</div>

<p>C'est exactement là qu'une console gagne. Chaque PlayStation 5 dans le monde a un matériel identique à l'intérieur. Même processeur — le &ldquo;cerveau&rdquo; qui gère la logique du jeu. Même puce graphique — la partie qui &ldquo;dessine&rdquo; l'image sur ton écran. Même mémoire — l'espace de travail temporaire utilisé pendant le jeu.</p>
<p>Parce que les développeurs savent exactement ce qu'il y a dans chaque console, ils peuvent en tirer chaque goutte de performance. Le résultat ? Des jeux qui ont l'air meilleur que tu ne le penserais.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les consoles ne sont que des PC faibles&rdquo;</h3>
  <p>Tu entendras ça souvent en ligne. Et c'est vrai — une console a un processeur, une puce graphique et de la mémoire, tout comme un PC. Mais voici la chose : une console aux spécifications &ldquo;moins puissantes&rdquo; peut quand même produire des jeux époustouflants, parce que les développeurs savent exactement avec quoi ils travaillent. Ce n'est pas une question de puissance brute. C'est une question d'optimisation.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Processeur (CPU)</strong> — le &ldquo;cerveau&rdquo; de la console. Gère la logique du jeu.</li>
    <li><strong>Puce graphique (GPU)</strong> — dessine chaque image que tu vois à l'écran.</li>
    <li><strong>Mémoire (RAM)</strong> — espace de travail temporaire utilisé pendant le jeu.</li>
  </ul>
  <p>Ne t'inquiète pas de les mémoriser maintenant — tu les reverras tout au long du cours.</p>
</div>`},

{lesson_id:2,lang:'fr',title:`Manette, Écran, Console — Comment Fonctionnent-ils Ensemble ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : les trois parties principales d'un système de jeu et comment elles communiquent entre elles.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons appris ce qu'est une console et pourquoi le matériel standardisé améliore les jeux. Nous avons aussi découvert trois termes clés : CPU, GPU et RAM.</p>
</div>

<p>Tu sais maintenant ce qu'est une console. Mais quand tu t'assieds pour jouer, tu n'utilises pas seulement la console — tu utilises un système composé de trois parties qui fonctionnent ensemble.</p>

<figure class="lesson-diagram">
  <img src="../../assets/images/graphics/controller-console-tv.webp" alt="Schéma : la manette envoie des signaux à la console, la console envoie l'image à la TV" loading="lazy">
</figure>

<h2>La Console</h2>
<p>C'est le cerveau de l'opération. C'est la boîte qui fait tout le travail — elle fait tourner le jeu, traite tes actions, envoie l'image à ton écran. Tout passe par là.</p>

<h2>La Manette</h2>
<p>Chaque fois que tu appuies sur un bouton, la manette envoie un signal à la console. &ldquo;Sauter.&rdquo; &ldquo;Tirer.&rdquo; &ldquo;Aller à gauche.&rdquo; La console lit ce signal, le traite en quelques millisecondes, et met à jour le jeu en conséquence.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Quand tu appuies sur un bouton de ta manette, à quelle vitesse penses-tu que la console réagit ? Une seconde ? Une demi-seconde ?</p>
  <p>La plupart des consoles modernes traitent les actions de la manette en moins de 16 millisecondes — plus vite que tu peux consciemment le remarquer. C'est ce qui rend les jeux réactifs.</p>
</div>

<h2>L'Écran</h2>
<p>La console envoie une image complète à ta TV ou à ton moniteur jusqu'à 60 fois par seconde — parfois même 120. Chacune de ces images s'appelle une frame. Plus il y a de frames par seconde, plus le jeu semble fluide.</p>
<p>Tu as probablement déjà entendu &ldquo;60fps&rdquo;. Maintenant tu sais ce que ça veut dire.</p>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Action (input)</strong> — toute action envoyée depuis la manette à la console.</li>
    <li><strong>Frame</strong> — une seule image envoyée à ton écran.</li>
    <li><strong>FPS (Images par seconde)</strong> — le nombre de frames que la console envoie à ton écran chaque seconde.</li>
  </ul>
</div>`},

{lesson_id:3,lang:'fr',title:`Comment un Jeu Arrive-t-il sur ton Écran ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce qui se passe depuis le moment où tu appuies sur un bouton jusqu'au moment où tu vois quelque chose à l'écran — le voyage complet d'un jeu en action.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons regardé les trois parties d'un système de jeu — manette, console et écran — et comment elles se parlent. Nous avons appris ce qu'est une frame et ce que signifie fps.</p>
</div>

<p>Tu appuies sur X. Ton personnage saute. Simple, non ?</p>
<p>Pas vraiment. En cette fraction de seconde, beaucoup de choses se sont passées. Ralentissons.</p>

<h2>Étape 1 — Tu appuies sur un bouton</h2>
<p>La manette détecte l'appui et envoie instantanément un signal à la console. Ce signal dit une chose : &ldquo;X a été appuyé.&rdquo;</p>

<h2>Étape 2 — La console réfléchit</h2>
<p>Le CPU lit le signal et se demande : &ldquo;Que doit-il se passer quand X est appuyé dans cette situation ?&rdquo; Il vérifie la logique du jeu, calcule la nouvelle position de ton personnage, met à jour le monde du jeu, et passe tout au GPU.</p>

<h2>Étape 3 — Le GPU dessine l'image</h2>
<p>Le GPU prend toutes ces informations et construit une image complète — ton personnage en l'air, l'arrière-plan, les ombres, les effets. Chaque pixel, composé en millisecondes.</p>

<figure class="lesson-diagram">
  <img src="../../assets/images/graphics/button-cpu-gpu-screen.webp" alt="Schéma : Appui bouton → CPU → GPU → Écran" loading="lazy">
</figure>

<h2>Étape 4 — L'écran affiche</h2>
<p>L'image complète est envoyée à ta TV. Tu vois ton personnage sauter.</p>
<p>Temps total entre l'appui et l'image à l'écran ? Moins de 100 millisecondes sur une console bien optimisée. Souvent bien moins.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Ta console fait ce processus entier jusqu'à 60 fois par seconde — parfois 120. C'est 60 cycles complets de &ldquo;lire l'action → réfléchir → dessiner → afficher&rdquo; chaque seconde. Est-ce que ça change ta façon de voir ce qui se passe dans cette boîte sous ta TV ?</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Le jeu vit à l'intérieur de la console&rdquo;</h3>
  <p>Pas tout à fait. Quand tu joues, le jeu ne tourne pas entièrement depuis le disque ou la cartouche. La console charge des parties du jeu dans la RAM — cette mémoire temporaire rapide dont on a parlé à la leçon 1. La RAM est comme un bureau : tu sors ce dont tu as besoin maintenant, tu travailles dessus, et tu le ranges. C'est pourquoi quand tu éteins la console sans sauvegarder, ta progression disparaît — la RAM est effacée quand l'alimentation est coupée.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Logique du jeu</strong> — les règles du jeu : ce qui se passe quand tu sautes, tires ou bouges.</li>
    <li><strong>Rendu (render)</strong> — le processus par lequel le GPU construit une image complète.</li>
    <li><strong>Charger (load)</strong> — déplacer des données de jeu depuis le stockage vers la RAM pour que la console puisse les utiliser.</li>
  </ul>
</div>`},

{lesson_id:4,lang:'fr',title:`D'où Viennent les Consoles ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment les consoles de jeu sont nées — des machines d'arcade aux premiers appareils domestiques.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons suivi un appui de bouton jusqu'à l'écran — le CPU lit l'action, le GPU rend l'image, la RAM stocke tout temporairement. Maintenant, prenons du recul et regardons le tableau d'ensemble : comment tout ça a commencé ?</p>
</div>

<p>Nous sommes au début des années 1970. Il n'y a pas de PlayStation. Pas de Xbox. Pas de Nintendo. Le jeu vidéo n'existe pas encore dans les foyers.</p>
<p>Si tu voulais jouer à un jeu vidéo, tu devais aller quelque part — une salle d'arcade, une épicerie, ou un centre de jeux. Selon où tu vivais, ça avait l'air différent : le Japon avait de grands centres de jeux, l'Europe avait des machines dans les pubs, l'Amérique du Nord avait des arcades dans les centres commerciaux. Mais l'idée était la même partout : glisse une pièce, gagne quelques minutes de jeu.</p>
<p>Puis quelqu'un a posé la question qui a tout changé : &ldquo;Et si les gens pouvaient jouer chez eux ?&rdquo;</p>

<h2>Le Premier Pas — Magnavox Odyssey (1972)</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/magnavox-odyssey.webp" alt="Magnavox Odyssey" loading="lazy">
</figure>

<p>La Magnavox Odyssey était la première console de jeu domestique au monde. Elle n'avait pas de son, pas d'affichage du score, et les jeux étaient incroyablement simples — surtout des points et des lignes sur un écran. Elle était livrée avec des calques plastiques à coller sur ta TV pour simuler un environnement de jeu.</p>
<p>Selon les standards d'aujourd'hui, ça paraît ridicule. Mais en 1972, c'était de la magie. Pour la première fois, une TV du salon devenait quelque chose d'interactif.</p>

<h2>Puis vint Pong — Atari (1975)</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/atari-home-pong.webp" alt="Atari Home Pong" loading="lazy">
</figure>

<p>Atari a poussé l'idée plus loin. Leur version domestique de Pong — un simple jeu de tennis — s'est vendue à des centaines de milliers d'exemplaires. Les gens étaient accros. Non pas parce que le jeu était profond ou complexe, mais parce qu'il était à eux. Chez eux. N'importe quand.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Imagine que tu n'as jamais vu de jeu vidéo. Quelqu'un te met une télécommande de TV dans la main et dit &ldquo;tu contrôles ce point sur l'écran.&rdquo; À ton avis, qu'est-ce que ça faisait en 1972 ?</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Atari a inventé le jeu vidéo&rdquo;</h3>
  <p>Atari a rendu le jeu vidéo populaire, mais la Magnavox Odyssey est arrivée en premier — deux ans plus tôt. C'est l'une des plus vieilles idées reçues du jeu vidéo. La vraie contribution d'Atari a été de rendre les consoles grand public, pas de les inventer.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Arcade</strong> — une machine publique où l'on paye par partie, généralement avec des pièces.</li>
    <li><strong>Console domestique</strong> — un appareil de jeu conçu pour être utilisé chez soi, connecté à une TV.</li>
    <li><strong>Grand public</strong> — largement adopté par le grand public, pas seulement par les passionnés.</li>
  </ul>
</div>`},

{lesson_id:5,lang:'fr',title:`Les Guerres des Consoles Commencent`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment les années 1980 ont transformé le jeu vidéo en industrie mondiale — et pourquoi Nintendo a tout changé.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons vu comment les consoles sont nées — de la Magnavox Odyssey en 1972 à Atari qui a rendu le jeu vidéo grand public. Mais ensuite, quelque chose s'est mal passé.</p>
</div>

<p>En 1983, le marché du jeu vidéo en Amérique du Nord était en plein essor. Puis, presque du jour au lendemain, il s'est effondré. Les magasins ont arrêté de vendre des jeux, les prix ont chuté, et des entreprises ont fait faillite. L'industrie en Amérique du Nord a perdu près de 97 % de ses revenus en seulement deux ans — un événement connu sous le nom de <strong>crash du jeu vidéo nord-américain de 1983</strong>. Pendant ce temps au Japon, la Famicom de Nintendo devenait silencieusement un phénomène. Le crash était réel — mais régional, pas mondial.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Pourquoi une industrie entière s'effondrerait-elle si vite ? Qu'est-ce qui s'est mal passé selon toi ?</p>
  <p>La réponse est simple : trop de mauvais jeux. Les éditeurs se précipitaient pour sortir des jeux sans se soucier de la qualité. Les joueurs ont été déçus trop souvent en dépensant de l'argent pour de mauvais jeux, et ont finalement arrêté d'acheter. La confiance avait disparu.</p>
</div>

<h2>Nintendo Sauve la Mise</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/nintendo-nes.webp" alt="Nintendo Entertainment System" loading="lazy">
</figure>

<p>En 1985, une entreprise japonaise appelée Nintendo a lancé la Nintendo Entertainment System (NES) en Amérique du Nord. Pour reconstruire la confiance, ils ont fait quelque chose d'intelligent — ils ont créé un programme strict de contrôle qualité. Seuls les jeux approuvés par Nintendo pouvaient être publiés sur la NES.</p>
<p>Ça a marché. Les jeux étaient à nouveau bons. Les joueurs sont revenus. L'industrie s'est redressée.</p>
<p>La NES s'est vendue à plus de 60 millions d'exemplaires dans le monde. Des personnages comme Mario et Zelda sont devenus des icônes culturelles qui existent encore aujourd'hui.</p>

<h2>Sega Entre dans la Partie</h2>
<p>Nintendo n'avait pas de véritable concurrent — jusqu'à l'arrivée de Sega avec la Sega Master System, puis la Sega Genesis. Le marketing de Sega était agressif. Leur slogan ? &ldquo;Genesis fait ce que Nintendon't.&rdquo;</p>
<p>La rivalité entre Nintendo et Sega a défini toute une génération de jeux vidéo. Les joueurs du monde entier ont choisi leur camp. C'était la première vraie guerre des consoles.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Le crash a tué le jeu vidéo pour toujours&rdquo;</h3>
  <p>Le crash nord-américain a été dévastateur — mais il était régional, pas mondial. Au Japon, la Nintendo Famicom était déjà un énorme succès pendant les mêmes années. Le jeu vidéo n'a jamais vraiment arrêté — il a juste dû reconstruire la confiance sur un marché.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Guerre des consoles</strong> — compétition entre deux ou plusieurs fabricants de consoles pour la domination du marché.</li>
    <li><strong>Contrôle qualité</strong> — un processus pour s'assurer que les produits respectent un standard minimum avant d'atteindre les consommateurs.</li>
    <li><strong>Éditeur</strong> — une entreprise qui finance et publie des jeux, souvent différente du développeur qui les crée.</li>
  </ul>
</div>`},

{lesson_id:6,lang:'fr',title:`PlayStation, Xbox et l'Ère Moderne`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment l'arrivée de Sony et Microsoft a transformé le jeu vidéo en ce qu'il est aujourd'hui.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons vu Nintendo sauver l'industrie du jeu après le crash de 1983, et la naissance de la première guerre des consoles entre Nintendo et Sega. Maintenant, sautons dans les années 1990 — quand deux géants que personne n'attendait sont entrés dans le jeu.</p>
</div>

<p>Au début des années 1990, Nintendo était roi. Sega était un rival sérieux. Le marché en dehors du Japon était encore grand ouvert.</p>
<p>Du moins, c'est ce que tout le monde pensait.</p>

<h2>Sony Change Tout (1994)</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-1.webp" alt="PlayStation 1" loading="lazy">
</figure>

<p>Sony était une entreprise japonaise d'électronique grand public — TV, stéréos, appareils photo — déjà bien connue en Asie, en Europe et dans les Amériques. Elle n'avait aucune expérience dans le jeu vidéo. Et pourtant, en 1994, elle a lancé la PlayStation, d'abord au Japon, puis dans le monde entier.</p>
<p>La PlayStation a fait quelque chose que personne n'avait fait avant à cette échelle : elle utilisait des CD-ROM au lieu des cartouches. Les CD pouvaient stocker beaucoup plus de données, ce qui permettait des mondes plus grands, de la vraie musique, des voix et des cinématiques. Les jeux ressemblaient soudain à des expériences, pas seulement à des défis.</p>
<p>La PlayStation s'est vendue à plus de 100 millions d'exemplaires. Sony n'était pas juste un nouveau joueur — ils sont devenus le nouveau leader.</p>

<h2>Microsoft Rejoint la Guerre (2001)</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/xbox.webp" alt="Xbox" loading="lazy">
</figure>

<p>En 2001, Microsoft — une entreprise de logiciels — a lancé la Xbox. Leur argument était simple : une console construite comme un PC, avec un disque dur pour sauvegarder les jeux, et un service en ligne révolutionnaire appelé Xbox Live.</p>
<p>Xbox Live permettait aux joueurs de s'affronter sur internet. Pas localement, pas dans une arcade — depuis chez eux, n'importe où dans le monde. Ça a changé pour toujours ce que signifiait le multijoueur.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Deux entreprises sans expérience dans le jeu vidéo — Sony et Microsoft — sont toutes les deux devenues des acteurs dominants. Qu'est-ce que ça te dit sur ce qu'il faut vraiment pour réussir dans cette industrie ?</p>
</div>

<h2>Où On En Est Aujourd'hui</h2>
<p>Le paysage moderne des consoles compte essentiellement trois acteurs :</p>
<ul>
  <li><strong>Sony</strong> → PlayStation 5</li>
  <li><strong>Microsoft</strong> → Xbox Series X / S</li>
  <li><strong>Nintendo</strong> → Switch 2</li>
</ul>
<p>Chacun a une philosophie différente. Sony mise sur des expériences solo cinématographiques. Microsoft mise sur les services et les abonnements. Nintendo mise sur la portabilité et un gameplay unique.</p>
<p>Aucun n'est objectivement &ldquo;le meilleur.&rdquo; Ce sont juste des réponses différentes à la même question : comment rendre le jeu vidéo génial ?</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;La console avec les meilleures specs gagne toujours&rdquo;</h3>
  <p>La Nintendo Wii avait un matériel bien plus faible que la PlayStation 3 et la Xbox 360 — et elle s'est mieux vendue que les deux. La Wii Remote a introduit les commandes gestuelles qui ont amené des millions de non-joueurs au jeu vidéo pour la première fois. Les specs comptent, mais elles ne sont jamais toute l'histoire.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>CD-ROM</strong> — un disque optique pouvant stocker beaucoup plus de données qu'une cartouche.</li>
    <li><strong>Multijoueur en ligne</strong> — jouer contre ou avec d'autres personnes via internet.</li>
    <li><strong>Service par abonnement</strong> — un modèle de paiement récurrent donnant accès à une bibliothèque de jeux ou de fonctionnalités.</li>
  </ul>
</div>`},

{lesson_id:7,lang:'fr',title:`La Console Qui Reste à la Maison`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce qu'est une console de salon, ce qui la rend spéciale, et pourquoi des millions de personnes la préfèrent encore à toute autre façon de jouer.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons couvert l'ère moderne — PlayStation, Xbox, et comment deux entreprises sans expérience dans le jeu sont devenues des leaders de l'industrie. Regardons maintenant les différents types de consoles qui existent aujourd'hui.</p>
</div>

<p>Toutes les consoles ne sont pas les mêmes. Certaines restent sous ta TV et ne bougent jamais. Certaines tiennent dans ta poche. Certaines font les deux.</p>
<p>Commençons par celle que la plupart des gens imaginent quand ils entendent le mot &ldquo;console.&rdquo;</p>

<h2>Conçue pour le Salon</h2>
<p>Une console de salon est conçue pour rester en place — connectée à ta TV, branchée sur le secteur. Elle n'a pas besoin d'une batterie. Elle n'a pas besoin d'être petite. Cette liberté permet aux ingénieurs d'intégrer du matériel plus puissant sans se soucier de la taille ou de l'autonomie.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-5.webp" alt="PlayStation 5" loading="lazy">
</figure>

<p>Le résultat ? Des mondes de jeu plus grands et plus détaillés. Des résolutions plus élevées. Des physiques et une IA plus complexes. Des expériences qui ne sont tout simplement pas possibles sur un appareil qui doit tenir dans ta main.</p>

<h2>La TV Fait Partie de l'Expérience</h2>
<p>Les consoles de salon sont conçues autour d'un grand écran. Les jeux sont construits en supposant que tu es assis à quelques mètres d'un grand écran — avec le son surround, un canapé confortable et une manette dans les mains.</p>
<p>Cette configuration crée quelque chose de différent de jouer sur un téléphone ou un laptop. Ce n'est pas juste jouer à un jeu. C'est un événement.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Pourquoi penses-tu que les développeurs font des jeux différents pour les consoles de salon que pour les téléphones mobiles — même quand certains téléphones sont techniquement aussi puissants que d'anciennes consoles ?</p>
  <p>La réponse n'est pas seulement le matériel. C'est le contexte. Une personne jouant sur un téléphone est probablement dans les transports ou attend quelque chose — elle a 5 minutes. Une personne sur une console de salon s'est assise intentionnellement, manette en main, TV allumée. Elle a du temps. Les développeurs construisent pour ce contexte.</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les consoles de salon meurent à cause du jeu mobile&rdquo;</h3>
  <p>Le jeu mobile génère plus de revenus que les consoles dans le monde entier. Ça semble alarmant — mais les audiences sont presque entièrement différentes. La plupart des joueurs mobiles ne se considèrent pas comme des &ldquo;gamers.&rdquo; Ils jouent à des jeux de puzzle ou des titres occasionnels pendant leurs temps libres. Les joueurs de consoles de salon sont un public séparé et dédié qui n'a pas diminué — c'est juste que le mobile a énormément grandi autour de lui.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Résolution</strong> — le nombre de pixels qui composent l'image à l'écran. Plus de pixels = image plus nette.</li>
    <li><strong>Console de salon</strong> — un appareil de jeu conçu pour être fixe, connecté à une TV et à une prise de courant.</li>
    <li><strong>Contexte</strong> — la situation et l'environnement dans lesquels quelque chose est utilisé.</li>
  </ul>
</div>`},

{lesson_id:8,lang:'fr',title:`Le Jeu Vidéo dans ta Poche`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce qui rend une console portable unique, les compromis impliqués, et pourquoi le jeu portable a sa propre communauté de fans dans le monde entier.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons regardé les consoles de salon — puissantes, fixes, conçues pour le salon. Regardons maintenant l'extrême opposé.</p>
</div>

<p>Et si tu ne voulais pas t'asseoir devant une TV ? Et si tu voulais jouer dans un train, dans un parc, ou dans ton lit ?</p>
<p>C'est exactement la question à laquelle les consoles portables répondent.</p>

<h2>Petite par Conception</h2>
<p>Une console portable a tout intégré dans un seul appareil — écran, commandes, haut-parleurs et batterie. Pas besoin de TV. Pas besoin de prise. Il suffit de la prendre et de jouer.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/game-boy.webp" alt="Game Boy" loading="lazy">
</figure>

<p>La Game Boy originale, lancée par Nintendo en 1989, était l'une des premières consoles portables véritablement réussies. Elle avait un petit écran à teinte verte, pas de rétroéclairage, et des graphismes très simples. Mais elle tenait dans ta poche — et ça a tout changé.</p>

<h2>Le Compromis</h2>
<p>Rendre une console petite et alimentée par batterie implique des compromis. On ne peut pas mettre le même matériel que dans une console de salon. L'écran est plus petit. Les haut-parleurs sont plus faibles.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Tu es un ingénieur qui conçoit une console portable. Tu as deux options : la rendre incroyablement puissante mais elle ne dure que 2 heures sur une charge — ou la rendre moins puissante mais elle dure 10 heures. Laquelle choisis-tu ? Pourquoi ?</p>
  <p>Nintendo a fait face exactement à cette décision avec la Game Boy originale. Ils ont choisi l'autonomie plutôt que la puissance — et ça a marché. La Game Boy a survécu à des concurrents plus puissants comme l'Atari Lynx et la Sega Game Gear précisément parce qu'elle pouvait tenir de longs trajets sur un seul jeu de piles.</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les consoles portables ne sont que pour les enfants&rdquo;</h3>
  <p>La réputation de jouet pour enfants de la Game Boy a persisté pendant des années. Mais la Nintendo DS s'est vendue à plus de 154 millions d'exemplaires dans le monde — dans toutes les tranches d'âge. La PlayStation Portable a attiré un public plus âgé avec des jeux plus complexes. Le jeu portable a toujours été pour tout le monde — l'étiquette &ldquo;enfants seulement&rdquo; n'a jamais été exacte.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Console portable</strong> — un appareil de jeu autonome avec un écran intégré, conçu pour être utilisé n'importe où.</li>
    <li><strong>Autonomie</strong> — combien de temps un appareil peut fonctionner sur une seule charge.</li>
    <li><strong>Compromis</strong> — gagner un avantage en acceptant un inconvénient ailleurs.</li>
  </ul>
</div>`},

{lesson_id:9,lang:'fr',title:`Le Meilleur des Deux Mondes — Les Consoles Hybrides`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce qu'est une console hybride, comment elle fonctionne, et pourquoi la Nintendo Switch a prouvé qu'on n'a pas à choisir entre le jeu à la maison et le jeu portable.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons exploré les consoles portables — des appareils autonomes conçus pour jouer n'importe où, avec l'autonomie comme compromis clé. Regardons maintenant ce qui se passe quand quelqu'un demande : pourquoi choisir ?</p>
</div>

<p>Pendant des décennies, les consoles de salon et les portables étaient deux mondes séparés. Tu avais ton installation TV pour le jeu sérieux, et ta portable pour les déplacements. Personne ne pensait qu'on pouvait les combiner — pas vraiment, du moins.</p>
<p>Puis Nintendo l'a fait.</p>

<h2>La Nintendo Switch</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/nintendo-switch.webp" alt="Nintendo Switch" loading="lazy">
</figure>

<p>Lancée en 2017, la Nintendo Switch est une console de salon qui se détache de ta TV et devient une portable. Le même appareil. Le même jeu. La même sauvegarde — que tu sois sur ton canapé ou dans un train.</p>
<p>Ça semble simple. Mais y parvenir a nécessité de repenser presque tout sur la façon dont une console est construite.</p>

<h2>Comment ça Marche ?</h2>
<p>La Switch a une petite tablette en son centre. Quand elle est dockée à la maison, elle se connecte à ta TV et tourne à des performances plus élevées — plus de puissance disponible parce qu'elle est branchée. Quand elle est non-dockée, elle tourne sur batterie à des paramètres légèrement inférieurs pour économiser l'énergie.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>La Switch fait tourner le même jeu dans deux modes différents — docké et portable. Le matériel ne change pas, mais les performances si. Comment penses-tu que la console gère ça ?</p>
  <p>Quand elle est dockée, la Switch tire de la puissance de la prise et peut pousser plus de performances à l'écran. Quand elle est non-dockée, elle bride — tourne délibérément à plus basse vitesse — pour prolonger l'autonomie. Le jeu s'ajuste automatiquement. Le joueur n'a rien à faire.</p>
</div>

<h2>Pourquoi ça a Marché</h2>
<p>Des tentatives précédentes de jeu hybride existaient — mais aucune n'a décollé. La Switch a réussi parce que Nintendo a construit toute une bibliothèque de jeux autour du concept. Chaque grand jeu Nintendo était conçu pour fonctionner aussi bien docké que portable. Le matériel et le logiciel ont été conçus ensemble, comme un seul système.</p>
<p>La Switch est devenue la troisième console la plus vendue de tous les temps, avec plus de 140 millions d'unités vendues dans le monde.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Hybride signifie compromis — elle ne peut rien faire correctement&rdquo;</h3>
  <p>La Switch est moins puissante qu'une PlayStation 5 ou une Xbox Series X. C'est vrai. Mais des millions de joueurs dans le monde l'ont quand même choisie — parce que la possibilité de jouer n'importe où, sur le même appareil, avec les mêmes jeux, valait plus pour eux que la puissance brute. Un compromis n'est pas toujours une faiblesse. Parfois c'est exactement le bon choix pour le bon public.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Console hybride</strong> — un appareil qui fonctionne à la fois comme une console de salon et une portable.</li>
    <li><strong>Mode docké</strong> — quand la Switch est connectée à la TV et tire de l'alimentation de la prise.</li>
    <li><strong>Brider</strong> — réduire délibérément les performances pour économiser la batterie ou gérer la chaleur.</li>
  </ul>
</div>`},

{lesson_id:10,lang:'fr',title:`Qu'est-ce qu'une Génération de Consoles ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce que signifie &ldquo;génération&rdquo; dans le jeu vidéo, pourquoi c'est important, et comment reconnaître à quelle génération appartient une console.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons exploré les trois types de consoles — salon, portable et hybride. Apprenons maintenant à penser aux consoles comme le fait l'industrie.</p>
</div>

<p>Tu as probablement entendu des phrases comme &ldquo;last-gen&rdquo; ou &ldquo;PlayStation de neuvième génération.&rdquo; Mais qu'est-ce que &ldquo;génération&rdquo; signifie vraiment ?</p>
<p>C'est plus simple que ça en a l'air.</p>

<h2>Une Génération est une Vague</h2>
<p>Une génération de consoles est un groupe de consoles concurrentes sorties à peu près en même temps, avec une technologie à peu près similaire. Quand Sony sort une nouvelle PlayStation, Microsoft sort une nouvelle Xbox à peu près en même période. Nintendo peut ou non suivre. Ensemble, ils forment une génération.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-5.webp" alt="PlayStation 5" loading="lazy">
</figure>

<p>Nous sommes actuellement dans la neuvième génération — PlayStation 5, Xbox Series X/S, et Nintendo Switch 2.</p>

<h2>Pourquoi les Générations Existent</h2>
<p>La technologie s'améliore avec le temps. Tous les quelques années, de nouveaux processeurs, puces graphiques et solutions de stockage deviennent disponibles à un prix qui a du sens pour un appareil grand public. Les fabricants de consoles attendent cette fenêtre — puis construisent la meilleure machine possible à un prix abordable.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Si la technologie s'améliore continuellement, pourquoi les fabricants de consoles ne sortent-ils pas du nouveau matériel chaque année — comme les fabricants de téléphones ?</p>
  <p>La réponse est la bibliothèque de jeux. Les développeurs passent des années à construire des jeux pour le matériel d'une console spécifique. Si le matériel change chaque année, ces jeux deviennent obsolètes trop vite. Une génération dure généralement 6 à 8 ans — suffisamment longtemps pour que les développeurs maîtrisent vraiment le matériel et créent leur meilleur travail.</p>
</div>

<h2>Compatibilité Ascendante</h2>
<p>Quand une nouvelle génération arrive, qu'arrive-t-il à tes vieux jeux ? Parfois rien — ils cessent simplement de fonctionner sur le nouveau matériel. Mais de plus en plus, les fabricants de consoles offrent la compatibilité ascendante : la possibilité de jouer à de vieux jeux sur une console plus récente.</p>
<p>La PlayStation 5, par exemple, joue la grande majorité des jeux PlayStation 4. Xbox Series X joue des jeux remontant à la Xbox originale de 2001.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Une nouvelle génération signifie toujours de meilleurs jeux&rdquo;</h3>
  <p>Le nouveau matériel donne aux développeurs de nouveaux outils — mais les outils ne produisent pas automatiquement de meilleurs jeux. Certains des jeux les mieux notés de la neuvième génération étaient aussi sortis sur le matériel de la huitième génération. Une nouvelle génération signifie de nouvelles possibilités, pas une amélioration automatique de la qualité.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Génération</strong> — un groupe de consoles concurrentes sorties à peu près en même temps avec une technologie similaire.</li>
    <li><strong>Compatibilité ascendante</strong> — la possibilité de jouer à des jeux d'une génération précédente sur du matériel plus récent.</li>
    <li><strong>Bibliothèque de jeux</strong> — la collection complète de jeux disponibles pour une console spécifique.</li>
  </ul>
</div>`},

{lesson_id:11,lang:'fr',title:`Pourquoi Je Ne Peux Pas Jouer à Ce Jeu sur Ma Console ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce que signifie l'exclusivité, pourquoi elle existe, et pourquoi certains jeux ne sont disponibles que sur une seule plateforme.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons appris ce qu'est une génération de consoles, pourquoi les générations durent 6 à 8 ans, et ce que signifie la compatibilité ascendante. Abordons maintenant l'une des réalités les plus frustrantes du jeu vidéo sur console.</p>
</div>

<p>Tu l'as déjà vu. Un jeu est annoncé. Il a l'air incroyable. Et puis — &ldquo;Uniquement sur PlayStation.&rdquo;</p>
<p>Pourquoi ? Pourquoi un jeu serait-il limité à une seule console ?</p>

<h2>Deux Types d'Exclusivités</h2>
<p>Toutes les exclusivités ne se valent pas. Il en existe deux types :</p>
<p><strong>Exclusivités first-party</strong> — jeux fabriqués par le fabricant de console lui-même. Nintendo fait Mario et Zelda. Sony fait God of War et Spider-Man. Microsoft fait Halo. Ces jeux n'apparaîtront jamais sur une console concurrente — l'entreprise qui a fait la console a aussi fait le jeu.</p>
<p><strong>Exclusivités third-party</strong> — jeux faits par des studios indépendants, mais financés ou contractuellement liés par un fabricant de console pour rester exclusifs pendant un certain temps. Parfois cette exclusivité est permanente. Parfois elle expire après 6 à 12 mois et le jeu arrive sur d'autres plateformes.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-4.webp" alt="PlayStation 4" loading="lazy">
</figure>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Si tu étais Sony, pourquoi paieriez-tu un studio pour garder son jeu exclusif à PlayStation ? Qu'est-ce que tu en retires ?</p>
  <p>La réponse est simple : les ventes de consoles. Si un jeu est suffisamment bon pour que les joueurs l'aient absolument, ils achèteront la console sur laquelle il se trouve. Les exclusivités sont l'un des outils les plus puissants d'un fabricant de consoles.</p>
</div>

<h2>L'Exclusivité est-elle Bonne ou Mauvaise ?</h2>
<p>Pour l'industrie, c'est compliqué. Les exclusivités stimulent la concurrence — les entreprises investissent dans de bons jeux pour attirer les joueurs. Mais pour les joueurs, il peut être frustrant de rater un jeu simplement à cause de la console qu'ils possèdent.</p>
<p>La tendance ces dernières années va vers plus d'ouverture. Microsoft sort maintenant la plupart de ses jeux sur PC en plus de Xbox. Certaines anciennes exclusivités PlayStation sont sorties sur PC des années plus tard. Les murs tombent lentement — mais ils n'ont pas disparu.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les exclusivités ne sont qu'une question d'argent — les studios y sont forcés&rdquo;</h3>
  <p>Parfois les deals d'exclusivité impliquent de l'argent, oui. Mais beaucoup de studios first-party choisissent de travailler avec une plateforme parce que le partenariat leur offre des ressources, de la liberté et un soutien créatif qu'ils n'auraient pas autrement. La relation n'est pas toujours purement financière.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Exclusif</strong> — un jeu disponible uniquement sur une console ou plateforme spécifique.</li>
    <li><strong>First-party</strong> — développé par le propre studio du fabricant de console.</li>
    <li><strong>Third-party</strong> — développé par un studio indépendant, non détenu par le fabricant de console.</li>
  </ul>
</div>`},

{lesson_id:12,lang:'fr',title:`Digital vs Physique — Comment Possèdes-tu un Jeu ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : la différence entre les jeux physiques et numériques, ce que &ldquo;posséder&rdquo; un jeu signifie vraiment aujourd'hui, et comment l'industrie évolue.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons exploré l'exclusivité — pourquoi certains jeux sont limités à une plateforme et comment ça stimule les ventes de consoles. Regardons maintenant quelque chose qui concerne chaque joueur : comment tu obtiens et gardes tes jeux.</p>
</div>

<p>Entre dans n'importe quel magasin d'électronique et tu verras des boîtes de jeux sur les étagères. Va sur le PlayStation Store ou la marketplace Xbox et tu trouveras les mêmes jeux en téléchargement numérique. Même jeu, deux façons très différentes de l'obtenir.</p>
<p>Quelle est la différence — et est-ce important ?</p>

<h2>Jeux Physiques</h2>
<p>Un jeu physique vient sur un disque ou une cartouche. Tu l'achètes, tu possèdes l'objet. Tu peux le prêter à un ami, le vendre, ou l'acheter d'occasion à moindre prix.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/nintendo-nes.webp" alt="Cartouche Nintendo NES" loading="lazy">
</figure>

<p>Mais les supports physiques peuvent casser. Les disques se rayent. Les cartouches s'usent. Et si le jeu nécessite une mise à jour en ligne pour fonctionner correctement — ce que la plupart des jeux modernes nécessitent — tu as quand même besoin d'une connexion internet.</p>

<h2>Jeux Numériques</h2>
<p>Un jeu numérique est téléchargé directement sur ta console. Pas de disque, pas de cartouche. Il est toujours là, toujours prêt. Aucun risque de le perdre ou de l'abîmer.</p>
<p>Mais voici le piège : tu ne le possèdes pas vraiment de la même façon. Tu possèdes une licence — le droit d'accéder au jeu. Si le store numérique ferme, ou si ton compte est banni, cette licence peut disparaître.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Si tu achètes un livre physique, tu le possèdes pour toujours — tu peux le vendre, le prêter, le garder 30 ans. Si tu achètes un jeu numérique, peux-tu faire pareil ? Que possèdes-tu vraiment ?</p>
</div>

<h2>L'Industrie Va au Numérique</h2>
<p>Au cours de la dernière décennie, les ventes de jeux numériques ont dépassé les ventes physiques dans le monde. Certaines nouvelles consoles — comme l'édition numérique de la PlayStation 5 — n'ont même pas de lecteur de disque. L'industrie va clairement dans une direction.</p>
<p>Pour les joueurs, cela signifie plus de commodité. Pour la préservation des jeux — garder les vieux jeux accessibles aux générations futures — ça soulève des questions sérieuses.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les jeux numériques sont toujours moins chers&rdquo;</h3>
  <p>Les jeux numériques ont souvent le même prix que les jeux physiques, parfois plus. Sans le marché de l'occasion, il n'y a pas de concurrence sur les prix. Les jeux physiques baissent de prix plus vite parce que les magasins ont besoin d'écouler leur stock. Les prix numériques sont entièrement contrôlés par la plateforme.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Licence</strong> — le droit légal d'utiliser quelque chose, sans posséder la chose elle-même.</li>
    <li><strong>Store numérique</strong> — une marketplace en ligne où tu achètes et télécharges des jeux directement sur ta console.</li>
    <li><strong>Préservation des jeux</strong> — l'effort pour garder les vieux jeux accessibles et jouables pour les générations futures.</li>
  </ul>
</div>`},

{lesson_id:13,lang:'fr',title:`Ce Qui Compte Vraiment Quand on Choisit une Console`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : les vrais facteurs qui devraient influencer ton choix de console — et pourquoi &ldquo;laquelle est la plus puissante&rdquo; est la mauvaise question de départ.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons appris comment les jeux sont vendus — physique vs numérique, et ce que &ldquo;posséder&rdquo; un jeu signifie vraiment en 2025. Maintenant, mettons tout ça ensemble et répondons à la question que la plupart des nouveaux joueurs posent en premier : quelle console devrais-je acheter ?</p>
</div>

<p>Voici la vérité honnête : il n'y a pas de meilleure console objectivement. Il y a seulement la meilleure console pour toi.</p>
<p>Mais comment savoir laquelle c'est ?</p>

<h2>Facteur 1 — Les Jeux</h2>
<p>C'est le facteur le plus important. Avant tout, demande-toi : quels jeux veux-tu vraiment jouer ?</p>
<p>Si tes amis jouent tous à un jeu exclusif à PlayStation — c'est important. S'il y a une franchise Nintendo avec laquelle tu as grandi en regardant et que tu as toujours voulu essayer — c'est important. Les specs techniques ne comptent pas si les jeux que tu veux ne sont pas sur cette plateforme.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-5.webp" alt="PlayStation 5" loading="lazy">
</figure>

<h2>Facteur 2 — Tes Amis</h2>
<p>Le jeu multijoueur est social. Si tous tes amis sont sur Xbox, obtenir une PlayStation signifie jouer seul. C'est l'un des facteurs les plus sous-estimés — et l'un des plus honnêtes.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Préfères-tu jouer à une version légèrement moins bonne d'un jeu avec tes amis, ou à la meilleure version tout seul ? La plupart des gens, quand ils sont honnêtes, choisissent leurs amis.</p>
</div>

<h2>Facteur 3 — Le Budget</h2>
<p>Les consoles varient considérablement en prix — de quelques centaines pour une Nintendo Switch Lite à beaucoup plus pour une PlayStation 5 ou une Xbox Series X. Et la console elle-même n'est que le début. Les manettes, les jeux, les abonnements en ligne — tout s'additionne.</p>
<p>Une console moins chère que tu peux vraiment te permettre te donnera plus d'heures de jeu qu'une console chère pour laquelle tu économises.</p>

<h2>Facteur 4 — Comment tu Joues</h2>
<p>Veux-tu jouer sur un grand écran ? Veux-tu jouer dans ton lit ou dans les transports ? Préfères-tu les histoires solo ou le multijoueur compétitif ? Ton style de jeu compte autant que le matériel.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Prends juste la plus puissante&rdquo;</h3>
  <p>La puissance est sans importance si les jeux que tu veux ne sont pas sur cette plateforme. La voiture la plus puissante du monde est inutile si tu dois aller en tout-terrain et qu'elle n'a pas de quatre roues motrices.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Style de jeu</strong> — comment et où tu préfères jouer.</li>
    <li><strong>Abonnement en ligne</strong> — un paiement récurrent requis pour jouer en multijoueur sur la plupart des consoles.</li>
    <li><strong>Plateforme</strong> — l'écosystème de console spécifique (PlayStation, Xbox, Nintendo) incluant son matériel, son store et sa bibliothèque de jeux.</li>
  </ul>
</div>`},

{lesson_id:14,lang:'fr',title:`Un Rapide Tour d'Horizon des Consoles d'Aujourd'hui`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : ce que chaque console majeure offre en 2025, pour que tu puisses prendre une décision éclairée.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons couvert les quatre facteurs qui comptent quand on choisit une console — jeux, amis, budget et style de jeu. Regardons maintenant ce qui est réellement disponible.</p>
</div>

<p>Trois acteurs dominent le marché des consoles aujourd'hui. Chacun a une identité claire. Chacun est le bon choix pour un type de joueur différent.</p>

<h2>Sony — PlayStation 5</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-5.webp" alt="PlayStation 5" loading="lazy">
</figure>

<p>Sony mise sur des expériences solo cinématographiques. Des jeux comme God of War, Spider-Man et The Last of Us sont construits comme des films interactifs — riches en histoires, visuellement époustouflants, avec des personnages profonds.</p>
<p>La PS5 a aussi l'une des manettes les plus innovantes jamais créées — la DualSense, qui utilise le retour haptique et les gâchettes adaptatives pour te faire sentir ce qui se passe dans le jeu. La pluie se sent différemment du gravier. Tendre un arc se sent comme une tension dans tes doigts.</p>
<p><strong>Idéale pour :</strong> les joueurs qui aiment les jeux axés sur l'histoire et visuellement impressionnants.</p>

<h2>Microsoft — Xbox Series X / S</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/xbox-series-x.webp" alt="Xbox Series X" loading="lazy">
</figure>

<p>Microsoft mise sur la valeur et les services. Xbox Game Pass donne aux joueurs accès à des centaines de jeux pour un abonnement mensuel — au lieu d'acheter chaque jeu individuellement. Pour les joueurs qui veulent de la variété sans dépenser beaucoup par jeu, c'est une offre convaincante.</p>
<p>La Series S est aussi la console de génération actuelle la plus abordable — nettement moins chère qu'une PS5 ou Series X, au prix de certaines performances.</p>
<p><strong>Idéale pour :</strong> les joueurs qui veulent accéder à de nombreux jeux à moindre coût.</p>

<h2>Nintendo — Switch 2</h2>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/nintendo-switch-2.webp" alt="Nintendo Switch 2" loading="lazy">
</figure>

<p>Nintendo mise sur le fun et la portabilité. La Switch 2 ne concurrence pas sur la puissance brute — elle concurrence sur l'expérience. Mario, Zelda, Pok&eacute;mon, Donkey Kong — des franchises qui n'existent nulle part ailleurs, construites autour d'un gameplay difficile à trouver sur toute autre plateforme.</p>
<p>Et bien sûr — elle t'accompagne partout.</p>
<p><strong>Idéale pour :</strong> les joueurs qui valorisent les expériences de jeu uniques, la portabilité, ou les titres familiaux.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>D'après ce que tu as lu — quelle console te ressemble le plus ? Pas laquelle est &ldquo;la meilleure&rdquo; — laquelle correspond à ta vie ?</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Tu dois en choisir une et t'y tenir pour toujours&rdquo;</h3>
  <p>Beaucoup de joueurs possèdent plus d'une console au cours de leur vie — ou même en même temps. Une PS5 pour les grands jeux narratifs, une Switch pour le jeu portable. Il n'y a pas de règle qui dit que tu ne peux en avoir qu'une. Commence par ce qui a du sens maintenant, et réévalue plus tard.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Retour haptique</strong> — technologie qui simule des sensations physiques via des vibrations dans une manette.</li>
    <li><strong>Modèle d'abonnement</strong> — payer un frais récurrent pour accéder à un service ou une bibliothèque au lieu d'acheter des articles individuellement.</li>
    <li><strong>Génération actuelle</strong> — la vague de consoles la plus récente disponible en ce moment.</li>
  </ul>
</div>`},

{lesson_id:15,lang:'fr',title:`Quelle Console est Faite pour Toi ?`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment appliquer tout ce module pour prendre une décision confiante et personnelle — et pourquoi il n'y a pas de mauvaise réponse.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons regardé les trois grandes consoles disponibles aujourd'hui — PS5, Xbox Series X/S, et Nintendo Switch 2 — et ce que chacune représente. Il est maintenant temps de tout mettre ensemble.</p>
</div>

<p>Tu as beaucoup appris. Tu sais ce qu'est une console, comment elle fonctionne, son histoire, ses types, et à quoi ressemblent les options actuelles. Vient maintenant la question la plus personnelle de tout le cours :</p>
<p>Laquelle est vraiment faite pour toi ?</p>

<h2>Un Cadre Simple</h2>
<p>Oublie les specs. Oublie le prix un moment. Réponds honnêtement à ces trois questions :</p>

<h3>1. Quels jeux veux-tu jouer ?</h3>
<p>Regarde les jeux exclusifs de chaque plateforme. Si une liste t'enthousiasme beaucoup plus que les autres — c'est ta réponse.</p>

<h3>2. Où et comment joues-tu ?</h3>
<p>Surtout à la maison devant une TV → PS5 ou Xbox. En déplacement, dans ton lit, chez un ami → Switch 2. Les deux → Switch 2, ou économise pour deux.</p>

<h3>3. Quel est ton budget — honnêtement ?</h3>
<p>Ne te force pas pour une console. Une Switch Lite coûte une fraction d'une PS5. Si le budget est serré, l'option moins chère que tu peux acheter aujourd'hui bat l'option chère que tu attends.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Passe en revue ces trois questions maintenant — pas comme hypothèse, mais réponds-y vraiment pour toi-même. À quoi arrives-tu ?</p>
</div>

<h2>Il N'y a Pas de Mauvaise Réponse</h2>
<p>Les joueurs PlayStation ne sont pas plus intelligents que les joueurs Xbox. Les fans Nintendo ne sont pas moins sérieux que les propriétaires de PS5. Ce sont des outils pour s'amuser — et le bon outil est celui qui correspond à ta vie.</p>
<p>Les guerres des consoles en ligne sont bruyantes. La réalité est plus silencieuse : la plupart des joueurs choisissent simplement ce qui leur convient et en profitent.</p>

<h2>Et Maintenant ?</h2>
<p>Tu as terminé le Module 5. Il reste un module — et il est pratique. Maintenant que tu sais comment choisir une console, assurons-nous que tu sais comment en prendre soin.</p>

<div class="cta-block">
  <p>Et si après ce cours tu te trouves curieux de ce qui se passe réellement dans cette boîte — les circuits, l'électricité, le matériel — c'est exactement pour ça qu'est fait <strong>Console Engineering</strong>. Mais finis celui-ci d'abord.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Cadre</strong> — une façon structurée de réfléchir à une décision.</li>
    <li><strong>Bibliothèque exclusive</strong> — la collection complète de jeux disponibles uniquement sur une plateforme spécifique.</li>
  </ul>
</div>`},

{lesson_id:16,lang:'fr',title:`Pourquoi l'Entretien de la Console est Important`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : pourquoi les consoles nécessitent des soins réguliers, ce qui se passe quand tu les négliges, et comment un peu d'effort fait beaucoup de chemin.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons fini de choisir ta console. Assurons-nous maintenant que tu sais comment la garder en bon état — parce que même le meilleur matériel peut tomber en panne si tu le négliges.</p>
</div>

<p>Tu viens d'obtenir une console. Ou peut-être que tu en as une depuis des années. Dans tous les cas, voici quelque chose que la plupart des joueurs ne considèrent jamais avant qu'il ne soit trop tard :</p>
<p>Une console est une machine. Les machines ont besoin d'entretien.</p>
<p>Ça semble évident. Mais le nombre de consoles qui meurent de causes entièrement évitables est étonnamment élevé. La surchauffe. L'accumulation de poussière. Un stockage incorrect. Des choses qui prennent cinq minutes à prévenir — et des heures et de l'argent à réparer.</p>

<h2>Ce Qui va Vraiment Mal</h2>
<p>La cause la plus courante de panne de console n'est pas un défaut de fabrication. C'est la chaleur.</p>
<p>Chaque console génère de la chaleur en fonctionnant — c'est normal. Ta console a des ventilateurs et des évents conçus pour expulser cette chaleur. Mais avec le temps, la poussière s'accumule à l'intérieur. Les ventilateurs travaillent plus dur. La chaleur n'a nulle part où aller. Finalement, les composants commencent à tomber en panne.</p>

<figure class="lesson-console-img">
  <img src="../../assets/images/consoles/playstation-4.webp" alt="PlayStation 4 — zone des évents" loading="lazy">
</figure>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Imagine ta console comme quelqu'un qui court un marathon. Elle génère de la chaleur, elle respire fort, elle a besoin d'air. Maintenant imagine que quelqu'un lui met un oreiller sur le visage. C'est ce qui se passe quand tu bloques les évents d'une console.</p>
</div>

<h2>La Bonne Nouvelle</h2>
<p>La plupart de l'entretien des consoles est simple, gratuit et ne prend presque pas de temps. Tu n'as pas besoin d'ouvrir quoi que ce soit. Tu n'as pas besoin d'outils. Tu as juste besoin de savoir quoi faire — et quoi ne pas faire.</p>
<p>C'est exactement ce que couvrent les deux prochaines leçons.</p>

<div class="myth-block">
  <h3>Mythe : &ldquo;Les consoles sont scellées — je ne peux rien faire sur ce qu'il y a dedans&rdquo;</h3>
  <p>Tu n'as pas besoin d'ouvrir une console pour l'entretenir. La majorité de l'entretien se fait de l'extérieur — garder les évents dégagés, la stocker correctement, la manipuler avec soin. Ouvrir une console n'est nécessaire que pour les réparations, et même alors, seulement pour des mains expérimentées.</p>
</div>

<div class="cta-block">
  <p>Curieux de savoir ce qu'il y a vraiment à l'intérieur et comment la gestion thermique fonctionne au niveau matériel ? <strong>Console Engineering</strong> couvre la conception thermique et les systèmes de refroidissement en détail. Mais d'abord — assurons-nous que tu connais les bases.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Limitation thermique</strong> — quand une console ralentit automatiquement pour réduire la chaleur et éviter les dommages.</li>
    <li><strong>Ventilation</strong> — la circulation d'air à travers un appareil pour évacuer la chaleur.</li>
    <li><strong>Composant</strong> — une pièce individuelle à l'intérieur d'une console, comme le processeur ou le ventilateur.</li>
  </ul>
</div>`},

{lesson_id:17,lang:'fr',title:`Les Bonnes et Mauvaises Pratiques pour Prendre Soin de ta Console`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : les habitudes pratiques qui gardent ta console en bonne santé — et les erreurs courantes qui la tuent silencieusement.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons appris pourquoi l'entretien est important — la chaleur est le principal ennemi, la poussière est la principale cause, et la plupart des problèmes sont évitables. Maintenant, soyons précis.</p>
</div>

<p>Gardons ça simple. Deux listes. Suis la première, évite la seconde.</p>

<h2>✅ À FAIRE — Bonnes Habitudes</h2>

<h3>Garde les évents dégagés.</h3>
<p>Ta console a besoin d'au moins 10 à 15 cm d'espace libre autour d'elle — surtout derrière et sur les côtés. Ne la mets jamais dans une armoire fermée ou une boîte pendant qu'elle fonctionne. La circulation d'air est essentielle.</p>

<h3>Oriente-la correctement.</h3>
<p>La plupart des consoles modernes sont conçues pour fonctionner horizontalement et verticalement — mais vérifie ton modèle spécifique. Certaines ont une meilleure circulation d'air dans une orientation. Si tu n'es pas sûr, l'horizontal est presque toujours sûr.</p>

<h3>Dépoussierre régulièrement.</h3>
<p>Tous les quelques mois, utilise une bombe d'air comprimé pour souffler la poussière des évents de l'extérieur. Pas besoin d'ouvrir quoi que ce soit — un coup rapide garde la circulation d'air dégagée.</p>

<h3>Stocke-la en sécurité.</h3>
<p>Si tu n'utilises pas ta console pendant un moment, stocke-la quelque part frais et sec. Évite la lumière directe du soleil, les températures extrêmes et l'humidité.</p>

<h3>Manipule les disques et les cartouches avec soin.</h3>
<p>Tiens les disques par les bords, ne touche jamais la surface brillante. Range les cartouches dans leurs boîtiers. Ce sont de petites habitudes qui évitent de grands problèmes.</p>

<h2>❌ À NE PAS FAIRE — Erreurs Courantes</h2>

<h3>Ne bloque pas les évents.</h3>
<p>Pas avec un tissu, pas avec d'autres appareils, pas en la poussant contre un mur. Évents bloqués = chaleur emprisonnée = panne.</p>

<h3>Ne la déplace pas pendant qu'elle fonctionne.</h3>
<p>Surtout pour les consoles avec des lecteurs de disques. Un disque tournant à grande vitesse dans une console en mouvement peut se rayer — ou pire, se briser. Mets toujours en pause ou éteins avant de déplacer.</p>

<h3>Ne la laisse pas en plein soleil.</h3>
<p>Une exposition prolongée au soleil chauffe la console de l'extérieur pendant qu'elle génère déjà de la chaleur de l'intérieur. Pas une bonne combinaison.</p>

<h3>Ne ignore pas les signes d'alerte.</h3>
<p>Si ta console est plus bruyante que d'habitude — ventilateurs à pleine vitesse constamment — c'est un signe qu'elle a du mal avec la chaleur. Si elle s'éteint de façon inattendue, c'est la limitation thermique qui fait son travail. N'ignore ni l'un ni l'autre.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>La plupart de ces habitudes sont du bon sens une fois que tu comprends que la chaleur est l'ennemi. En regardant la liste &ldquo;à ne pas faire&rdquo; — peux-tu deviner pourquoi chacune cause un problème de chaleur avant de lire l'explication ?</p>
</div>

<div class="myth-block">
  <h3>Mythe : &ldquo;Si ma console est bruyante, elle est cassée&rdquo;</h3>
  <p>Un ventilateur bruyant ne signifie pas que ta console est cassée — ça signifie qu'elle travaille dur. Les ventilateurs s'accélèrent pour expulser plus d'air chaud. Si ta console devient bruyante pendant un jeu exigeant, c'est normal. Si elle est bruyante tout le temps même dans les menus, c'est un signe que la poussière s'est accumulée et qu'il est temps de nettoyer les évents.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Air comprimé</strong> — air pressurisé en bombe, utilisé pour souffler la poussière des appareils électroniques sans toucher les composants internes.</li>
    <li><strong>Lecteur de disque</strong> — la fente où les disques de jeux physiques sont insérés et lus.</li>
    <li><strong>Orientation</strong> — si une console est debout verticalement ou couchée horizontalement.</li>
  </ul>
</div>`},

{lesson_id:18,lang:'fr',title:`Stockage, Transport et Entretien à Long Terme`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment stocker ta console en sécurité quand tu ne l'utilises pas, comment la transporter sans dommage, et comment la garder en bon état pendant des années.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons couvert les bonnes et mauvaises pratiques de l'entretien quotidien — garder les évents dégagés, dépoussiérer régulièrement et reconnaître les signes d'alerte. Regardons maintenant le tableau d'ensemble : que se passe-t-il quand tu ne l'utilises pas pendant un moment, ou que tu dois l'emporter quelque part ?</p>
</div>

<p>La plupart des joueurs ne pensent à l'entretien que quand quelque chose va mal. Les joueurs qui n'ont jamais de problèmes sont ceux qui y pensent avant que quoi que ce soit n'arrive.</p>

<h2>Stocker ta Console</h2>
<p>Si tu n'utilises pas ta console pendant des semaines ou des mois — peut-être que tu voyages, que tu déménages, ou que tu fais simplement une pause — la façon dont tu la stockes est importante.</p>

<h3>Frais et sec.</h3>
<p>La chaleur et l'humidité sont les ennemis de l'électronique. Un placard, une étagère ou une boîte dans un espace à température ambiante est idéal. Ne stocke jamais une console dans un garage, un grenier, ou tout endroit avec des températures extrêmes.</p>

<h3>À l'abri de la lumière directe du soleil.</h3>
<p>La lumière UV et la chaleur du soleil dégradent le plastique et les composants internes avec le temps. Même en stockage, garde-la dans un endroit à l'ombre.</p>

<h3>Debout ou à plat — mais stable.</h3>
<p>Quelle que soit l'orientation que tu choisis, assure-toi qu'elle ne peut pas tomber. Une console qui tombe d'une étagère cause plus de dommages que des années d'utilisation normale.</p>

<h2>Transporter ta Console</h2>
<p>Tu emmènes ta console chez un ami ? Tu déménages ? Quelques règles :</p>

<h3>Éteins-la complètement.</h3>
<p>Pas le mode veille — éteinte complètement. Déplacer une console en mode veille risque une corruption des données si elle perd de l'alimentation en cours de transfert.</p>

<h3>Retire les disques d'abord.</h3>
<p>Toujours. Sans exception. Un disque laissé à l'intérieur pendant le transport peut vibrer, se rayer ou se briser.</p>

<h3>Utilise la boîte d'origine si tu l'as.</h3>
<p>Les fabricants conçoivent l'emballage spécifiquement pour protéger la console pendant le transport. Si tu ne l'as pas, enveloppe-la dans un tissu doux ou utilise un sac rembourré.</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Tu déménages et dois emballer ta console. Tu as la boîte d'origine, un sac à dos et une valise. Laquelle utilises-tu — et pourquoi ?</p>
  <p>La boîte d'origine, toujours. Elle est moulée exactement à la forme de la console, avec du rembourrage aux bons endroits. Un sac à dos ou une valise n'offre pas de protection spécifique — la console peut bouger et heurter d'autres objets pendant le transport.</p>
</div>

<h2>Entretien à Long Terme</h2>
<p>Au-delà des bases, quelques habitudes prolongent significativement la durée de vie de ta console :</p>
<ul>
  <li><strong>Ne la laisse pas en veille pendant des mois.</strong> Si tu ne l'utilises pas, éteins-la correctement. Le mode veille consomme encore de l'énergie et génère de la chaleur.</li>
  <li><strong>Range les manettes en sécurité.</strong> Les manettes laissées sur le sol se font marcher dessus, tombent et s'abîment. Un simple crochet ou tiroir les garde en sécurité et prolonge leur durée de vie.</li>
  <li><strong>Vérifie les mises à jour logicielles périodiquement.</strong> Même en stockage, des mises à jour occasionnelles gardent le firmware de la console stable et sécurisé pour quand tu y reviendras.</li>
</ul>

<div class="myth-block">
  <h3>Mythe : &ldquo;Le mode veille c'est pareil qu'éteindre&rdquo;</h3>
  <p>Le mode veille garde la console partiellement active — téléchargeant des mises à jour, synchronisant des données, restant prête à se réveiller instantanément. C'est pratique, mais ce n'est pas la même chose que l'éteindre. Pour les longues périodes de stockage, un arrêt complet est toujours préférable.</p>
</div>

<div class="cta-block">
  <p>Si tu dois un jour aller plus loin — diagnostiquer une console qui ne s'allume pas, remplacer un ventilateur, ou comprendre pourquoi les composants tombent en panne — c'est exactement pour ça que les cours <strong>Console Modding</strong> et <strong>Console Engineering</strong> sont faits. Tu as maintenant tout ce qu'il te faut pour commencer.</p>
</div>

<div class="glossary-block">
  <h3>Nouveaux termes</h3>
  <ul>
    <li><strong>Firmware</strong> — le logiciel intégré dans le matériel d'une console qui contrôle les fonctions de base.</li>
    <li><strong>Mode veille</strong> — un état basse consommation où la console semble éteinte mais reste partiellement active.</li>
    <li><strong>Corruption de données</strong> — quand des fichiers sont endommagés ou perdus suite à un arrêt incorrect ou une perte d'alimentation.</li>
  </ul>
</div>`},

{lesson_id:19,lang:'fr',title:`Et Maintenant ? Ton Voyage Ne Fait que Commencer`,content_html:`<div class="intro-box">
  <p>Dans cette leçon, tu apprendras : comment réfléchir à tout ce que tu as couvert — et où aller ensuite.</p>
</div>

<div class="recap-block">
  <p><strong>La dernière fois :</strong> Nous avons couvert le stockage à long terme, le transport sécurisé de ta console, et les habitudes qui gardent ton matériel en bon état pendant des années.</p>
</div>

<p>Tu l'as fait.</p>
<p>Quand tu as commencé ce cours, une console était probablement juste une boîte sous une TV. Maintenant tu sais ce qu'il y a à l'intérieur, comment elle est venue à exister, pourquoi certains jeux ne sont que sur certaines plateformes, comment fonctionnent les générations, et comment garder ton matériel en vie pendant des années.</p>
<p>Ce n'est pas rien. La plupart des joueurs ne pensent jamais à tout ça.</p>

<h2>Ce que tu as Appris</h2>
<p>Prenons un moment pour voir tout le chemin parcouru :</p>
<ul>
  <li>Tu sais ce qu'est une console — et pourquoi elle existe en tant qu'appareil à part entière</li>
  <li>Tu comprends comment un appui de bouton devient une image à l'écran</li>
  <li>Tu connais l'histoire — de la Magnavox Odyssey à la PlayStation 5</li>
  <li>Tu peux distinguer les consoles de salon, portables et hybrides</li>
  <li>Tu comprends les générations, l'exclusivité, et le numérique vs physique</li>
  <li>Tu sais comment choisir la bonne console pour toi</li>
  <li>Tu sais comment en prendre soin</li>
</ul>

<h2>Mais Il y a une Couche Plus Profonde</h2>
<p>Voici une question : tu sais maintenant qu'une console a un CPU, un GPU et de la RAM. Tu sais que le GPU rend les frames. Tu sais que la chaleur est l'ennemi.</p>
<p>Mais pourquoi la chaleur s'accumule-t-elle ? Que se passe-t-il réellement dans ces puces quand elles fonctionnent ? Comment l'électricité devient-elle un personnage qui bouge sur ton écran ?</p>

<div class="think-block">
  <h3>Réfléchis à ça</h3>
  <p>Tu as utilisé le mot &ldquo;processeur&rdquo; tout au long de ce cours. Tu sais ce qu'il fait — il gère la logique du jeu. Mais sais-tu vraiment comment il le fait ? Que se passe-t-il au niveau des circuits et de l'électricité ?</p>
  <p>Si cette question te rend curieux — tu es prêt.</p>
</div>

<h2>Console Engineering t'Attend</h2>
<p>Console Engineering reprend exactement là où ce cours s'arrête. Pas avec des concepts vagues — avec de vraies réponses.</p>
<p>Tu apprendras comment l'électricité circule dans un circuit. Comment un processeur exécute des instructions. Comment une puce graphique construit une frame pixel par pixel. Comment les ingénieurs conçoivent des systèmes de refroidissement pour combattre la chaleur que tu sais maintenant être l'ennemi.</p>
<p>Ce n'est pas un cours pour débutants. Mais tu n'es plus un débutant.</p>

<blockquote>&ldquo;Le meilleur moment pour commencer Console Engineering, c'est juste après avoir terminé ce cours — quand tout est encore frais et que les questions sont encore vivantes dans ton esprit.&rdquo;</blockquote>

<h2>Une Dernière Chose</h2>
<p>Le jeu vidéo, c'est plus que du divertissement. C'est l'un des produits de consommation techniquement les plus complexes jamais construits — conçu pour être utilisé par des gens qui n'ont jamais besoin d'y penser.</p>
<p>Tu as choisi d'y penser quand même. Ça compte.</p>

<div class="cta-block">
  <p>Prêt à aller plus loin ? <strong>Console Engineering</strong> est la prochaine étape — des fondamentaux de l'électricité à l'architecture matérielle, appliqués directement aux consoles que tu connais maintenant.</p>
</div>`},

// ─── PLACEHOLDER for ES, DE, IT ─────────────────────────────────────────────
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const t of translations) {
      await client.query(
        `INSERT INTO lesson_translations (lesson_id, lang, title, content_html)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (lesson_id, lang) DO UPDATE
         SET title = EXCLUDED.title, content_html = EXCLUDED.content_html`,
        [t.lesson_id, t.lang, t.title, t.content_html]
      );
      count++;
    }
    await client.query('COMMIT');
    console.log(`Done: inserted/updated ${count} translations`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
