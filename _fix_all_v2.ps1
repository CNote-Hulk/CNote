# Fix diacritics (HTML entities -> UTF-8) and replace intro sections
# Using here-strings to avoid PowerShell quoting issues with Unicode
$basePath = "c:\Users\andre\OneDrive\Documentos\Proiecte HTML\Atestat Info\src\html\pages\curs"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$data = @{}

$data["lectia-1-2.html"] = @'
Imaginează-ți circuitul de alimentare al unui PlayStation 5: curentul pleacă din PSU, parcurge trasee de cupru, ajunge la SoC și se întoarce prin planul de masă. Dar ce pune electronii în mișcare? Ce determină câți electroni trec pe secundă? Și cum controlăm acest flux? Răspunsurile se află în trei mărimi fundamentale — tensiune, curent și rezistență — și în relația matematică care le leagă: Legea lui Ohm.
|||
Această lecție acoperă bazele circuitelor electrice: <strong>tensiunea electrică</strong> (forța motrice care pune electronii în mișcare), <strong>curentul electric</strong> (fluxul de sarcini), <strong>rezistența</strong> (opoziția controlată la curgerea curentului), <strong>Legea lui Ohm</strong>, <strong>puterea electrică</strong> și <strong>triunghiul lui Ohm</strong> — instrumentele pe care orice inginer le folosește zilnic pentru a analiza circuite.
|||
Scopul nu este memorarea formulelor V = I × R sau P = I × V, ci înțelegerea intuitivă a modului în care tensiunea <em>împinge</em>, curentul <em>curge</em> și rezistența <em>controlează</em> — și de ce orice tehnician de console trebuie să gândească în acești termeni când diagnostichează o placă de bază.
'@

$data["lectia-1-3.html"] = @'
Un SoC cu 16 miliarde de tranzistori este inutil fără un traseu complet de la sursă la componentă și înapoi. Fiecare pin de pe chipul unui Xbox Series X face parte dintr-o buclă electrică — un circuit — care trebuie să rămână intact pentru ca datele să circule. Când o lipitură cedează și bucla se rupe, consola se oprește. Când două trasee se ating accidental, curentul explodează. Totul pornește de la un principiu simplu: circuitul electric.
|||
Această lecție acoperă cele trei stări fundamentale ale unui circuit: <strong>circuitul deschis</strong> (întreruperea care oprește curentul), <strong>circuitul închis</strong> (bucla completă necesară funcționării) și <strong>scurtcircuitul</strong> (calea accidentală care distruge componente) — plus noțiunile de <strong>conductor</strong>, <strong>sarcină</strong>, <strong>sursă de energie</strong>, <strong>GND</strong> și <strong>referință de potențial</strong>.
|||
Scopul nu este memorarea definițiilor, ci înțelegerea <em>de ce</em> un circuit deschis oprește consola, <em>de ce</em> un scurtcircuit activează protecțiile PSU-ului și <em>ce verifică</em> un tehnician când testează continuitatea cu multimetrul. Fiecare diagnostic hardware începe cu o întrebare simplă: circuitul este închis sau nu?
'@

$data["lectia-1-4.html"] = @'
Electricitatea din priza de perete care alimentează consola ta nu este identică cu cea care ajunge la procesor. Rețeaua europeană furnizează 230V curent alternativ — o undă sinusoidală care își schimbă sensul de 100 de ori pe secundă. Dar SoC-ul din PlayStation 5 funcționează pe curent continuu stabil, la tensiuni sub 1.5V. Înțelegerea diferenței dintre AC și DC, și a modului în care se face conversia, este cheia care leagă priza de perete de fiecare frame randat pe ecran.
|||
Această lecție acoperă cele două regimuri fundamentale ale curentului electric: <strong>curentul continuu (DC)</strong> — regimul stabil necesar circuitelor logice, <strong>curentul alternativ (AC)</strong> — regimul eficient pentru transportul energiei, <strong>frecvența</strong> și <strong>valoarea RMS</strong> — parametrii care definesc comportamentul AC, precum și <strong>conversia AC → DC</strong> — procesul critic realizat de sursa de alimentare.
|||
Scopul nu este memorarea faptului că Europa folosește 230V AC, ci înțelegerea <em>de ce</em> rețeaua electrică folosește AC pentru transport, <em>de ce</em> circuitele logice au nevoie de DC și <em>ce se întâmplă</em> fizic în interiorul sursei de alimentare când convertește un regim în celălalt.
'@

$data["lectia-1-5.html"] = @'
Pe placa de bază a unui Nintendo Switch, unele componente sunt conectate una după alta pe același traseu — în serie. Altele sunt conectate în paralel, fiecare cu propria cale către sursă. Modul în care componentele sunt aranjate schimbă complet distribuția curentului și a tensiunii. Un condensator greșit plasat în serie în loc de paralel poate transforma un circuit funcțional într-un eșec total.
|||
Această lecție acoperă cele două configurații fundamentale de circuit: <strong>circuitele în serie</strong> — unde curentul este identic prin toate componentele, și <strong>circuitele în paralel</strong> — unde tensiunea este identică pe toate ramurile. Vom analiza <strong>distribuția tensiunii</strong> în serie, <strong>distribuția curentului</strong> în paralel și regulile de calcul al <strong>rezistenței echivalente</strong> în fiecare configurație.
|||
Scopul nu este memorarea formulelor de rezistență echivalentă, ci înțelegerea <em>de ce</em> condensatoarele de decuplare sunt conectate în paralel pe fiecare rail, <em>de ce</em> rezistoarele de feedback sunt în serie și <em>cum</em> fiecare decizie de design pe un PCB de consolă se reduce la serie vs. paralel.
'@

$data["lectia-1-6.html"] = @'
Până acum am analizat componente izolate și circuite simple. Dar în realitatea unui PCB de consolă, componentele sunt conectate în combinații complexe de serie și paralel — iar modul în care le combini schimbă complet comportamentul electric al circuitului. Un VRM folosește ambele configurații simultan: MOSFET-uri în serie cu inductori, condensatoare în paralel pentru filtrare.
|||
Această lecție pune față în față cele două tipuri fundamentale de conexiuni: <strong>serie</strong> (componente pe aceeași cale, curentul trece prin toate) și <strong>paralel</strong> (componente pe căi separate, tensiunea este aceeași). Vom analiza cum se comportă <strong>rezistența totală</strong>, <strong>curentul</strong> și <strong>tensiunea</strong> în fiecare configurație, și cum aceste diferențe afectează direct proiectarea circuitelor din consolele moderne.
|||
Scopul nu este lista de diferențe serie vs. paralel, ci înțelegerea <em>de ce</em> condensatoarele de decuplare sunt în paralel (pentru redundanță), <em>de ce</em> rezistoarele de feedback sunt în serie (pentru precizie) și <em>de ce</em> schemele electrice ale consolelor nu se pot citi fără stăpânirea ambelor configurații.
'@

$data["lectia-2-1.html"] = @'
Deschide imaginea unui PCB de PlayStation 5 și numără componentele mici, dreptunghiulare, distribuite peste tot pe placă. Cele mai multe dintre ele sunt rezistoare — componente pasive care controlează cât curent ajunge la fiecare parte a circuitului. Fără ele, tensiunile ar fi neregulate, semnalele ar fi instabile, și procesorul s-ar supraîncălzi în secunde.
|||
Această lecție acoperă componenta electronică cea mai omniprezentă: <strong>tipurile de rezistoare</strong> (SMD, through-hole, film de carbon, film metalic), <strong>toleranța</strong> (precizia valorii nominale), <strong>codul culorilor</strong> (identificarea vizuală a valorii) și <strong>aplicațiile practice pe PCB</strong> — de la divizoare de tensiune la rezistoare de pull-up și terminarea liniilor de transmisie.
|||
Scopul nu este memorarea codului de culori, ci înțelegerea <em>de ce</em> fiecare rezistor de pe o placă de consolă are o valoare specifică, <em>ce rol</em> joacă în circuit și <em>cum</em> identifici un rezistor defect pe un PCB real. Pe o singură placă de consolă există sute de rezistoare, fiecare cu un scop precis.
'@

$data["lectia-2-2.html"] = @'
Când PSU-ul unui PlayStation 5 convertește 230V AC în 12V DC, rezultatul nu este un curent perfect stabil — sunt pulsații reziduale (ripple). Condensatoarele sunt cele care netezesc aceste oscilații, stocând energie în momentele de vârf și eliberând-o în goluri. Fără condensatoarele de filtrare de pe placa de bază, SoC-ul ar primi o tensiune instabilă care ar corupe datele la fiecare ciclu de ceas.
|||
Această lecție acoperă a doua cea mai frecventă componentă de pe un PCB de consolă: <strong>capacitatea electrică</strong> (proprietatea de a stoca sarcină electrică), <strong>stocarea de energie</strong> în câmpul electric, <strong>filtrarea</strong> semnalelor nedorite și <strong>smoothing-ul</strong> — procesul de nivelare a tensiunii pulsatorii în curent continuu stabil.
|||
Scopul nu este memorarea formulei C = Q/V, ci înțelegerea <em>de ce</em> condensatoarele electrolitice masive din PSU filtrează ripple-ul, <em>de ce</em> condensatoarele ceramice microscopice lângă pinii SoC-ului stabilizează tensiunea și <em>ce se întâmplă</em> când un condensator cedează pe un rail de alimentare.
'@

$data["lectia-2-3.html"] = @'
În interiorul fiecărei surse de alimentare de consolă, curentul alternativ din priză trebuie transformat în curent continuu. Prima componentă care face această conversie posibilă este dioda — un dispozitiv semiconductor care permite curentului să treacă într-o singură direcție. Patru diode aranjate într-o punte de redresare transformă unda sinusoidală AC într-un flux unidirecțional — primul pas critic spre alimentarea stabilă a procesorului.
|||
Această lecție acoperă componenta care face posibilă conversia AC → DC: <strong>joncțiunea PN</strong> (mecanismul fizic din spatele diodei), <strong>redresarea</strong> (conversia AC în flux unidirecțional) și <strong>protecția de polaritate</strong> — circuitele care previn distrugerea componentelor când tensiunea este aplicată invers.
|||
Scopul nu este memorarea caracteristicii I-V a diodei, ci înțelegerea <em>de ce</em> PSU-ul folosește diode pentru redresare, <em>de ce</em> există diode de protecție pe placa de bază și <em>cum</em> identifici o diodă defectă cu multimetrul în modul diodă.
'@

$data["lectia-2-4.html"] = @'
Fiecare operație pe care o execută procesorul unui PlayStation 5 — de la calculul fizicii unui joc la decodarea unui stream video — se reduce la miliarde de tranzistori care comută între starea de pornit și oprit de miliarde de ori pe secundă. Tranzistorul este componenta care a făcut posibilă era digitală: un comutator electronic fără părți mobile, controlat prin tensiune sau curent, capabil să comute în nanosecunde.
|||
Această lecție acoperă cele două familii principale de tranzistori: <strong>BJT</strong> (Bipolar Junction Transistor) — controlat prin curent, folosit în circuitele analogice și de putere, și <strong>MOSFET</strong> (Metal-Oxide-Semiconductor FET) — controlat prin tensiune, baza tuturor procesoarelor moderne. Vom analiza principiul de <strong>comutare</strong> care transformă un tranzistor dintr-un amplificator analog într-un switch digital.
|||
Scopul nu este memorarea configurațiilor CE sau CS, ci înțelegerea <em>de ce</em> SoC-ul din PS5 conține ~16 miliarde de tranzistori MOSFET, <em>de ce</em> VRM-urile folosesc MOSFET-uri de putere și <em>cum</em> fizica joncțiunii determină tot ce face un procesor modern.
'@

$data["lectia-2-5.html"] = @'
SoC-ul din PlayStation 5 funcționează la ~1.05V, memoria GDDR6 la ~1.35V, controllerele I/O la ~3.3V — dar sursa de alimentare furnizează un singur rail principal de 12V. Cine face conversia? Regulatoarele de tensiune — circuite specializate care coboară tensiunea cu precizie de milivolți, asigurând că fiecare componentă primește exact ce are nevoie.
|||
Această lecție acoperă cele două tipuri principale de regulatoare: <strong>LDO</strong> (Low-Dropout Regulator) — regulatorul liniar simplu dar ineficient, <strong>VRM</strong> (Voltage Regulator Module) — regulatorul de comutație multi-fază folosit de procesoarele moderne, și principiile de <strong>stabilizare a tensiunii</strong> care garantează toleranțe de ±3% pe rail-urile critice.
|||
Scopul nu este memorarea schemei unui LDO, ci înțelegerea <em>de ce</em> VRM-ul are nevoie de mai multe faze, <em>de ce</em> eficiența contează când convertești 12V în 1V la 76A și <em>ce se întâmplă</em> când un VRM cedează — unul dintre cele mai frecvente defecte în repararea consolelor.
'@

$data["lectia-2-6.html"] = @'
Sursa de alimentare din interiorul unui PlayStation 5 nu este un transformator simplu — este un SMPS (Switched-Mode Power Supply), un circuit sofisticat care convertește 230V AC în 12V DC cu o eficiență de peste 87%. Față de un transformator clasic de aceeași putere, un SMPS este de 5-10 ori mai mic și mai ușor. Aproape fiecare dispozitiv electronic modern, de la încărcătorul telefonului la PSU-ul consolei, folosește această tehnologie.
|||
Această lecție acoperă principiile surselor în comutație: <strong>redresarea</strong> inițială a AC, <strong>filtrarea</strong> prin condensatoare, <strong>conversia DC-DC</strong> la frecvență înaltă și factorii care determină <strong>eficiența</strong> energetică — parametrul care dictează cât din energia din priză ajunge la procesor vs. cât se pierde ca și căldură.
|||
Scopul nu este memorarea topologiei flyback sau forward, ci înțelegerea <em>de ce</em> PSU-ul ADP-400DR din PS5 poate procesa 350W într-o carcasă compactă, <em>de ce</em> eficiența de 87%+ contează termic și <em>ce se întâmplă</em> în fiecare etapă a conversiei de la priză la procesor.
'@

$data["lectia-3-1.html"] = @'
Tot ce face un procesor de consolă — calculul fizicii, renderizarea graficii, decodarea audio — se reduce la operații pe numere binare: secvențe de 0 și 1. Un bit — fie 0, fie 1 — este cea mai mică unitate de informație din universul digital. SoC-ul din Xbox Series X procesează date în blocuri de 64 de biți, cu miliarde de operații pe secundă. Dar ce este, fizic, un bit?
|||
Această lecție acoperă fundamentul informaticii: <strong>reprezentarea binară</strong> (cum numerele și textul devin secvențe de 0 și 1), <strong>codificarea</strong> informației, structura unui <strong>bit</strong> (realizat fizic prin tensiuni pe un tranzistor) și a unui <strong>byte</strong> (grupul de 8 biți care formează unitatea standard de date).
|||
Scopul nu este memorarea conversiilor binar-zecimal, ci înțelegerea <em>de ce</em> procesoarele operează exclusiv în binar, <em>cum</em> un tranzistor comutând între 0V și 1V devine un bit de informație și <em>de ce</em> fiecare byte din memoria GDDR6 a consolei este o secvență de exact 8 biți.
'@

$data["lectia-3-2.html"] = @'
Cum face un procesor adunări, comparații sau decizii logice? Nu prin magie — ci prin porți logice: circuite elementare construite din tranzistori care implementează operații booleene. O poartă AND verifică dacă AMBELE intrări sunt 1. O poartă OR verifică dacă CEL PUȚIN una este 1. O poartă NOT inversează valoarea. Din combinații de aceste porți simple se construiesc sumatoare, multiplicatoare, unități de control — într-un cuvânt, procesorul întreg.
|||
Această lecție acoperă porțile logice fundamentale: <strong>AND</strong>, <strong>OR</strong>, <strong>NOT</strong>, <strong>NAND</strong> și <strong>NOR</strong> — incluzând tabelele de adevăr, implementarea cu tranzistori MOSFET și rolul fiecărei porți în circuitele digitale reale.
|||
Scopul nu este memorarea tabelelor de adevăr, ci înțelegerea <em>de ce</em> NAND-ul este considerat poarta universală, <em>de ce</em> memoria flash din SSD-ul consolei poartă numele acestei porți și <em>cum</em> din combinații de porți simple se construiește orice circuit digital — de la un sumator la un procesor complet.
'@

$data["lectia-3-3.html"] = @'
Porțile logice procesează date, dar nu le pot reține — output-ul dispare imediat ce input-ul se schimbă. Pentru a stoca un bit permanent, avem nevoie de un circuit care își păstrează starea: flip-flop-ul. Fiecare registru din procesorul unui PlayStation 5 și fiecare celulă din memoria cache L1 se bazează pe acest principiu: un circuit bistabil care stochează un 0 sau un 1 până când este comandat explicit să se schimbe.
|||
Această lecție acoperă memoria digitală la nivel elementar: <strong>latch-ul</strong> (circuit sensibil la nivel), <strong>flip-flop-ul</strong> (circuit sensibil la front, sincronizat cu ceasul), <strong>bistabilele</strong> (SR, D, JK, T) și <strong>registrele</strong> — grupuri de flip-flop-uri care stochează cuvinte de date.
|||
Scopul nu este memorarea schemei unui flip-flop D, ci înțelegerea <em>de ce</em> procesorul din Xbox Series X conține milioane de flip-flop-uri organizate în registre de 64 de biți, <em>cum</em> aceste registre captează date la fiecare ciclu de ceas și <em>de ce</em> fără ele procesorul ar fi incapabil să mențină starea.
'@

$data["lectia-3-4.html"] = @'
Într-un procesor, miliarde de tranzistori comută simultan — dar cum se sincronizează? Răspunsul este semnalul de ceas: o undă dreptunghiulară care oscilează la o frecvență fixă, dictând ritmul întregului sistem. Când spunem că CPU-ul din PS5 rulează la 3.5 GHz, înseamnă 3.5 miliarde de cicluri de ceas pe secundă — 3.5 miliarde de momente în care flip-flop-urile captează date noi și logica combinațională produce rezultate.
|||
Această lecție acoperă mecanismul care sincronizează toată logica digitală: <strong>semnalul de ceas</strong> (clock) — generarea, distribuția și caracteristicile sale, <strong>sincronizarea</strong> circuitelor digitale și <strong>timing-ul</strong> — constrângerile temporale care determină frecvența maximă la care un procesor poate funcționa stabil.
|||
Scopul nu este memorarea frecvențelor diferitelor procesoare, ci înțelegerea <em>de ce</em> mai mulți GHz nu înseamnă automat mai rapid, <em>de ce</em> arhitectura contează la fel de mult ca frecvența și <em>ce determină</em> fizic limita superioară la care poate bate ceasul unui procesor.
'@

$data["lectia-3-5.html"] = @'
Cum ajunge un procesor de la porți logice individuale la execuția unor instrucțiuni complexe precum adunarea a două numere sau scrierea unui pixel în framebuffer? Răspunsul stă în arhitectura internă: o combinație de unități aritmetico-logice (ALU), registre, unități de control și un pipeline care permite execuția înlănțuită a instrucțiunilor. Fiecare procesor din istoria consolelor — de la MOS 6502 din Atari la AMD Zen 2 din PS5 — urmează aceleași principii fundamentale.
|||
Această lecție acoperă construcția logică a unui procesor: <strong>ALU</strong> (unitatea care execută operații aritmetice și logice), <strong>registrele</strong> (memoria ultra-rapidă din interiorul CPU-ului) și <strong>pipeline-ul</strong> (tehnica de suprapunere a etapelor de execuție pentru a maximiza throughput-ul).
|||
Scopul nu este memorarea numărului de etape dintr-un pipeline, ci înțelegerea <em>de ce</em> procesorul Zen 2 din PS5 poate procesa multiple instrucțiuni simultan, <em>cum</em> ALU-ul transformă porți logice în operații utile și <em>de ce</em> performanța depinde de lățimea pipeline-ului și predicția ramificărilor, nu doar de frecvență.
'@

$data["lectia-4-1.html"] = @'
CPU-ul este creierul consolei — componenta care decodează și execută fiecare instrucțiune, de la logica jocului la gestionarea input-ului controlerului. Procesorul AMD Zen 2 din PlayStation 5 execută miliarde de operații pe secundă, orchestrând tot ce se întâmplă în sistem: IA adversarilor, fizica obiectelor, audio posițional, networking. Cum reușește un singur chip să facă toate acestea simultan?
|||
Această lecție acoperă arhitectura modernă a CPU-ului: <strong>execuția instrucțiunilor</strong> (fetch, decode, execute, commit), <strong>pipeline-ul</strong> (suprapunerea etapelor pentru performanță maximă) și <strong>cache-ul</strong> (ierarhia de memorie ultra-rapidă care previne bottleneck-ul memoriei principale).
|||
Scopul nu este memorarea dimensiunilor cache-ului, ci înțelegerea <em>de ce</em> CPU-ul din PS5 are 8 nuclee cu câte 32KB cache L1, <em>cum</em> pipeline-ul permite execuția suprapusă a instrucțiunilor și <em>de ce</em> jocurile bine optimizate rulează fluid, iar cele slab optimizate suferă de stuttering.
'@

$data["lectia-4-2.html"] = @'
Fiecare cadru pe care îl vezi pe ecran când joci pe o consolă este rezultatul muncii GPU-ului: mii de obiecte 3D sunt transformate în pixeli colorați în mai puțin de 16 milisecunde (pentru 60 FPS). GPU-ul dintr-un PlayStation 5 procesează geometria scenei, aplică texturi, calculează iluminarea, execută shaderele și produce imaginea finală — totul în paralel, pe 36 de unități de calcul care lucrează simultan.
|||
Această lecție acoperă cele trei etape principale ale procesorului grafic: <strong>geometria</strong> (transformarea vertecșilor din spațiu 3D în spațiu ecran), <strong>rasterizarea</strong> (conversia triunghiurilor în fragmente/pixeli) și <strong>shading-ul</strong> (calculul culorii finale a fiecărui pixel, inclusiv iluminare, umbre și efecte speciale).
|||
Scopul nu este memorarea numărului de TFLOPS, ci înțelegerea <em>ce se întâmplă</em> între momentul în care jocul definește o scenă 3D și momentul în care pixelii apar pe ecran, <em>de ce</em> GPU-ul RDNA 2 din PS5 atinge 10.28 TFLOPS și <em>cum</em> ray tracing-ul hardware simulează fizic corect lumina.
'@

$data["lectia-4-3.html"] = @'
Procesorul unui PlayStation 5 poate executa instrucțiuni în sub-nanosecunde, dar dacă trebuie să aștepte datele din memoria principală, pierde sute de cicluri de ceas pe fiecare acces. Soluția? O ierarhie de memorii din ce în ce mai rapide și mai mici: registre (acces instant), cache L1 (1-2 cicluri), cache L2 (10+ cicluri), cache L3, și abia apoi RAM-ul GDDR6. Fiecare nivel compensează un compromis fundamental: viteza vs. capacitatea.
|||
Această lecție acoperă <strong>ierarhia memoriei</strong> (de la registrele CPU până la stocare), <strong>latența</strong> (timpul de acces la fiecare nivel) și <strong>bandwidth-ul</strong> (cantitatea de date transferată pe secundă) — cei trei parametri care determină cât de rapid poate un procesor să acceseze informația de care are nevoie.
|||
Scopul nu este memorarea latenței fiecărui nivel de cache, ci înțelegerea <em>de ce</em> PS5 partajează 16GB GDDR6 între CPU și GPU, <em>ce sunt</em> cache miss-urile care cauzează bottleneck-uri și <em>de ce</em> jocurile optimizate pentru console pot atinge performanțe pe care PC-urile cu hardware similar nu le ating.
'@

$data["lectia-4-4.html"] = @'
CPU-ul, GPU-ul, memoria și stocarea unui PlayStation 5 sunt componente separate care trebuie să comunice între ele la viteze enorme. Canalele care fac posibilă această comunicare se numesc bus-uri — magistrale de date care transportă informație între componentele sistemului. PCIe conectează SSD-ul la procesor, memory bus-ul leagă RAM-ul de controller, iar bus-urile I/O gestionează controllerele, rețeaua și perifericele.
|||
Această lecție acoperă principalele tipuri de interconectări din consolele moderne: <strong>PCIe</strong> (interfața de mare viteză pentru SSD și periferice), <strong>memory bus</strong> (legătura directă cu RAM-ul) și <strong>I/O</strong> (canalele pentru USB, Ethernet, Bluetooth, HDMI).
|||
Scopul nu este memorarea specificațiilor PCIe, ci înțelegerea <em>de ce</em> SSD-ul din PS5 comunică la 5.5 GB/s prin PCIe 4.0, <em>de ce</em> memory bus-ul de 256-bit furnizează 448 GB/s de bandwidth și <em>cum</em> fiecare bus din sistem influențează direct performanța pe care o simți în joc.
'@

$data["lectia-4-5.html"] = @'
Jocurile moderne ocupă 50-100 GB, texturile sunt comprimate la calitate 4K, iar save-urile se acumulează. Toată această informație trebuie stocată permanent — chiar și când consola este oprită. De la hard disk-urile mecanice care echipau PS3 și Xbox 360, la SSD-urile NVMe ultra-rapide din PS5 și Xbox Series X, evoluția stocării a transformat radical experiența de joc.
|||
Această lecție acoperă cele trei generații de stocare din istoria consolelor: <strong>HDD</strong> (hard disk — stocare mecanică magnetică), <strong>SSD</strong> (solid-state drive — stocare pe cipuri flash) și <strong>NVMe</strong> (protocolul optimizat pentru SSD-uri PCIe care atinge viteze de GB/s).
|||
Scopul nu este memorarea vitezelor de citire, ci înțelegerea <em>de ce</em> trecerea de la HDD la NVMe SSD a schimbat fundamental modul în care jocurile sunt proiectate, <em>cum</em> dezvoltatorii pot acum să streameze texturi direct de pe SSD și <em>de ce</em> SSD-ul custom din PS5 (5.5 GB/s) este de ~100 ori mai rapid decât HDD-ul din PS4.
'@

$data["lectia-4-6.html"] = @'
CPU, GPU, RAM, SSD, VRM, bus-uri — toate componentele studiate în lecțiile anterioare nu funcționează izolat. Într-o consolă modernă, ele formează un sistem integrat în care fiecare parte depinde de celelalte. Performanța finală — framerate-ul, timpul de încărcare, stabilitatea — este dictată de componenta cea mai lentă din lanț, de echilibrul între subsisteme și de eficiența comunicării între ele.
|||
Această lecție acoperă viziunea de ansamblu: <strong>ierarhia completă a sistemului</strong> de la <strong>CPU</strong> (execuția instrucțiunilor) la <strong>GPU</strong> (renderizarea graficii), de la <strong>RAM</strong> (memoria de lucru) la <strong>Storage</strong> (stocarea permanentă), incluzând <strong>ISA</strong> (Instruction Set Architecture) și interconectările care le leagă.
|||
Scopul nu este recapitularea fiecărei componente, ci înțelegerea <em>cum</em> colaborează pentru a transforma un joc din cod sursă în experiență vizuală la 60 FPS, <em>de ce</em> ISA definește interfața între software și hardware și <em>cum</em> fluxul de date între nivelurile ierarhiei determină performanța percepută de jucător.
'@

$data["lectia-5-1.html"] = @'
Toate componentele unei console — SoC, memorie, VRM-uri, conectori — sunt montate pe o singură placă de bază (PCB). Acest substrat nu este doar un suport fizic: este o rețea complexă de trasee de cupru, planuri de masă și planuri de alimentare distribuite pe 8+ straturi, fiecare cu un rol precis. Un traseu greșit dimensionat, o impedanță incorectă sau o via defectă pot cauza instabilitate, artefacte grafice sau oprirea completă a consolei.
|||
Această lecție acoperă anatomia unui <strong>PCB</strong>: <strong>straturile</strong> (layers) unei placi de bază moderne, <strong>traseele electrice</strong> (traces) care transportă semnale și putere, <strong>ground plane</strong> (planul de masă care oferă referința 0V) și <strong>distribuția alimentării pe PCB</strong>.
|||
Scopul nu este memorarea numărului de straturi, ci înțelegerea <em>de ce</em> placa de bază a PS5 are peste 8 straturi, <em>ce rol</em> joacă fiecare plan de masă și de alimentare și <em>de ce</em> materialele și geometria traseelor sunt alese pentru a minimiza pierderea de semnal, crosstalk-ul și rezonanțele.
'@

$data["lectia-5-2.html"] = @'
În consolele anterioare, CPU-ul și GPU-ul erau cipuri separate pe placa de bază, comunicând prin bus-uri externe. Începând cu generația PS4/Xbox One, cele două procesoare au fost integrate într-un singur chip: APU (Accelerated Processing Unit). Acest design reduce latența, consumul de energie și costul de fabricație — iar în PS5 și Xbox Series X, APU-ul integrează nu doar CPU și GPU, ci și controllere de memorie, interfețe I/O și unități specializate.
|||
Această lecție acoperă conceptul de <strong>APU</strong> (procesor unificat CPU + GPU), <strong>integrarea CPU și GPU</strong> pe același die de siliciu și <strong>comunicarea cu memoria</strong> — modul în care CPU-ul și GPU-ul partajează eficient aceiași 16 GB de GDDR6.
|||
Scopul nu este memorarea specificațiilor APU-ului, ci înțelegerea <em>de ce</em> integrarea CPU + GPU pe același chip reduce latența, <em>cum</em> cele ~16 miliarde de tranzistori coexistă pe un die de 7nm și <em>de ce</em> un APU de consolă nu este simpla sumă a unui CPU și unui GPU separați.
'@

$data["lectia-5-3.html"] = @'
Sursa de alimentare furnizează 12V, dar SoC-ul din PlayStation 5 funcționează la ~1.05V cu un curent de până la 76A. Cine face această conversie critică? VRM-ul (Voltage Regulator Module) — un set de circuite de pe placa de bază format din MOSFET-uri de putere, inductori și condensatoare, organizate în faze multiple care comută alternativ la frecvențe de sute de kHz pentru a furniza o tensiune stabilă cu toleranțe de milivolți.
|||
Această lecție acoperă <strong>VRM-ul</strong> în detaliu: <strong>conversia tensiunii</strong> (de la 12V la sub-volt), <strong>fazele VRM</strong> (cum mai multe faze se alternează pentru stabilitate), <strong>MOSFET-urile</strong> de putere (comutatoarele care fac conversia), <strong>inductorii</strong> (care stochează energie magnetic) și <strong>condensatoarele</strong> (care filtrează ripple-ul).
|||
Scopul nu este memorarea schemei unui buck converter, ci înțelegerea <em>de ce</em> VRM-ul procesează ~80W într-un spațiu de câțiva cm², <em>de ce</em> defectarea unui singur MOSFET oprește întreaga consolă și <em>cum</em> diagnostichezi VRM-urile cu multimetrul — una dintre cele mai frecvente proceduri de reparare.
'@

$data["lectia-5-4.html"] = @'
Un PlayStation 5 disipă ~100W de căldură în funcționare continuă. Fără un sistem de răcire eficient, temperatura SoC-ului ar depăși 100°C în câteva secunde, activând throttling-ul termic și, în cazuri extreme, provocând daune permanente. Sistemul de răcire al PS5 folosește un vapor chamber conectat la un radiator masiv evacuat de un ventilator centrifugal — inginerie termică la limită.
|||
Această lecție acoperă principiile <strong>disipării căldurii</strong> în consolele moderne: <strong>heat sink</strong> (radiatorul pasiv care absoarbe și distribuie căldura), <strong>heat pipe</strong> (conductorul termic bazat pe schimbare de fază), <strong>ventilatoarele</strong> (convecția forțată care evacuează aerul cald) și <strong>pasta termică</strong> / pad-urile termice care asigură contactul între chip și radiator.
|||
Scopul nu este memorarea conductivității termice a cuprului, ci înțelegerea <em>de ce</em> pasta termică uscată cauzează supraîncălzire, <em>de ce</em> praful acumulat pe radiator reduce eficiența și <em>cum</em> diagnosticul termic — cu cameră termică sau prin observarea throttling-ului — este fundamental în mentenanța consolelor.
'@

$data["lectia-5-5.html"] = @'
PSU-ul unui PlayStation 5 produce un singur rail principal de 12V DC. Dar componentele interne au nevoie de tensiuni foarte diferite: ~1.05V pentru SoC, ~1.35V pentru GDDR6, ~3.3V pentru controllere I/O, ~5V pentru USB. Distribuția acestor tensiuni pe placa de bază se face prin rail-uri de alimentare — trasee dedicate de cupru, fiecare cu propria reglare prin VRM-uri, fiecare cu propriile condensatoare de filtrare.
|||
Această lecție acoperă conceptul de <strong>power rail</strong> (linie de alimentare dedicată), <strong>distribuția tensiunii</strong> pe PCB (cum 12V devine multiple tensiuni pe placa de bază) și <strong>alimentarea componentelor</strong> — cum fiecare subsistem primește exact tensiunea de care are nevoie.
|||
Scopul nu este memorarea tensiunii fiecărui rail, ci înțelegerea <em>de ce</em> verificarea rail-urilor cu multimetrul este primul pas în diagnosticul unei console care nu pornește, <em>cum</em> identifici un scurtcircuit pe un rail specific și <em>de ce</em> arhitectura de alimentare este imposibil de diagnosticat fără această cunoaștere.
'@

$data["lectia-6-1.html"] = @'
Când apeși butonul de pornire pe un PlayStation 5, nu se întâmplă un singur lucru — se declanșează o secvență precisă de evenimente care durează câteva secunde: mai întâi se activează standby-ul, apoi PSU-ul furnizează 12V, VRM-urile generează tensiunile secundare, SoC-ul primește semnalul de reset, firmware-ul POST verifică hardware-ul, și abia apoi apare logo-ul pe ecran. Dacă oricare pas eșuează, secvența se oprește.
|||
Această lecție acoperă <strong>secvența de pornire</strong> (power sequence) — ordinea exactă în care se activează circuitele, <strong>inițializarea hardware</strong> (POST — Power-On Self-Test) și <strong>semnalele de pornire</strong> care controlează fiecare etapă a procesului de boot.
|||
Scopul nu este memorarea ordinii semnalelor, ci înțelegerea <em>de ce</em> fiecare etapă depinde de cea anterioară, <em>cum</em> simptomele (LED-uri, sunete, comportamentul ventilatorului) indică exact în ce punct s-a oprit secvența și <em>de ce</em> un tehnician experimentat poate localiza defectul doar observând cât de departe ajunge consola în boot.
'@

$data["lectia-6-2.html"] = @'
Chiar și când nu joci, consola ta nu este complet oprită — este în modul standby. PlayStation 5 consumă ~1.5W în rest mode, menținând active circuitele care monitorizează butonul de pornire, descarcă actualizări în fundal, încarcă controllerele prin USB și procesează comenzi de la distanță. Un întreg subsistem de alimentare rămâne activ, furnizând tensiuni de standby chiar și când SoC-ul și GPU-ul sunt complet oprite.
|||
Această lecție acoperă <strong>modul standby</strong> (ce rămâne activ când consola pare oprită), <strong>consumul redus</strong> (cum se minimizează puterea fără a pierde funcționalitatea) și <strong>circuitele active în standby</strong> — componentele care mențin consola în stare de veghe.
|||
Scopul nu este memorarea consumului în standby, ci înțelegerea <em>de ce</em> o consolă care nu pornește deloc (niciun LED, niciun sunet) are probabil o problemă pe circuitul de standby, <em>ce componente</em> rămân alimentate și <em>cum</em> verifici dacă tensiunile de standby sunt prezente cu multimetrul.
'@

$data["lectia-6-3.html"] = @'
Consola nu pornește — este cel mai comun simptom raportat în repararea hardware. Dar lipsa alimentării nu înseamnă un singur defect; poate fi o sursă de alimentare defectă, un scurtcircuit pe un rail, un MOSFET ars în VRM, o lipitură rece pe conectorul de alimentare, sau chiar un cablu de curent defect. Diagnosticul sistematic transformă un simptom vag într-o cauză precisă.
|||
Această lecție acoperă <strong>cauzele posibile</strong> ale lipsei de alimentare (de la cele evidente la cele ascunse), <strong>verificarea alimentării</strong> cu multimetrul (testarea rail-urilor, continuitatea, scurtcircuite) și <strong>diagnosticul hardware</strong> pas cu pas — o metodologie care elimină cauzele una câte una.
|||
Scopul nu este memorarea unei liste de defecte, ci înțelegerea <em>de ce</em> primul pas este întotdeauna cel mai simplu (cablul, priza, fusibilul), <em>cum</em> avansezi sistematic de la simplu la complex și <em>de ce</em> această abordare metodică este fundația diagnosticului profesional de console.
'@

$data["lectia-6-4.html"] = @'
Consola pornește, dar se oprește după câteva minute. Sau pornește, dar imaginea are artefacte. Sau jocul merge bine 30 de minute, apoi se blochează. Aceste simptome intermitente sunt adesea mai dificil de diagnosticat decât lipsa completă a alimentării, deoarece cauza nu este o componentă complet defectă, ci una care funcționează marginal — un VRM care produce tensiune instabilă, un condensator degradat, sau un SoC care se supraîncălzește.
|||
Această lecție acoperă cele trei cauze majore de instabilitate: <strong>fluctuațiile de tensiune</strong> (ripple excesiv, droops sub sarcină), <strong>problemele VRM</strong> (faze defecte, MOSFET-uri cu rezistență crescută) și <strong>supraîncălzirea</strong> — fenomene care pot fi diagnosticate cu multimetrul, osciloscopul sau o cameră termică.
|||
Scopul nu este memorarea simptomelor, ci înțelegerea <em>de ce</em> instabilitatea se manifestă doar sub sarcină sau la anumite temperaturi, <em>cum</em> reproduci condițiile exacte ale defectului și <em>de ce</em> măsurarea parametrilor electrici în timp real este singura cale de a identifica componenta marginală.
'@

$data["lectia-6-5.html"] = @'
Ce se întâmplă când curentul depășește limita de siguranță? Când tensiunea crește peste pragul maxim? Când temperatura atinge un nivel periculos? PSU-urile și VRM-urile consolelor moderne au protecții hardware integrate care opresc alimentarea în microsecunde — salvând componentele de distrugere. Aceste circuite de protecție sunt ultima linie de apărare între un defect și o placă de bază arsă.
|||
Această lecție acoperă cele patru protecții electrice fundamentale: <strong>OCP</strong> (Over-Current Protection — limitarea curentului), <strong>OVP</strong> (Over-Voltage Protection — limitarea tensiunii), <strong>OTP</strong> (Over-Temperature Protection — oprirea la supraîncălzire) și <strong>SCP</strong> (Short-Circuit Protection — deconectarea la scurtcircuit), plus semnalul <strong>Power Good</strong> care confirmă că toate tensiunile sunt stabile.
|||
Scopul nu este memorarea acronimelor, ci înțelegerea <em>de ce</em> o consolă care pulsează (pornește și se oprește imediat) are adesea o protecție activată, <em>cum</em> identifici care protecție s-a declanșat și <em>ce defect</em> fizic a cauzat activarea ei.
'@

$data["lectia-7-1.html"] = @'
Fiecare cadru afișat pe ecranul consolei tale parcurge un traseu precis prin GPU: mai întâi scena 3D este definită prin vertecși și triunghiuri, apoi geometria este transformată și proiectată pe ecranul 2D, triunghiurile sunt convertite în fragmente, fiecare fragment primește o culoare calculată prin shadere, și în final imaginea completă este scrisă în framebuffer. Acest proces — pipeline-ul grafic — se repetă de 30, 60 sau 120 de ori pe secundă.
|||
Această lecție acoperă etapele pipeline-ului grafic de la scenă la pixel: <strong>procesarea geometriei</strong> (vertex shading, transformări, clipping), <strong>rasterizarea</strong> (conversia primitivelor în fragmente) și <strong>shading-ul</strong> (calculul culorii finale, iluminare, texturare).
|||
Scopul nu este memorarea numelor etapelor, ci înțelegerea <em>ce se întâmplă</em> fizic în GPU-ul RDNA 2 din PS5 în cele sub-16ms disponibile pentru 60 FPS, <em>cum</em> ray tracing-ul hardware adaugă trasarea fizic corectă a luminii și <em>de ce</em> anumite scene sunt mai grele decât altele.
'@

$data["lectia-7-2.html"] = @'
De ce un joc rulează la 60 FPS într-o scenă și scade la 30 FPS în alta? Răspunsul depinde de cine este gâtul de sticlă: CPU-ul sau GPU-ul. Dacă procesorul nu poate calcula logica jocului suficient de rapid, GPU-ul așteaptă fără lucru — jocul este CPU-bound. Dacă GPU-ul nu poate randa scena la timp, CPU-ul termină devreme și așteaptă — jocul este GPU-bound. Identificarea bottleneck-ului este primul pas în optimizare.
|||
Această lecție acoperă conceptul de <strong>limitare a performanței</strong>: <strong>rolul CPU-ului</strong> (logica jocului, IA, fizică, draw calls) vs. <strong>rolul GPU-ului</strong> (geometrie, rasterizare, shading, post-processing) și cum se determină care componentă este factorul limitativ într-un scenariu dat.
|||
Scopul nu este etichetarea jocurilor ca CPU-bound sau GPU-bound, ci înțelegerea <em>de ce</em> un joc cu oraș populat tinde să fie limitat de CPU, <em>de ce</em> unul cu grafică ultra-detaliată este limitat de GPU și <em>cum</em> dezvoltatorii echilibrează sarcina pe hardware fix pentru framerate constant.
'@

$data["lectia-7-3.html"] = @'
TDP-ul (Thermal Design Power) unui procesor nu este puterea maximă pe care o consumă — este puterea termică pe care sistemul de răcire trebuie să o disipeze în funcționare susținută. SoC-ul din PlayStation 5 are un TDP de ~200W, ceea ce înseamnă că sistemul de răcire al consolei trebuie să evacueze echivalentul a două becuri de 100W continuu, într-un spațiu de câțiva centimetri cubi, la un nivel de zgomot acceptabil.
|||
Această lecție acoperă <strong>TDP</strong> (ce reprezintă și ce nu), <strong>disiparea căldurii</strong> (cum energia electrică se transformă ireversibil în căldură prin efectul Joule) și <strong>temperatura de funcționare</strong> — pragurile termice dincolo de care procesorul reduce frecvența (throttling) sau se oprește complet (thermal shutdown).
|||
Scopul nu este memorarea valorii TDP-ului, ci înțelegerea <em>de ce</em> temperatura joncțiunii nu ar trebui să depășească ~100°C, <em>cum</em> fiecare grad câștigat prin răcire eficientă se traduce în frecvențe mai stabile și <em>de ce</em> managementul termic nu este doar protecție — este optimizare directă a performanței.
'@

$data["lectia-7-4.html"] = @'
Ai observat vreodată că un joc rulează fluid la început, dar după 30 de minute de gameplay intens framerate-ul scade? Motivul se numește thermal throttling: când temperatura SoC-ului depășește un prag critic, procesorul reduce automat frecvența pentru a genera mai puțină căldură. Performanța scade, dar chipul supraviețuiește. Este un mecanism de protecție care sacrifică viteza pentru longevitate.
|||
Această lecție acoperă <strong>thermal throttling</strong> (reducerea automată a performanței la supraîncălzire), <strong>reducerea frecvenței</strong> (cum procesorul coboară MHz-ii în pași pentru a reduce puterea disipată) și <strong>protecția termică</strong> — mecanismul care previne deteriorarea permanentă a semiconductoarelor.
|||
Scopul nu este memorarea pragurilor de temperatură, ci înțelegerea <em>de ce</em> puterea disipată crește cu frecvența și cu pătratul tensiunii, <em>cum</em> consolele moderne redistribuie bugetul de putere dinamic între CPU și GPU și <em>de ce</em> o consolă cu pasta termică uscată pierde performanță înainte de a se opri.
'@

$data["lectia-7-5.html"] = @'
Un GPU cu 10 TFLOPS de putere de calcul este inutil dacă nu primește datele suficient de repede. Bandwidth-ul — cantitatea de date transferată pe secundă între memorie și procesor — este adesea factorul care determină performanța reală a unui sistem grafic. PlayStation 5 oferă 448 GB/s de bandwidth prin GDDR6, iar Xbox Series X atinge 560 GB/s — numere care definesc câte texturi, vertecși și framebuffer-uri pot fi procesate pe secundă.
|||
Această lecție acoperă <strong>bandwidth-ul</strong> (capacitatea de transfer a bus-ului de memorie), <strong>latența</strong> (timpul de acces la fiecare cerere individuală) și <strong>influența acestora asupra performanței</strong> — de ce un GPU cu bandwidth insuficient nu poate atinge rezoluția sau framerate-ul nominal.
|||
Scopul nu este memorarea specificațiilor de bandwidth, ci înțelegerea <em>de ce</em> PS5 folosește un bus de 256-bit pentru a atinge 448 GB/s, <em>cum</em> aceste numere determină direct calitatea vizuală sustenabilă în timp real și <em>de ce</em> bandwidth-ul, nu doar puterea de calcul, dictează performanța grafică.
'@

$data["lectia-8-1.html"] = @'
Când o consolă ajunge pe masa de lucru cu simptomul nu pornește sau se oprește singură, un tehnician fără metodologie va înlocui componente la întâmplare, sperând să nimerească defectul. Un tehnician cu metodologie va urma un proces sistematic: reproduce problema, observă simptomele, formulează ipoteze, testează fiecare ipoteză cu instrumente, și izolează cauza reală înainte de a atinge ciocanul de lipit.
|||
Această lecție acoperă <strong>pașii diagnosticului hardware</strong> — metodologia completă de la simptom la reparație — și <strong>analiza simptomelor</strong> — cum se interpretează indiciile pe care consola le oferă (LED-uri, sunete, comportamentul ventilatorului, mesaje de eroare) pentru a localiza defectul.
|||
Scopul nu este memorarea unui checklist de diagnostic, ci înțelegerea <em>de ce</em> fiecare simptom are o cauză fizică, <em>cum</em> fiecare cauză poate fi verificată cu un instrument și <em>de ce</em> abordarea sistematică — nu intuiția — este fundația diagnosticului profesional.
'@

$data["lectia-8-2.html"] = @'
Multimetrul este instrumentul de bază al oricărui tehnician de console — un dispozitiv portabil care poate măsura tensiune, rezistență, continuitate, și uneori capacitate, frecvență sau temperatură. Cu un multimetru de 30 de euro și cunoștințele potrivite, poți diagnostica 90% din defectele hardware ale unei console: verifici dacă PSU-ul produce tensiune, dacă un traseu este continuu, dacă un condensator este în scurtcircuit.
|||
Această lecție acoperă utilizarea practică a multimetrului pentru diagnostic: <strong>măsurarea tensiunii</strong> (DC și AC, pe rail-urile consolei), <strong>măsurarea rezistenței</strong> (identificarea componentelor defecte) și <strong>măsurarea continuității</strong> (verificarea integrității traseelor și detectarea circuitelor deschise).
|||
Scopul nu este memorarea procedurilor de utilizare, ci înțelegerea <em>ce întrebare</em> răspunde fiecare funcție a multimetrului: este tensiune pe acest rail? (voltmetru), este intact acest traseu? (continuitate), este acest condensator în scurtcircuit? (ohmmetru) — și <em>cum</em> aceste răspunsuri transformă diagnosticul din ghicire în măsurare.
'@

$data["lectia-8-3.html"] = @'
Un scurtcircuit pe un rail de alimentare este una dintre cele mai comune și mai periculoase defecte hardware. Când două puncte care ar trebui să fie la tensiuni diferite sunt conectate accidental — prin contaminare cu lichid, componentă defectă, sau degradare a izolației — curentul crește necontrolat, protecțiile PSU-ului se activează, și consola refuză să pornească. Detectarea și localizarea scurtcircuitului pe un PCB cu mii de componente este o abilitate fundamentală.
|||
Această lecție acoperă <strong>identificarea scurtcircuitelor</strong> (cum recunoști prezența unui scurtcircuit pe un rail) și <strong>metodele de testare</strong> — de la măsurarea rezistenței cu multimetrul la injectarea de curent controlat și urmărirea termică a traseului defect.
|||
Scopul nu este memorarea valorilor de rezistență, ci înțelegerea <em>de ce</em> modul diodă al multimetrului detectează scurtcircuite, <em>cum</em> injectezi curent controlat pentru a localiza sursa termică și <em>de ce</em> tehnica cu alcool izopropilic și cameră termică funcționează — fizica din spatele fiecărei metode de diagnostic.
'@

$data["lectia-8-4.html"] = @'
Istoria consolelor este marcată de defecte hardware care au definit generații întregi: Red Ring of Death pe Xbox 360 (lipitură fără plumb care cedează termic), Yellow Light of Death pe PS3 (eșecul BGA-urilor sub stres termic), Blue Light of Death pe PS4 (probleme HDMI sau APU). Aceste studii de caz reale demonstrează cum principiile din lecțiile anterioare — tensiune, temperatură, lipitură, protecții — converg într-un singur punct de eșec.
|||
Această lecție analizează cele mai cunoscute defecte hardware din istoria consolelor: <strong>YLOD</strong> (Yellow Light of Death — PS3), <strong>RROD</strong> (Red Ring of Death — Xbox 360) și <strong>BLOD</strong> (Blue Light of Death — PS4) — cauzele reale, diagnosticul și soluțiile de reparare.
|||
Scopul nu este memorarea acronimelor, ci înțelegerea <em>de ce</em> fiecare din aceste defecte celebre are o cauză fizică precisă explicabilă prin conceptele din acest curs: <em>stres termic</em>, <em>lipitură fragilă</em>, <em>design termic inadecvat</em> — și cum analiza lor transformă teoria în practică.
'@

$data["lectia-8-5.html"] = @'
O consolă care nu pornește poate avea o sursă defectă, un scurtcircuit, un MOSFET ars, sau pur și simplu un cablu de curent defect. O consolă cu artefacte grafice poate avea un GPU defect, memorie GDDR6 eșuată, o lipitură rece sub BGA, sau o tensiune marginală pe rail-ul GPU-ului. Simptomul este ceea ce vezi; cauza reală este ceea ce trebuie găsit. Confuzia dintre simptom și cauză este cea mai frecventă greșeală în diagnosticul hardware.
|||
Această lecție acoperă relația dintre <strong>simptomele hardware</strong> (ceea ce observi: LED-uri, comportament, mesaje) și <strong>cauzele reale ale defectelor</strong> (ceea ce trebuie reparat: componenta specifică, conexiunea defectă, parametrul electric în afara toleranței).
|||
Scopul nu este memorarea tabelelor simptom-cauză, ci înțelegerea <em>de ce</em> un simptom poate avea multiple cauze posibile, <em>de ce</em> o cauză poate produce multiple simptome și <em>de ce</em> testarea sistematică a fiecărei ipoteze — nu saltul la concluzii — este singura cale sigură de a repara corect.
'@

# --- BUILD SECTION FUNCTION ---
function Build-IntroSection {
    param([string]$hook, [string]$topics, [string]$purpose)
    $lines = @()
    $lines += ""
    $lines += "    <section class=""section"" id=""introducere"">"
    $lines += "        <div class=""container"">"
    $lines += "            <h2 class=""section-title"">Introducere</h2>"
    $lines += ""
    $lines += "            <div class=""card"" style=""margin-bottom: 2rem;"">"
    $lines += "                <p>"
    $lines += "                    $hook"
    $lines += "                </p>"
    $lines += "                <p>"
    $lines += "                    $topics"
    $lines += "                </p>"
    $lines += "                <p>"
    $lines += "                    $purpose"
    $lines += "                </p>"
    $lines += "            </div>"
    $lines += "        </div>"
    $lines += "    </section>"
    return $lines -join "`r`n"
}

# --- PROCESSING ---
$sectionPattern = '(?ms)^[ \t]*<section\s[^>]*id="introducere"[^>]*>.*?</section>'
$entityPattern = '&#(\d+);'
$introCount = 0
$entityTotal = 0

foreach ($entry in $data.GetEnumerator()) {
    $filePath = Join-Path $basePath $entry.Key
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $($entry.Key) not found"
        continue
    }

    $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

    # Step 1: Fix HTML numeric entities to UTF-8
    $entityMatches = [regex]::Matches($content, $entityPattern).Count
    $content = [regex]::Replace($content, $entityPattern, {
        param($m)
        [char][int]$m.Groups[1].Value
    })

    # Step 2: Replace intro section
    $parts = $entry.Value -split '\|\|\|'
    $h = $parts[0].Trim()
    $t = $parts[1].Trim()
    $p = $parts[2].Trim()
    $newSection = Build-IntroSection $h $t $p

    $introMatch = [regex]::Match($content, $sectionPattern)
    if ($introMatch.Success) {
        $content = $content.Substring(0, $introMatch.Index) + $newSection + $content.Substring($introMatch.Index + $introMatch.Length)
        $introCount++
    } else {
        Write-Host "WARN: $($entry.Key) - intro pattern not matched"
    }

    # Step 3: Write
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    $entityTotal += $entityMatches
    Write-Host "OK: $($entry.Key) (entities: $entityMatches)"
}

Write-Host ""
Write-Host "Intros updated: $introCount / $($data.Count)"
Write-Host "Total entities fixed: $entityTotal"
