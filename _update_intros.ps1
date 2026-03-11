# Update lesson introductions to be friendly and engaging (like lectia 1.1)
# Each intro: hook paragraph, topics paragraph, purpose paragraph

$basePath = "c:\Users\andre\OneDrive\Documentos\Proiecte HTML\Atestat Info\src\html\pages\curs"

$intros = @{

"lectia-1-2.html" = @"
                <p>
                    Imaginează-ți circuitul de alimentare al unui PlayStation 5: curentul pleacă din PSU, parcurge trasee de cupru, ajunge la SoC și se întoarce prin planul de masă. Dar ce pune electronii în mișcare? Ce determină câți electroni trec pe secundă? Și cum controlăm acest flux? Răspunsurile se află în trei mărimi fundamentale — tensiune, curent și rezistență — și în relația matematică care le leagă: Legea lui Ohm.
                </p>
                <p>
                    Această lecție construiește pe fundația atomică din lecția anterioară și introduce <strong>tensiunea electrică</strong> (forța motrice), <strong>curentul electric</strong> (fluxul de sarcini), <strong>rezistența</strong> (opoziția controlată), <strong>Legea lui Ohm</strong>, <strong>puterea electrică</strong> și <strong>triunghiul lui Ohm</strong> — instrumentele de bază pe care orice inginer le folosește zilnic pentru a analiza circuite.
                </p>
                <p>
                    Scopul nu este doar memorarea formulelor V = I × R sau P = I × V, ci înțelegerea intuitivă a modului în care tensiunea „împinge", curentul „curge" și rezistența „controlează" — și de ce orice tehnician de console trebuie să gândească în acești termeni când diagnostichează o placă de bază.
                </p>
"@

"lectia-1-3.html" = @"
                <p>
                    Un SoC cu 16 miliarde de tranzistori este inutil fără un traseu complet de la sursă la componentă și înapoi. Fiecare pin de pe chipul unui Xbox Series X face parte dintr-o buclă electrică — un circuit — care trebuie să rămână intact pentru ca datele să circule. Când o lipitură cedează și bucla se rupe, consola se oprește. Când două trasee se ating accidental, curentul explodează. Totul pornește de la un principiu simplu: circuitul electric.
                </p>
                <p>
                    Această lecție acoperă <strong>circuitul deschis</strong> (întreruperea care oprește curentul), <strong>circuitul închis</strong> (bucla completă necesară funcționării), <strong>scurtcircuitul</strong> (calea accidentală care distruge componente), <strong>conductorul</strong>, <strong>sarcina</strong>, <strong>sursa de energie</strong>, <strong>GND</strong> și <strong>referința de potențial</strong>.
                </p>
                <p>
                    Înțelegerea acestor stări ale circuitului este esențială pentru diagnosticul hardware. Când un tehnician testează continuitatea cu multimetrul, verifică exact dacă circuitul este închis. Când detectează un scurtcircuit pe un rail de alimentare, știe că undeva pe PCB o cale nedorită conectează două noduri care nu ar trebui să fie legate.
                </p>
"@

"lectia-1-4.html" = @"
                <p>
                    Electicitatea din priza de perete care alimentează consola ta nu este identică cu cea care ajunge la procesor. Rețeaua europeană furnizează 230V curent alternativ — o undă sinusoidală care își schimbă sensul de 100 de ori pe secundă. Dar SoC-ul din PlayStation 5 funcționează pe curent continuu stabil, la tensiuni sub 1.5V. Înțelegerea diferenței dintre AC și DC, și a modului în care se face conversia, este cheia care leagă priza de perete de fiecare frame randat pe ecran.
                </p>
                <p>
                    Această lecție acoperă <strong>curentul continuu (DC)</strong> — regimul stabil necesar circuitelor logice, <strong>curentul alternativ (AC)</strong> — regimul eficient pentru transportul energiei, <strong>frecvența</strong> și <strong>valoarea RMS</strong> — parametrii care definesc comportamentul AC, precum și <strong>conversia AC → DC</strong> — procesul critic realizat de sursa de alimentare.
                </p>
                <p>
                    Când un inginer spune că PSU-ul convertește „230V AC în 12V DC", fiecare cuvânt are o semnificație fizică precisă. După această lecție, vei înțelege exact ce se întâmplă în interiorul sursei de alimentare și de ce circuitele logice nu pot funcționa fără curent continuu stabil.
                </p>
"@

"lectia-1-5.html" = @"
                <p>
                    Pe placa de bază a unui Nintendo Switch, unele componente sunt conectate una după alta pe același traseu — în serie. Altele sunt conectate în paralel, fiecare cu propria cale către sursă. Modul în care componentele sunt aranjate schimbă complet distribuția curentului și a tensiunii. Un condensator greșit plasat în serie în loc de paralel poate transforma un circuit funcțional într-un eșec complet.
                </p>
                <p>
                    Această lecție acoperă <strong>circuitele în serie</strong> — unde curentul este identic prin toate componentele, <strong>circuitele în paralel</strong> — unde tensiunea este identică pe toate ramurile, <strong>distribuția tensiunii</strong> în serie și <strong>distribuția curentului</strong> în paralel, precum și regulile de calcul al rezistenței echivalente.
                </p>
                <p>
                    Aceste principii nu sunt abstracte — ele determină cum VRM-urile distribuie puterea către SoC, cum condensatoarele de decuplare sunt conectate în paralel pe fiecare rail, și cum rezistoarele pull-up/pull-down controlează nivelurile logice. Fiecare decizie de design pe un PCB de consolă se reduce la serie vs. paralel.
                </p>
"@

"lectia-1-6.html" = @"
                <p>
                    Până acum am analizat componente izolate și circuite simple. Dar în realitatea unui PCB de consolă, componentele sunt conectate în combinații complexe de <strong>serie</strong> și <strong>paralel</strong> — și modul în care le combini schimbă complet comportamentul electric al circuitului.
                </p>
                <p>
                    Această lecție pune față în față cele două tipuri fundamentale de conexiuni: serie (componente pe aceeași cale, curentul trece prin toate) și paralel (componente pe căi separate, tensiunea este aceeași). Vom analiza cum se comportă <strong>rezistența totală</strong>, <strong>curentul</strong> și <strong>tensiunea</strong> în fiecare configurație, și cum aceste diferențe afectează direct proiectarea circuitelor din consolele moderne.
                </p>
                <p>
                    De ce contează? Într-o consolă, condensatoarele de decuplare sunt în paralel (pentru redundanță), rezistoarele de feedback în serie (pentru precizie), iar VRM-urile folosesc ambele configurații simultan. Înțelegerea serie vs. paralel nu este opțională — este limba pe care o vorbesc schemele electrice.
                </p>
"@

"lectia-2-1.html" = @"
                <p>
                    Deschide imaginea unui PCB de PlayStation 5 și numără componentele mici, dreptunghiulare, distribuite peste tot pe placă. Cele mai multe dintre ele sunt rezistoare — componente pasive care controlează cât curent ajunge la fiecare parte a circuitului. Fără ele, tensiunile ar fi neregulate, semnalele ar fi instabile, și procesorul s-ar supraîncălzi în secunde.
                </p>
                <p>
                    Această lecție acoperă <strong>tipurile de rezistoare</strong> (SMD, through-hole, film de carbon, film metalic), <strong>toleranța</strong> (precizia valorii nominale), <strong>codul culorilor</strong> (identificarea vizuală a valorii) și <strong>aplicațiile practice pe PCB</strong> — de la divizoare de tensiune la rezistoare de pull-up și terminarea liniilor de transmisie.
                </p>
                <p>
                    Rezistorul este cea mai simplă componentă electronică, dar și cea mai omniprezentă. Pe o singură placă de consolă există sute de rezistoare, fiecare cu un rol precis. Înțelegerea lor este primul pas în citirea unei scheme electrice și în diagnosticarea unui circuit defect.
                </p>
"@

"lectia-2-2.html" = @"
                <p>
                    Când PSU-ul unui PlayStation 5 convertește 230V AC în 12V DC, rezultatul nu este un curent perfect stabil — sunt pulsații reziduale (ripple). Condensatoarele sunt cele care „netezesc" aceste oscilații, stocând energie în momentele de vârf și eliberând-o în goluri. Fără condensatoarele de filtrare de pe placa de bază, SoC-ul ar primi o tensiune instabilă care ar corupe datele la fiecare ciclu de ceas.
                </p>
                <p>
                    Această lecție acoperă <strong>capacitatea electrică</strong> (proprietatea de a stoca sarcină), <strong>stocarea de energie</strong> în câmpul electric, <strong>filtrarea</strong> semnalelor nedorite și <strong>smoothing-ul</strong> — procesul de nivelare a tensiunii pulsatorii în curent continuu stabil.
                </p>
                <p>
                    Condensatoarele sunt a doua cea mai frecventă componentă pe un PCB de consolă, după rezistoare. De la condensatoarele electrolitice masive din PSU până la cele ceramice microscopice lângă pinii SoC-ului, fiecare servește un scop critic: stabilitatea electrică care face posibilă procesarea digitală.
                </p>
"@

"lectia-2-3.html" = @"
                <p>
                    În interiorul fiecărei surse de alimentare de consolă, curentul alternativ din priză trebuie transformat în curent continuu. Prima componentă care face această conversie posibilă este dioda — un dispozitiv semiconductor care permite curentului să treacă într-o singură direcție. Patru diode aranjate într-o punte de redresare transformă unda sinusoidală AC într-un flux unidirecțional — primul pas critic spre alimentarea stabilă a procesorului.
                </p>
                <p>
                    Această lecție acoperă <strong>joncțiunea PN</strong> (mecanismul fizic din spatele diodei), <strong>redresarea</strong> (conversia AC în flux unidirecțional) și <strong>protecția de polaritate</strong> — circuitele care previn distrugerea componentelor când tensiunea este aplicată invers.
                </p>
                <p>
                    Diodele sunt prezente peste tot în consolele moderne: în PSU pentru redresare, pe placa de bază pentru protecție, în circuitele LED pentru indicatoare de stare, și în detectoarele fotonice din unitatea optică. Înțelegerea comportamentului lor — tensiunea de prag, curentul maxim, polarizare directă vs. inversă — este esențială pentru diagnosticul hardware.
                </p>
"@

"lectia-2-4.html" = @"
                <p>
                    Fiecare operație pe care o execută procesorul unui PlayStation 5 — de la calculul fizicii unui joc la decodarea unui stream video — se reduce la miliarde de tranzistori care comută între „pornit" și „oprit" de miliarde de ori pe secundă. Tranzistorul este componenta care a făcut posibilă era digitală: un comutator electronic fără părți mobile, controlat prin tensiune sau curent, capabil să comute în nanosecunde.
                </p>
                <p>
                    Această lecție acoperă cele două familii principale de tranzistori: <strong>BJT</strong> (Bipolar Junction Transistor) — controlat prin curent, folosit în circuitele analogice și de putere, și <strong>MOSFET</strong> (Metal-Oxide-Semiconductor FET) — controlat prin tensiune, baza tuturor procesoarelor moderne. Vom analiza principiul de <strong>comutare</strong> care transformă un tranzistor dintr-un amplificator analog într-un switch digital.
                </p>
                <p>
                    SoC-ul din PS5 conține ~16 miliarde de tranzistori MOSFET, fiecare cu dimensiuni de 7 nanometri. VRM-urile folosesc MOSFET-uri de putere care comută zeci de amperi. Înțelegerea tranzistorului — de la fizica joncțiunii la comportamentul în circuit — este cheia care deblochează toată electronica digitală.
                </p>
"@

"lectia-2-5.html" = @"
                <p>
                    SoC-ul din PlayStation 5 funcționează la ~1.05V, memoria GDDR6 la ~1.35V, controllerele I/O la ~3.3V — dar sursa de alimentare furnizează un singur rail principal de 12V. Cine face conversia? Regulatoarele de tensiune — circuite specializate care „coboară" tensiunea cu precizie de milivolți, asigurând că fiecare componentă primește exact ce are nevoie.
                </p>
                <p>
                    Această lecție acoperă <strong>LDO</strong> (Low-Dropout Regulator) — regulatorul liniar simplu dar ineficient, <strong>VRM</strong> (Voltage Regulator Module) — regulatorul de comutație multi-fază folosit de procesoarele moderne, și principiile de <strong>stabilizare a tensiunii</strong> care garantează toleranțe de ±3% pe rail-urile critice.
                </p>
                <p>
                    Regulatoarele de tensiune sunt componentele cele mai solicitate termic de pe placa de bază — ele convertesc diferențe mari de tensiune în căldură (LDO) sau comută la frecvențe înalte pentru eficiență (VRM). Când un VRM cedează, procesorul primește tensiune greșită și consola se oprește. Diagnosticul VRM-urilor este una dintre cele mai frecvente operații în repararea consolelor.
                </p>
"@

"lectia-2-6.html" = @"
                <p>
                    Sursa de alimentare din interiorul unui PlayStation 5 nu este un transformator simplu — este un SMPS (Switched-Mode Power Supply), un circuit sofisticat care convertește 230V AC în 12V DC cu o eficiență de peste 87%. Față de un transformator clasic de aceeași putere, un SMPS este de 5-10 ori mai mic și mai ușor. Aproape fiecare dispozitiv electronic modern, de la încărcătorul telefonului la PSU-ul consolei, folosește această tehnologie.
                </p>
                <p>
                    Această lecție acoperă principiile <strong>surselor în comutație</strong>: <strong>redresarea</strong> inițială a AC, <strong>filtrarea</strong> prin condensatoare, <strong>conversia DC-DC</strong> la frecvență înaltă și factorii care determină <strong>eficiența</strong> energetică — parametrul care dictează cât de mult din energia din priză ajunge la procesor vs. cât se pierde ca și căldură.
                </p>
                <p>
                    PSU-ul ADP-400DR din PS5 (fabricat de Delta Electronics) procesează până la 350W cu pierderi sub 13%. Înțelegerea modului în care funcționează un SMPS este esențială nu doar pentru diagnosticul consolelor, ci pentru înțelegerea oricărui sistem electronic modern.
                </p>
"@

"lectia-3-1.html" = @"
                <p>
                    Tot ce face un procesor de consolă — calculul fizicii, renderizarea graficii, decodarea audio — se reduce la operații pe numere binare: secvențe de 0 și 1. Un singur „0" sau „1" este un bit — cea mai mică unitate de informație din universul digital. SoC-ul din Xbox Series X procesează date în blocuri de 64 de biți, cu miliarde de operații pe secundă. Dar ce este, fizic, un bit?
                </p>
                <p>
                    Această lecție acoperă <strong>reprezentarea binară</strong> (cum numerele și textul devin secvențe de 0 și 1), <strong>codificarea</strong> informației, structura unui <strong>bit</strong> (realizat fizic prin tensiuni pe un tranzistor) și a unui <strong>byte</strong> (grupul de 8 biți care formează unitatea standard de date).
                </p>
                <p>
                    Fără sistemul binar, nu ar exista procesoare, memorie sau stocare digitală. Fiecare byte din memoria GDDR6 a consolei, fiecare sector de pe SSD, fiecare instrucțiune executată de CPU este o secvență de biți. Această lecție construiește puntea dintre electronica fizică (tranzistori, tensiuni) și informatica abstractă (date, instrucțiuni).
                </p>
"@

"lectia-3-2.html" = @"
                <p>
                    Cum face un procesor adunări, comparații sau decizii logice? Nu prin magie — prin porți logice: circuite elementare construite din tranzistori care implementează operații booleene. O poartă AND verifică dacă AMBELE intrări sunt 1. O poartă OR verifică dacă CEL PUȚIN una este 1. O poartă NOT inversează valoarea. Din combinații de aceste porți simple se construiesc sumatoare, multiplicatoare, unități de control — într-un cuvânt, procesorul întreg.
                </p>
                <p>
                    Această lecție acoperă porțile logice fundamentale: <strong>AND</strong>, <strong>OR</strong>, <strong>NOT</strong>, <strong>NAND</strong> și <strong>NOR</strong> — incluzând tabelele de adevăr, implementarea cu tranzistori MOSFET și rolul fiecărei porți în circuitele digitale reale.
                </p>
                <p>
                    NAND-ul este considerat „poarta universală" — din NAND-uri se pot construi toate celelalte porți logice. Memoria flash din SSD-ul consolei poartă chiar numele acestei porți (NAND flash). Înțelegerea porților logice este trecerea de la electronică la informatică: de la „curent trece / nu trece" la „0 și 1".
                </p>
"@

"lectia-3-3.html" = @"
                <p>
                    Porțile logice procesează date, dar nu le pot reține — output-ul dispare imediat ce input-ul se schimbă. Pentru a „memora" un bit, avem nevoie de un circuit care își păstrează starea: flip-flop-ul. Fiecare registru din procesorul unui PlayStation 5, fiecare celulă din memoria cache L1 — toate se bazează pe acest principiu: un circuit bistabil care stochează un 0 sau un 1 până când este comandat explicit să se schimbe.
                </p>
                <p>
                    Această lecție acoperă <strong>memoria digitală</strong> la nivel elementar: <strong>latch-ul</strong> (circuit sensibil la nivel), <strong>flip-flop-ul</strong> (circuit sensibil la front, sincronizat cu ceasul), <strong>bistabilele</strong> (SR, D, JK, T) și <strong>registrele</strong> — grupuri de flip-flop-uri care stochează cuvinte de date.
                </p>
                <p>
                    Procesorul din Xbox Series X conține milioane de flip-flop-uri organizate în registre de 64 de biți. Fiecare ciclu de ceas, aceste registre captează, stochează și transmit date către unitățile de calcul. Fără flip-flop-uri, procesorul ar fi incapabil să mențină starea — nu ar putea executa nici măcar o singură instrucțiune.
                </p>
"@

"lectia-3-4.html" = @"
                <p>
                    Într-un procesor, miliarde de tranzistori comută simultan — dar cum se sincronizează? Răspunsul este semnalul de ceas: o undă dreptunghiulară care oscilează la o frecvență fixă, dictând ritmul întregului sistem. Când spunem că CPU-ul din PS5 rulează la 3.5 GHz, înseamnă 3.5 miliarde de cicluri de ceas pe secundă — 3.5 miliarde de momente în care flip-flop-urile captează date noi și logica combinațională produce rezultate.
                </p>
                <p>
                    Această lecție acoperă <strong>semnalul de ceas</strong> (clock) — generarea, distribuția și caracteristicile sale, <strong>sincronizarea</strong> circuitelor digitale (de ce toată logica trebuie să danseze pe același ritm) și <strong>timing-ul</strong> — constrângerile temporale care determină frecvența maximă la care un procesor poate funcționa stabil.
                </p>
                <p>
                    Frecvența ceasului este, în esență, viteza procesorului. Dar nu orice frecvență este posibilă — propagarea semnalelor prin porți logice și fire de interconectare introduce întârzieri care limitează cât de rapid poate bate ceasul. Înțelegerea ceasului digital explică de ce „mai mulți GHz" nu înseamnă automat „mai rapid" și de ce arhitectura contează la fel de mult ca frecvența.
                </p>
"@

"lectia-3-5.html" = @"
                <p>
                    Cum ajunge un procesor de la porți logice individuale la execuția unor instrucțiuni complexe precum „adună două numere" sau „scrie un pixel în framebuffer"? Răspunsul stă în arhitectura internă: o combinație de unități aritmetico-logice (ALU), registre, unități de control și un pipeline care permite execuția înlănțuită a instrucțiunilor. Fiecare procesor din istoria consolelor — de la MOS 6502 din Atari la AMD Zen 2 din PS5 — urmează aceleași principii fundamentale.
                </p>
                <p>
                    Această lecție acoperă construcția logică a unui procesor: <strong>ALU</strong> (unitatea care execută operații aritmetice și logice), <strong>registrele</strong> (memoria ultra-rapidă din interiorul CPU-ului) și <strong>pipeline-ul</strong> (tehnica de suprapunere a etapelor de execuție pentru a maximiza throughput-ul).
                </p>
                <p>
                    Procesorul Zen 2 din PS5 are un pipeline de ~19 etape și poate procesa multiple instrucțiuni simultan pe fiecare nucleu. Înțelegerea acestei arhitecturi explică de ce performanța nu depinde doar de frecvență, ci și de lățimea pipeline-ului, predicția ramificărilor și eficiența cache-ului.
                </p>
"@

"lectia-4-1.html" = @"
                <p>
                    CPU-ul este creierul consolei — componenta care decodează și execută fiecare instrucțiune, de la logica jocului la gestionarea input-ului controlerului. Procesorul AMD Zen 2 din PlayStation 5 execută miliarde de operații pe secundă, orchestrând tot ce se întâmplă în sistem: IA adversarilor, fizica obiectelor, audio posițional, networking. Cum reușește un singur chip să facă toate acestea simultan?
                </p>
                <p>
                    Această lecție acoperă arhitectura modernă a CPU-ului: <strong>execuția instrucțiunilor</strong> (fetch, decode, execute, commit), <strong>pipeline-ul</strong> (suprapunerea etapelor pentru performanță maximă) și <strong>cache-ul</strong> (ierarhia de memorie ultra-rapidă care previne bottleneck-ul memoriei principale).
                </p>
                <p>
                    CPU-ul din PS5 are 8 nuclee, fiecare cu propriul cache L1 (32KB instrucțiuni + 32KB date), un cache L2 partajat și acces la 16GB GDDR6 prin memory controller. Fiecare nivel de cache adaugă latență dar și capacitate. Înțelegerea acestei ierarhii explică de ce jocurile bine optimizate rulează fluid, iar cele slab optimizate suferă de stuttering.
                </p>
"@

"lectia-4-2.html" = @"
                <p>
                    Fiecare cadru (frame) pe care îl vezi pe ecran când joci pe o consolă este rezultatul muncii GPU-ului: mii de obiecte 3D sunt transformate în pixeli colorați în mai puțin de 16 milisecunde (pentru 60 FPS). GPU-ul dintr-un PlayStation 5 procesează geometria scenei, aplică texturi, calculează iluminarea, execută shaderele și produce imaginea finală — totul în paralel, pe 36 de unități de calcul care lucrează simultan.
                </p>
                <p>
                    Această lecție acoperă cele trei etape principale ale procesorului grafic: <strong>geometria</strong> (transformarea vertecșilor din spațiu 3D în spațiu ecran), <strong>rasterizarea</strong> (conversia triunghiurilor în fragmente/pixeli) și <strong>shading-ul</strong> (calculul culorii finale a fiecărui pixel, inclusiv iluminare, umbre și efecte speciale).
                </p>
                <p>
                    GPU-ul RDNA 2 din PS5 atinge 10.28 TFLOPS — adică poate executa ~10 trilioane de operații cu virgulă mobilă pe secundă. Ray tracing-ul hardware adaugă o nouă dimensiune: simularea fizic corectă a luminii. Înțelegerea pipeline-ului grafic explică ce se întâmplă între momentul în care jocul definește o scenă 3D și momentul în care pixelii apar pe ecran.
                </p>
"@

"lectia-4-3.html" = @"
                <p>
                    Procesorul unui PlayStation 5 poate executa instrucțiuni în sub-nanosecunde, dar dacă trebuie să aștepte datele din memoria principală, pierde sute de cicluri de ceas pe fiecare acces. Soluția? O ierarhie de memorii din ce în ce mai rapide și mai mici: registre (acces instant), cache L1 (1-2 cicluri), cache L2 (10+ cicluri), cache L3, și abia apoi RAM-ul GDDR6. Fiecare nivel compensează un compromis fundamental: viteza vs. capacitatea.
                </p>
                <p>
                    Această lecție acoperă <strong>ierarhia memoriei</strong> (de la registrele CPU până la stocare), <strong>latența</strong> (timpul de acces la fiecare nivel) și <strong>bandwidth-ul</strong> (cantitatea de date transferată pe secundă) — cei trei parametri care determină cât de rapid poate un procesor să acceseze informația de care are nevoie.
                </p>
                <p>
                    PS5 dispune de 16GB GDDR6 cu bandwidth de 448 GB/s, partajată între CPU și GPU. Cache miss-urile — momentele când datele nu sunt în cache și trebuie aduse din RAM — sunt principalul bottleneck al performanței moderne. Înțelegerea ierarhiei memoriei explică de ce jocurile optimizate pentru console pot atinge performanțe pe care PC-urile cu hardware similar nu le ating.
                </p>
"@

"lectia-4-4.html" = @"
                <p>
                    CPU-ul, GPU-ul, memoria și stocarea unui PlayStation 5 sunt componente separate care trebuie să comunice între ele la viteze enorme. Canalele care fac posibilă această comunicare se numesc bus-uri — magistrale de date care transportă informație între componentele sistemului. PCIe conectează SSD-ul la procesor, memory bus-ul leagă RAM-ul de controller, iar bus-urile I/O gestionează controllerele, rețeaua și perifericele.
                </p>
                <p>
                    Această lecție acoperă principalele tipuri de interconectări din consolele moderne: <strong>PCIe</strong> (interfața de mare viteză pentru SSD și periferice), <strong>memory bus</strong> (legătura directă cu RAM-ul) și <strong>I/O</strong> (canalele pentru USB, Ethernet, Bluetooth, HDMI).
                </p>
                <p>
                    SSD-ul custom din PS5 comunică prin 4 lane-uri PCIe 4.0 la 5.5 GB/s — o viteză care a eliminat practic ecranele de încărcare. Memory bus-ul de 256-bit al GDDR6 furnizează 448 GB/s de bandwidth. Fiecare bus din sistem are un rol precis, și lățimea de bandă a fiecăruia influențează direct performanța pe care o simți în joc.
                </p>
"@

"lectia-4-5.html" = @"
                <p>
                    Jocurile moderne ocupă 50-100 GB, texturile sunt comprimate la calitate 4K, iar save-urile se acumulează. Toată această informație trebuie stocată permanent — chiar și când consola este oprită. De la hard disk-urile mecanice care echipau PS3 și Xbox 360, la SSD-urile NVMe ultra-rapide din PS5 și Xbox Series X, evoluția stocării a transformat radical experiența de joc, eliminând timpii de încărcare și permițând streaming direct de pe disc.
                </p>
                <p>
                    Această lecție acoperă cele trei generații de stocare din istoria consolelor: <strong>HDD</strong> (hard disk — stocare mecanică magnetică), <strong>SSD</strong> (solid-state drive — stocare pe cipuri flash) și <strong>NVMe</strong> (protocolul optimizat pentru SSD-uri PCIe care atinge viteze de GB/s).
                </p>
                <p>
                    Trecerea de la HDD la NVMe SSD în a noua generație de console nu a fost doar o îmbunătățire de viteză — a schimbat fundamental modul în care jocurile sunt proiectate. Dezvoltatorii pot acum să streameze texturi direct de pe SSD, eliminând necesitatea de a duplica date în memorie. SSD-ul custom din PS5 (5.5 GB/s) este de ~100 ori mai rapid decât HDD-ul din PS4.
                </p>
"@

"lectia-4-6.html" = @"
                <p>
                    CPU, GPU, RAM, SSD, VRM, bus-uri — toate componentele studiate în lecțiile anterioare nu funcționează izolat. Într-o consolă modernă, ele formează un sistem integrat în care fiecare parte depinde de celelalte. Performanța finală — framerate-ul, timpul de încărcare, stabilitatea — este dictată de componenta cea mai lentă din lanț, de echilibrul între subsisteme și de eficiența comunicării între ele.
                </p>
                <p>
                    Această lecție recapitulează și integrează toate elementele într-o <strong>ierarhie completă a sistemului</strong>: de la <strong>CPU</strong> (execuția instrucțiunilor) la <strong>GPU</strong> (renderizarea graficii), de la <strong>RAM</strong> (memoria de lucru) la <strong>Storage</strong> (stocarea permanentă), incluzând <strong>I/O</strong> și interconectările care le leagă.
                </p>
                <p>
                    Scopul acestei lecții este viziunea de ansamblu: cum colaborează componentele pentru a transforma un joc din cod sursă în experiență vizuală la 60 FPS. ISA (Instruction Set Architecture) definește interfața între software și hardware, iar modul în care datele circulă între nivelurile ierarhiei determină performanța percepută de jucător.
                </p>
"@

"lectia-5-1.html" = @"
                <p>
                    Toate componentele unei console — SoC, memorie, VRM-uri, conectori — sunt montate pe o singură placă de bază (PCB). Acest substrat nu este doar un suport fizic: este o rețea complexă de trasee de cupru, planuri de masă și planuri de alimentare distribuite pe 8+ straturi, fiecare cu un rol precis. Un traseu greșit dimensionat, o impedanță incorectă sau o via defectă pot cauza instabilitate, artefacte grafice sau oprirea completă a consolei.
                </p>
                <p>
                    Această lecție acoperă anatomia unui <strong>PCB</strong>: <strong>straturile</strong> (layers) unei placi de bază moderne, <strong>traseele electrice</strong> (traces) care transportă semnale și putere, <strong>ground plane</strong> (planul de masă care oferă referința 0V) și <strong>distribuția alimentării pe PCB</strong>.
                </p>
                <p>
                    Placa de bază a unui PlayStation 5 are peste 8 straturi. Fiecare strat de semnal transportă date digitale, fiecare plan de masă oferă o cale de întoarcere cu impedanță minimă, iar fiecare plan de alimentare distribuie tensiune uniformă. Materialele și geometria traseelor sunt alese pentru a minimiza pierderea de semnal, crosstalk-ul și rezonanțele — inginerie directă la nivel de micrometri.
                </p>
"@

"lectia-5-2.html" = @"
                <p>
                    În consolele anterioare, CPU-ul și GPU-ul erau cipuri separate pe placa de bază, comunicând prin bus-uri externe. Începând cu generația PS4/Xbox One, cele două procesoare au fost integrate într-un singur chip: APU (Accelerated Processing Unit). Acest design reduce latența, consumul de energie și costul de fabricație — iar în PS5 și Xbox Series X, APU-ul integrează nu doar CPU și GPU, ci și controllere de memorie, interfețe I/O și unități specializate.
                </p>
                <p>
                    Această lecție acoperă conceptul de <strong>APU</strong> (procesor unificat CPU + GPU), <strong>integrarea CPU și GPU</strong> pe același die de siliciu, și <strong>comunicarea cu memoria</strong> — modul în care CPU-ul și GPU-ul partajează eficient aceiași 16 GB de GDDR6.
                </p>
                <p>
                    APU-ul din PS5 este fabricat de AMD pe proces TSMC de 7nm și conține ~16 miliarde de tranzistori. Înțelegerea modului în care CPU și GPU coexistă fizic pe același chip explică compromisurile de putere, frecvență și layout care definesc performanța consolelor moderne — și de ce un APU de consolă nu este simpla sumă a unui CPU și unui GPU separați.
                </p>
"@

"lectia-5-3.html" = @"
                <p>
                    Sursa de alimentare furnizează 12V, dar SoC-ul din PlayStation 5 funcționează la ~1.05V cu un curent de până la 76A. Cine face această conversie critică? VRM-ul (Voltage Regulator Module) — un set de circuite de pe placa de bază format din MOSFET-uri de putere, inductori și condensatoare, organizate în faze multiple care comută alternativ la frecvențe de sute de kHz pentru a furniza o tensiune stabilă cu toleranțe de milivolți.
                </p>
                <p>
                    Această lecție acoperă <strong>VRM-ul</strong> în detaliu: <strong>conversia tensiunii</strong> (de la 12V la sub-volt), <strong>fazele VRM</strong> (cum mai multe faze se alternează pentru stabilitate și distribuția căldurii), <strong>MOSFET-urile</strong> de putere (comutatoarele care fac conversia), <strong>inductorii</strong> (care stochează energie magnetic) și <strong>condensatoarele</strong> (care filtrează ripple-ul).
                </p>
                <p>
                    VRM-ul este una dintre cele mai solicitate zone de pe placa de bază — procesează puteri de ~80W într-un spațiu de câțiva centimetri pătrați. Defectarea unui singur MOSFET sau condensator poate opri întreaga consolă. Diagnosticarea VRM-urilor cu multimetrul este una dintre cele mai frecvente proceduri de reparare hardware.
                </p>
"@

"lectia-5-4.html" = @"
                <p>
                    Un PlayStation 5 disipă ~100W de căldură în funcționare continuă. Fără un sistem de răcire eficient, temperatura SoC-ului ar depăși 100°C în câteva secunde, activând throttling-ul termic și, în cazuri extreme, provocând daune permanente. Sistemul de răcire al PS5 folosește un vapor chamber (cameră de vaporizare) cu o suprafață de contact egală cu cea a chipului, conectat la un radiator masiv evacuat de un ventilator centrifugal.
                </p>
                <p>
                    Această lecție acoperă principiile <strong>disipării căldurii</strong> în consolele moderne: <strong>heat sink</strong> (radiatorul pasiv care absoarbe și distribuie căldura), <strong>heat pipe</strong> (conductorul termic bazat pe schimbare de fază), <strong>ventilatoarele</strong> (convecția forțată care evacuează aerul cald) și pasta termică / pad-urile termice care asigură contactul între chip și radiator.
                </p>
                <p>
                    Proiectarea termică a unei console este un exercițiu de inginerie la limită: putere maximă într-un spațiu minim, la un nivel de zgomot acceptabil. Pasta termică care se usucă, un ventilator blocat sau praful acumulat pe radiator sunt cele mai frecvente cauze de supraîncălzire și throttling — diagnosticul termic este fundamental în mentenanța consolelor.
                </p>
"@

"lectia-5-5.html" = @"
                <p>
                    PSU-ul unui PlayStation 5 produce un singur rail principal de 12V DC. Dar componentele interne au nevoie de tensiuni foarte diferite: ~1.05V pentru SoC, ~1.35V pentru GDDR6, ~3.3V pentru controllere I/O, ~5V pentru USB. Distribuția acestor tensiuni pe placa de bază se face prin „rail-uri de alimentare" — trasee dedicate de cupru, fiecare cu propria reglare prin VRM-uri, fiecare cu propriile condensatoare de filtrare.
                </p>
                <p>
                    Această lecție acoperă conceptul de <strong>power rail</strong> (linie de alimentare dedicată), <strong>distribuția tensiunii</strong> pe PCB (cum 12V devine multiple tensiuni pe placa de bază) și <strong>alimentarea componentelor</strong> — cum fiecare subsistem primește exact tensiunea de care are nevoie.
                </p>
                <p>
                    Când un tehnician diagnostichează o consolă care nu pornește, primul lucru pe care îl verifică sunt rail-urile de alimentare: are fiecare rail tensiunea corectă? Există un scurtcircuit pe vreunul? Aceste verificări cu multimetrul sunt imposibile fără înțelegerea arhitecturii de alimentare a consolei.
                </p>
"@

"lectia-6-1.html" = @"
                <p>
                    Când apeși butonul de pornire pe un PlayStation 5, nu se întâmplă un singur lucru — se declanșează o secvență precisă de evenimente care durează câteva secunde: mai întâi se activează standby-ul, apoi PSU-ul furnizează 12V, VRM-urile generează tensiunile secundare, SoC-ul primește semnalul de reset, firmware-ul POST verifică hardware-ul, și abia apoi apare logo-ul pe ecran. Dacă oricare pas eșuează, secvența se oprește.
                </p>
                <p>
                    Această lecție acoperă <strong>secvența de pornire</strong> (power sequence) — ordinea exactă în care se activează circuitele, <strong>inițializarea hardware</strong> (POST — Power-On Self-Test) și <strong>semnalele de pornire</strong> care controlează fiecare etapă.
                </p>
                <p>
                    Înțelegerea secvenței de pornire este esențială pentru diagnostic: dacă o consolă nu pornește, simptomele (LED-uri, sunete, comportamentul ventilatorului) indică exact în ce etapă a secvenței s-a oprit. Un tehnician experimentat poate localiza defectul doar observând cât de departe ajunge consola în secvența de boot.
                </p>
"@

"lectia-6-2.html" = @"
                <p>
                    Chiar și când nu joci, consola ta nu este complet oprită — este în modul standby. PlayStation 5 consumă ~1.5W în rest mode, menținând active circuitele care monitorizează butonul de pornire, descarcă actualizări în fundal, încarcă controllerele prin USB și procesează comenzi de la distanță. Un întreg subsistem de alimentare rămâne activ, furnizând tensiuni de standby (5V_SB, 3.3V_SB) chiar și când SoC-ul și GPU-ul sunt complet oprite.
                </p>
                <p>
                    Această lecție acoperă <strong>modul standby</strong> (ce rămâne activ când consola este „oprită"), <strong>consumul redus</strong> (cum se minimizează puterea fără a pierde funcționalitatea) și <strong>circuitele active în standby</strong> — componentele care mențin consola în stare de veghe.
                </p>
                <p>
                    Diagnosticul standby-ului este critic: dacă o consolă nu pornește deloc (niciun LED, niciun sunet), problema este adesea pe circuitul de standby — PSU-ul nu furnizează tensiunea de veghe, sau southbridge-ul nu răspunde la butonul de pornire. Înțelegerea a ce funcționează în standby ajută la izolarea rapidă a defectului.
                </p>
"@

"lectia-6-3.html" = @"
                <p>
                    „Consola nu pornește" — este cel mai comun simptom raportat în repararea hardware. Dar „no power" nu înseamnă un singur defect; poate fi o sursă de alimentare defectă, un scurtcircuit pe un rail, un MOSFET ars în VRM, o lipitură rece pe conectorul de alimentare, sau chiar un cablu de curent defect. Diagnosticul sistematic transformă un simptom vag într-o cauză precisă.
                </p>
                <p>
                    Această lecție acoperă <strong>cauzele posibile</strong> ale lipsei de alimentare (de la cele evidente la cele ascunse), <strong>verificarea alimentării</strong> cu multimetrul (testarea rail-urilor, continuitatea, scurtcircuite) și <strong>diagnosticul hardware</strong> pas cu pas — o metodologie care elimină cauzele una câte una.
                </p>
                <p>
                    Primul pas este întotdeauna cel mai simplu: verifici cablul, verifici priza, verifici fusibilul. Apoi avansezi: măsori tensiunea de standby, verifici dacă PSU-ul produce 12V sub sarcină, testezi rail-urile secundare. Această abordare metodică — de la simplu la complex — este fundația diagnosticului profesional de console.
                </p>
"@

"lectia-6-4.html" = @"
                <p>
                    Consola pornește, dar se oprește după câteva minute. Sau pornește, dar imaginea are artefacte. Sau jocul merge bine 30 de minute, apoi freeze. Aceste simptome intermitente sunt adesea mai dificil de diagnosticat decât un „no power" complet, deoarece cauza nu este o componentă complet defectă, ci una care funcționează marginal — un VRM care produce tensiune instabilă, un condensator degradat, sau un SoC care se supraîncălzește.
                </p>
                <p>
                    Această lecție acoperă <strong>fluctuațiile de tensiune</strong> (ripple excesiv, droops sub sarcină), <strong>problemele VRM</strong> (faze defecte, MOSFET-uri cu rezistență crescută) și <strong>supraîncălzirea</strong> — trei cauze majore de instabilitate care pot fi diagnosticate cu multimetrul, osciloscopul, sau o cameră termică.
                </p>
                <p>
                    Instabilitatea de sistem este zona unde diagnosticul devine artă: simptomele se manifestă doar sub sarcină, la anumite temperaturi, sau după un anumit timp de funcționare. Tehnicianul trebuie să reproducă condițiile exacte ale defectului și să măsoare parametrii electrici în timp real pentru a identifica componenta marginală.
                </p>
"@

"lectia-6-5.html" = @"
                <p>
                    Ce se întâmplă când curentul depășește limita de siguranță? Când tensiunea crește peste pragul maxim? Când temperatura atinge un nivel periculos? PSU-urile și VRM-urile consolelor moderne au protecții hardware integrate care opresc alimentarea în microsecunde — salvând componentele de distrugere. Aceste circuite de protecție sunt ultima linie de apărare între un defect și o placă de bază arsă.
                </p>
                <p>
                    Această lecție acoperă cele patru protecții electrice fundamentale: <strong>OCP</strong> (Over-Current Protection — limitarea curentului), <strong>OVP</strong> (Over-Voltage Protection — limitarea tensiunii), <strong>OTP</strong> (Over-Temperature Protection — oprirea la supraîncălzire) și <strong>SCP</strong> (Short-Circuit Protection — deconectarea la scurtcircuit), plus semnalul <strong>Power Good</strong> care confirmă că toate tensiunile sunt stabile.
                </p>
                <p>
                    Când o consolă „pornește și se oprește imediat" (pulsează), cauza este adesea o protecție electrică activată: PSU-ul detectează un scurtcircuit sau o suprasarcină și se oprește. Înțelegerea protecțiilor ajută tehnicianul să interpreteze corect acest simptom și să identifice care protecție s-a activat și de ce.
                </p>
"@

"lectia-7-1.html" = @"
                <p>
                    Fiecare cadru afișat pe ecranul consolei tale parcurge un traseu precis prin GPU: mai întâi scenea 3D este definită prin vertecși și triunghiuri, apoi geometria este transformată și proiectată pe ecranul 2D, triunghiurile sunt convertite în fragmente (pixeli), fiecare fragment primește o culoare calculată prin shadere, și în final imaginea completă este scrisă în framebuffer. Acest proces — pipeline-ul grafic — se repetă de 30, 60 sau 120 de ori pe secundă.
                </p>
                <p>
                    Această lecție acoperă <strong>etapele pipeline-ului grafic</strong> de la scenă la pixel: <strong>procesarea geometriei</strong> (vertex shading, transformări, clipping), <strong>rasterizarea</strong> (conversia primitivelor în fragmente) și <strong>shading-ul</strong> (calculul culorii finale, iluminare, texturare).
                </p>
                <p>
                    GPU-ul RDNA 2 din PS5 procesează acest pipeline complet în sub-16ms pentru 60 FPS. Ray tracing-ul hardware adaugă o etapă suplimentară: trasarea razelor de lumină prin scenă pentru reflexii, umbre și iluminare globală fizic corecte. Înțelegerea pipeline-ului grafic explică direct de ce anumite scene sunt mai „grele" decât altele și ce compromisuri fac dezvoltatorii.
                </p>
"@

"lectia-7-2.html" = @"
                <p>
                    De ce un joc rulează la 60 FPS într-o scenă și scade la 30 FPS în alta? Răspunsul depinde de cine este „gâtul de sticlă": CPU-ul sau GPU-ul. Dacă procesorul nu poate calcula logica jocului suficient de rapid, GPU-ul așteaptă fără lucru — jocul este CPU-bound. Dacă GPU-ul nu poate randa scena la timp, CPU-ul termină devreme și așteaptă — jocul este GPU-bound. Identificarea bottleneck-ului este primul pas în optimizare.
                </p>
                <p>
                    Această lecție acoperă conceptul de <strong>limitare a performanței</strong>: <strong>rolul CPU-ului</strong> (logica jocului, IA, fizică, draw calls) vs. <strong>rolul GPU-ului</strong> (geometrie, rasterizare, shading, post-processing) și cum se determină care componentă este factorul limitativ într-un scenariu dat.
                </p>
                <p>
                    În consolele cu hardware fix, dezvoltatorii trebuie să echilibreze sarcina între CPU și GPU pentru a menține framerate-ul constant. Un joc cu multă fizică și IA complexă (ex: orașe populate) tinde să fie CPU-bound. Un joc cu grafică ultra-detaliată dar logică simplă tinde să fie GPU-bound. Înțelegerea acestui echilibru este fundamentul optimizării pentru console.
                </p>
"@

"lectia-7-3.html" = @"
                <p>
                    TDP-ul (Thermal Design Power) unui procesor nu este puterea maximă pe care o consumă — este puterea termică pe care sistemul de răcire trebuie să o disipeze în funcționare susținută. SoC-ul din PlayStation 5 are un TDP de ~200W, ceea ce înseamnă că sistemul de răcire al consolei trebuie să evacueze echivalentul a două becuri de 100W continuu, într-un spațiu de câțiva centimetri cubi, la un nivel de zgomot acceptabil.
                </p>
                <p>
                    Această lecție acoperă <strong>TDP</strong> (ce reprezintă și ce nu), <strong>disiparea căldurii</strong> (cum energia electrică se transformă ireversibil în căldură prin efectul Joule) și <strong>temperatura de funcționare</strong> — pragurile termice dincolo de care procesorul reduce frecvența (throttling) sau se oprește complet (thermal shutdown).
                </p>
                <p>
                    Temperatura joncțiunii (T<sub>j</sub>) unui SoC modern nu ar trebui să depășească ~100°C. Între temperatura ambientală (~25°C) și acest prag, fiecare grad câștigat prin răcire eficientă se traduce în frecvențe mai stabile și performanță mai consistentă. Managementul termic nu este doar protecție — este optimizare directă a performanței.
                </p>
"@

"lectia-7-4.html" = @"
                <p>
                    Ai observat vreodată că un joc rulează fluid la început, dar după 30 de minute de gameplay intens framerate-ul scade? Motivul se numește thermal throttling: când temperatura SoC-ului depășește un prag critic, procesorul reduce automat frecvența pentru a genera mai puțină căldură. Performanța scade, dar chipul supraviețuiește. Este un mecanism de protecție care sacrifică viteza pentru longevitate.
                </p>
                <p>
                    Această lecție acoperă <strong>thermal throttling</strong> (reducerea automată a performanței la supraîncălzire), <strong>reducerea frecvenței</strong> (cum procesorul coboară MHz-ii în pași pentru a reduce puterea disipată) și <strong>protecția termică</strong> — mecanismul care previne deteriorarea permanentă a semiconductoarelor.
                </p>
                <p>
                    Relația este directă: puterea disipată crește cu frecvența și cu pătratul tensiunii (P ∝ f × V²). Când procesorul reduce frecvența cu 10%, puterea scade semnificativ. Consolele moderne folosesc algoritmi de frecvență variabilă (ex: SmartShift la AMD) care redistribuie bugetul de putere dinamic între CPU și GPU, maximizând performanța în limita termică disponibilă.
                </p>
"@

"lectia-7-5.html" = @"
                <p>
                    Un GPU cu 10 TFLOPS de putere de calcul este inutil dacă nu primește datele suficient de repede. Bandwidth-ul — cantitatea de date transferată pe secundă între memorie și procesor — este adesea factorul care determină performanța reală a unui sistem grafic. PlayStation 5 oferă 448 GB/s de bandwidth prin GDDR6, iar Xbox Series X atinge 560 GB/s — numere care definesc câte texturi, vertecși și framebuffer-uri pot fi procesate pe secundă.
                </p>
                <p>
                    Această lecție acoperă <strong>bandwidth-ul</strong> (capacitatea de transfer a bus-ului de memorie), <strong>latența</strong> (timpul de acces la fiecare cerere individuală) și <strong>influența acestora asupra performanței</strong> — de ce un GPU cu bandwidth insuficient nu poate atinge rezoluția sau framerate-ul nominal.
                </p>
                <p>
                    Bandwidth-ul este produsul dintre lățimea bus-ului (biți) și frecvența memoriei. PS5: 256-bit × frecvență GDDR6 = 448 GB/s. Xbox Series X: 320-bit = 560 GB/s. Aceste numere nu sunt doar specificații de marketing — ele determină direct câte date poate GPU-ul consuma pe secundă și, implicit, calitatea vizuală pe care o poate susține în timp real.
                </p>
"@

"lectia-8-1.html" = @"
                <p>
                    Când o consolă ajunge pe masa de lucru cu simptomul „nu pornește" sau „se oprește singură", un tehnician fără metodologie va înlocui componente la întâmplare, sperând să nimerească defectul. Un tehnician cu metodologie va urma un proces sistematic: reproduce problema, observă simptomele, formulează ipoteze, testează fiecare ipoteză cu instrumente, și izolează cauza reală înainte de a atinge ciocanul de lipit.
                </p>
                <p>
                    Această lecție acoperă <strong>pașii diagnosticului hardware</strong> — metodologia completă de la simptom la reparație — și <strong>analiza simptomelor</strong> — cum se interpretează indiciile pe care consola le oferă (LED-uri, sunete, comportamentul ventilatorului, mesaje de eroare) pentru a localiza defectul.
                </p>
                <p>
                    Diagnosticul hardware nu este ghicire — este inginerie inversă. Fiecare simptom are o cauză fizică, fiecare cauză poate fi verificată cu un instrument (multimetru, osciloscop, cameră termică), și fiecare verificare reduce lista de suspecți. Această lecție stabilește cadrul metodologic pe care îl vom aplica în toate studiile de caz următoare.
                </p>
"@

"lectia-8-2.html" = @"
                <p>
                    Multimetrul este instrumentul de bază al oricărui tehnician de console — un dispozitiv portabil care poate măsura tensiune, rezistență, continuitate, și uneori capacitate, frecvență sau temperatură. Cu un multimetru de 30€ și cunoștințele potrivite, poți diagnostica 90% din defectele hardware ale unei console: verifici dacă PSU-ul produce tensiune, dacă un traseu este continuu, dacă un condensator este în scurtcircuit.
                </p>
                <p>
                    Această lecție acoperă utilizarea practică a multimetrului pentru diagnostic: <strong>măsurarea tensiunii</strong> (DC și AC, pe rail-urile consolei), <strong>măsurarea rezistenței</strong> (identificarea componentelor defecte) și <strong>măsurarea continuității</strong> (verificarea integrității traseelor și detectarea circuitelor deschise).
                </p>
                <p>
                    Fiecare funcție a multimetrului răspunde la o întrebare specifică: „Este tensiune pe acest rail?" (voltmetru), „Este intact acest traseu?" (continuitate), „Este acest condensator în scurtcircuit?" (ohmmetru). Învățarea utilizării eficiente a multimetrului transformă diagnosticul din ghicire în măsurare.
                </p>
"@

"lectia-8-3.html" = @"
                <p>
                    Un scurtcircuit pe un rail de alimentare este una dintre cele mai comune și mai periculoase defecte hardware. Când două puncte care ar trebui să fie la tensiuni diferite sunt conectate accidental (prin contamiare cu lichid, componentă defectă, sau degradare a izolației), curentul crește necontrolat, protecțiile PSU-ului se activează, și consola refuză să pornească. Detectarea și localizarea scurtcircuitului pe un PCB cu mii de componente este o abilitate fundamentală în reparare.
                </p>
                <p>
                    Această lecție acoperă <strong>identificarea scurtcircuitelor</strong> (cum recunoști prezența unui scurtcircuit pe un rail) și <strong>metodele de testare</strong> — de la măsurarea rezistenței cu multimetrul la injectarea de curent controlat și urmărirea termică a traseului defect.
                </p>
                <p>
                    Tehnica clasică: setezi multimetrul pe modul diodă/beep, pui sondele pe rail-ul suspect și GND. Dacă citirea este sub 0.4V (sau beep continuu), ai un scurtcircuit. Localizarea: injectezi curent mic și folosești o cameră termică sau alcool izopropilic pentru a vedea care componentă se încălzește — acolo este sursa scurtcircuitului.
                </p>
"@

"lectia-8-4.html" = @"
                <p>
                    Istoria consolelor este marcată de defecte hardware care au definit generații întregi: Red Ring of Death pe Xbox 360 (lipitură fără plumb care cedează termic), Yellow Light of Death pe PS3 (eșecul BGA-urilor sub stres termic), Blue Light of Death pe PS4 (probleme HDMI sau APU). Aceste „studii de caz" reale demonstrează cum principiile din lecțiile anterioare — tensiune, temperatură, lipitură, protecții — converg într-un singur punct de eșec.
                </p>
                <p>
                    Această lecție analizează cele mai cunoscute defecte hardware din istoria consolelor: <strong>YLOD</strong> (Yellow Light of Death — PS3), <strong>RROD</strong> (Red Ring of Death — Xbox 360) și <strong>BLOD</strong> (Blue Light of Death — PS4) — cauzele reale, diagnosticul și soluțiile de reparare.
                </p>
                <p>
                    Fiecare dintre aceste defecte celebre are o cauză fizică precisă care poate fi explicată prin conceptele studiate în acest curs: stres termic, lipitură fragilă, design termic inadecvat, feedback pozitiv între temperatură și rezistență. Analiza lor transformă teoria în practică și demonstrează de ce fundamentele contează în diagnosticul real.
                </p>
"@

"lectia-8-5.html" = @"
                <p>
                    O consolă care „nu pornește" poate avea o sursă defectă, un scurtcircuit, un MOSFET ars, sau pur și simplu un cablu de curent defect. O consolă cu „artefacte grafice" poate avea un GPU defect, memorie GDDR6 eșuată, o lipitură rece sub BGA, sau o tensiune marginală pe rail-ul GPU-ului. Simptomul este ceea ce vezi; cauza reală este ceea ce trebuie găsit. Confuzia dintre simptom și cauză este cea mai frecventă greșeală în diagnosticul hardware.
                </p>
                <p>
                    Această lecție acoperă relația dintre <strong>simptomele hardware</strong> (ceea ce observi: LED-uri, comportament, mesaje) și <strong>cauzele reale ale defectelor</strong> (ceea ce trebuie reparat: componenta specifică, conexiunea defectă, parametrul electric în afara toleranței).
                </p>
                <p>
                    Un simptom poate avea multiple cauze posibile, iar o cauză poate produce multiple simptome. Diagnosticul eficient înseamnă să nu sari la concluzii pe baza simptomului, ci să testezi sistematic fiecare ipoteză până când cauza reală este confirmată prin măsurare. Această lecție sintetizează tot ce ai învățat și îți oferă cadrul mental pentru a aborda orice defect hardware.
                </p>
"@

}

$count = 0
$pattern = '(?s)(<section[^>]*id="introducere"[^>]*>.*?<div class="card"[^>]*>)(.*?)(</div>\s*</div>\s*</section>)'

foreach ($entry in $intros.GetEnumerator()) {
    $filePath = Join-Path $basePath $entry.Key
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $($entry.Key) not found"
        continue
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $match = [regex]::Match($content, $pattern)
    
    if ($match.Success) {
        $newContent = $match.Groups[1].Value + "`n" + $entry.Value + "`n            " + $match.Groups[3].Value
        $content = $content.Substring(0, $match.Index) + $newContent + $content.Substring($match.Index + $match.Length)
        Set-Content $filePath $content -NoNewline -Encoding UTF8
        $count++
        Write-Host "OK: $($entry.Key)"
    } else {
        Write-Host "FAIL: $($entry.Key) - pattern not matched"
    }
}

Write-Host "`nTotal updated: $count / $($intros.Count)"
