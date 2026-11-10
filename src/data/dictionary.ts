// Wörterbuch der Grundbegriffe. Eine Zeile pro Artikel:
// id ; Kategorie ; de ; en ; es ; pt ; fr ; it ; nl ; hr ; el
// Mehrere Varianten mit "/" trennen – die erste wird angezeigt, alle werden bei der Eingabe erkannt.
// Status: Entwurf, noch nicht von Muttersprachlern geprüft (siehe README).

export const LANGS = ['de', 'en', 'es', 'pt', 'fr', 'it', 'nl', 'hr', 'el'] as const
export type Lang = (typeof LANGS)[number]

export type Category =
  | 'obst'
  | 'milch'
  | 'brot'
  | 'fleisch'
  | 'vorrat'
  | 'getraenke'
  | 'tk'
  | 'haushalt'
  | 'hygiene'
  | 'baby'

const RAW = `
milch;milch;Milch;milk;leche;leite;lait;latte;melk;mlijeko;γάλα
hmilch;milch;H-Milch/haltbare Milch;UHT milk/long-life milk;leche UHT;leite UHT;lait UHT;latte UHT/latte a lunga conservazione;houdbare melk;trajno mlijeko;γάλα μακράς διαρκείας
laktosefrei;milch;laktosefreie Milch;lactose-free milk;leche sin lactosa;leite sem lactose;lait sans lactose;latte senza lattosio;lactosevrije melk;mlijeko bez laktoze;γάλα χωρίς λακτόζη
butter;milch;Butter;butter;mantequilla;manteiga;beurre;burro;boter;maslac;βούτυρο
joghurt;milch;Joghurt/Jogurt;yogurt/yoghurt;yogur;iogurte;yaourt;yogurt;yoghurt;jogurt;γιαούρτι
griechjoghurt;milch;griechischer Joghurt;Greek yogurt;yogur griego;iogurte grego;yaourt grec;yogurt greco;Griekse yoghurt;grčki jogurt;στραγγιστό γιαούρτι
kaese;milch;Käse;cheese;queso;queijo;fromage;formaggio;kaas;sir;τυρί
reibekaese;milch;Reibekäse/geriebener Käse;grated cheese;queso rallado;queijo ralado;fromage râpé;formaggio grattugiato;geraspte kaas;ribani sir;τριμμένο τυρί
frischkaese;milch;Frischkäse;cream cheese;queso crema;queijo creme;fromage à tartiner;formaggio spalmabile;roomkaas;krem sir;τυρί κρέμα
mozzarella;milch;Mozzarella;mozzarella;mozzarella;mozzarella;mozzarella;mozzarella;mozzarella;mozzarella;μοτσαρέλα
feta;milch;Feta/Fetakäse;feta;queso feta;queijo feta;feta;feta;feta;feta sir;φέτα
quark;milch;Quark;quark;queso fresco batido;quark;fromage blanc;quark;kwark;svježi sir;τυρί quark
sahne;milch;Sahne/Rahm;cream;nata;natas;crème;panna;room;vrhnje;κρέμα γάλακτος
schlagsahne;milch;Schlagsahne/Schlagrahm;whipping cream;nata para montar;natas para bater;crème liquide;panna da montare;slagroom;slatko vrhnje;κρέμα γάλακτος για σαντιγί
sauresahne;milch;saure Sahne/Sauerrahm;sour cream;nata agria;natas azedas;crème aigre;panna acida;zure room;kiselo vrhnje;ξινή κρέμα
eier;milch;Eier/Ei;eggs/egg;huevos;ovos;œufs;uova;eieren;jaja;αυγά
margarine;milch;Margarine;margarine;margarina;margarina;margarine;margarina;margarine;margarin;μαργαρίνη
brot;brot;Brot;bread;pan;pão;pain;pane;brood;kruh;ψωμί
broetchen;brot;Brötchen/Semmeln/Weggli;bread rolls/rolls;panecillos;pãezinhos;petits pains;panini;broodjes;pecivo;ψωμάκια
toastbrot;brot;Toastbrot;sliced bread/toast bread;pan de molde;pão de forma;pain de mie;pancarré;casinobrood;tost kruh;ψωμί του τοστ
baguette;brot;Baguette;baguette;barra de pan;baguete;baguette;baguette;stokbrood;baguette;μπαγκέτα
croissant;brot;Croissant/Gipfeli;croissant;cruasán;croissant;croissant;cornetto;croissant;kroasan;κρουασάν
muesli;brot;Müsli;muesli;muesli;muesli;muesli;muesli;muesli;musli;μούσλι
cerealien;brot;Cornflakes/Frühstücksflocken;cereal/cornflakes;cereales;cereais;céréales;cereali;ontbijtgranen;žitarice;δημητριακά
haferflocken;brot;Haferflocken;oats/rolled oats;copos de avena;flocos de aveia;flocons d'avoine;fiocchi d'avena;havermout;zobene pahuljice;νιφάδες βρώμης
aepfel;obst;Äpfel/Apfel;apples/apple;manzanas;maçãs;pommes;mele;appels;jabuke;μήλα
bananen;obst;Bananen/Banane;bananas/banana;plátanos;bananas;bananes;banane;bananen;banane;μπανάνες
orangen;obst;Orangen/Orange;oranges/orange;naranjas;laranjas;oranges;arance;sinaasappels;naranče;πορτοκάλια
zitronen;obst;Zitronen/Zitrone;lemons/lemon;limones;limões;citrons;limoni;citroenen;limuni;λεμόνια
limetten;obst;Limetten/Limette;limes/lime;limas;limas;citrons verts;lime;limoenen;limete;λάιμ
trauben;obst;Trauben/Weintrauben;grapes;uvas;uvas;raisin;uva;druiven;grožđe;σταφύλια
erdbeeren;obst;Erdbeeren;strawberries;fresas;morangos;fraises;fragole;aardbeien;jagode;φράουλες
wassermelone;obst;Wassermelone;watermelon;sandía;melancia;pastèque;anguria;watermeloen;lubenica;καρπούζι
melone;obst;Melone;melon;melón;melão;melon;melone;meloen;dinja;πεπόνι
pfirsiche;obst;Pfirsiche/Pfirsich;peaches/peach;melocotones;pêssegos;pêches;pesche;perziken;breskve;ροδάκινα
birnen;obst;Birnen/Birne;pears/pear;peras;peras;poires;pere;peren;kruške;αχλάδια
tomaten;obst;Tomaten/Tomate;tomatoes/tomato;tomates;tomates;tomates;pomodori;tomaten;rajčice;ντομάτες
gurke;obst;Gurke/Gurken;cucumber;pepino;pepino;concombre;cetriolo;komkommer;krastavac;αγγούρι
salat;obst;Salat/Kopfsalat;lettuce;lechuga;alface;laitue;lattuga;sla;zelena salata;μαρούλι
kartoffeln;obst;Kartoffeln/Kartoffel;potatoes/potato;patatas;batatas;pommes de terre;patate;aardappelen;krumpir;πατάτες
zwiebeln;obst;Zwiebeln/Zwiebel;onions/onion;cebollas;cebolas;oignons;cipolle;uien;luk;κρεμμύδια
knoblauch;obst;Knoblauch;garlic;ajo;alho;ail;aglio;knoflook;češnjak;σκόρδο
karotten;obst;Karotten/Möhren/Rüebli;carrots/carrot;zanahorias;cenouras;carottes;carote;wortels;mrkva;καρότα
paprika;obst;Paprika/Peperoni;peppers/bell peppers;pimientos;pimentos;poivrons;peperoni;paprika's;paprike;πιπεριές
zucchini;obst;Zucchini;courgettes/zucchini;calabacín;curgete;courgettes;zucchine;courgette;tikvice;κολοκυθάκια
aubergine;obst;Aubergine/Auberginen;aubergine/eggplant;berenjena;beringela;aubergine;melanzane;aubergine;patlidžan;μελιτζάνες
avocado;obst;Avocado/Avocados;avocado;aguacate;abacate;avocat;avocado;avocado;avokado;αβοκάντο
pilze;obst;Pilze/Champignons;mushrooms;champiñones;cogumelos;champignons;funghi;champignons;gljive;μανιτάρια
spinat;obst;Spinat;spinach;espinacas;espinafres;épinards;spinaci;spinazie;špinat;σπανάκι
brokkoli;obst;Brokkoli;broccoli;brócoli;brócolos;brocoli;broccoli;broccoli;brokula;μπρόκολο
petersilie;obst;Petersilie;parsley;perejil;salsa;persil;prezzemolo;peterselie;peršin;μαϊντανός
basilikum;obst;Basilikum;basil;albahaca;manjericão;basilic;basilico;basilicum;bosiljak;βασιλικός
oliven;vorrat;Oliven;olives;aceitunas;azeitonas;olives;olive;olijven;masline;ελιές
haehnchen;fleisch;Hähnchen/Hühnchen/Poulet;chicken;pollo;frango;poulet;pollo;kip;piletina;κοτόπουλο
haehnchenbrust;fleisch;Hähnchenbrust/Pouletbrust;chicken breast;pechuga de pollo;peito de frango;blanc de poulet;petto di pollo;kipfilet;pileća prsa;στήθος κοτόπουλου
hack;fleisch;Hackfleisch/Gehacktes;minced meat/mince/ground beef;carne picada;carne picada;viande hachée;carne macinata;gehakt;mljeveno meso;κιμάς
rind;fleisch;Rindfleisch;beef;carne de ternera;carne de vaca;bœuf;manzo;rundvlees;govedina;μοσχάρι
schwein;fleisch;Schweinefleisch;pork;carne de cerdo;carne de porco;porc;maiale;varkensvlees;svinjetina;χοιρινό
schinken;fleisch;Schinken/Kochschinken;ham;jamón cocido;fiambre;jambon;prosciutto cotto;ham;šunka;ζαμπόν
rohschinken;fleisch;Rohschinken;cured ham;jamón serrano;presunto;jambon cru;prosciutto crudo;rauwe ham;pršut;προσούτο
salami;fleisch;Salami;salami;salami;salame;saucisson;salame;salami;salama;σαλάμι
wuerstchen;fleisch;Würstchen/Wienerli;sausages;salchichas;salsichas;saucisses;würstel;worstjes;hrenovke;λουκάνικα
speck;fleisch;Speck;bacon;beicon;bacon;lardons;pancetta;spek;slanina;μπέικον
fisch;fleisch;Fisch;fish;pescado;peixe;poisson;pesce;vis;riba;ψάρι
lachs;fleisch;Lachs;salmon;salmón;salmão;saumon;salmone;zalm;losos;σολομός
thunfisch;fleisch;Thunfisch;tuna;atún;atum;thon;tonno;tonijn;tuna;τόνος
garnelen;fleisch;Garnelen/Crevetten;prawns/shrimp;gambas;camarão;crevettes;gamberi;garnalen;kozice;γαρίδες
nudeln;vorrat;Nudeln/Pasta/Teigwaren;pasta;pasta;massa;pâtes;pasta;pasta;tjestenina;ζυμαρικά
spaghetti;vorrat;Spaghetti;spaghetti;espaguetis;esparguete;spaghetti;spaghetti;spaghetti;špageti;σπαγγέτι
reis;vorrat;Reis;rice;arroz;arroz;riz;riso;rijst;riža;ρύζι
mehl;vorrat;Mehl;flour;harina;farinha;farine;farina;bloem;brašno;αλεύρι
zucker;vorrat;Zucker;sugar;azúcar;açúcar;sucre;zucchero;suiker;šećer;ζάχαρη
salz;vorrat;Salz;salt;sal;sal;sel;sale;zout;sol;αλάτι
pfeffer;vorrat;Pfeffer;pepper/black pepper;pimienta;pimenta;poivre;pepe;peper;papar;πιπέρι
olivenoel;vorrat;Olivenöl;olive oil;aceite de oliva;azeite;huile d'olive;olio d'oliva;olijfolie;maslinovo ulje;ελαιόλαδο
sonnenblumenoel;vorrat;Sonnenblumenöl/Speiseöl;sunflower oil/cooking oil;aceite de girasol;óleo de girassol;huile de tournesol;olio di semi di girasole;zonnebloemolie;suncokretovo ulje;ηλιέλαιο
essig;vorrat;Essig;vinegar;vinagre;vinagre;vinaigre;aceto;azijn;ocat;ξύδι
tomatensauce;vorrat;Tomatensauce/Passata;tomato sauce/passata;salsa de tomate;molho de tomate;sauce tomate;passata di pomodoro;tomatensaus;umak od rajčice;σάλτσα ντομάτας
dosentomaten;vorrat;Dosentomaten/gehackte Tomaten;chopped tomatoes/tinned tomatoes;tomate triturado;tomate em lata;tomates concassées;pomodori pelati;tomatenblokjes;rajčica u konzervi;ντομάτα κονκασέ
ketchup;vorrat;Ketchup;ketchup;kétchup;ketchup;ketchup;ketchup;ketchup;kečap;κέτσαπ
senf;vorrat;Senf;mustard;mostaza;mostarda;moutarde;senape;mosterd;senf;μουστάρδα
mayo;vorrat;Mayonnaise/Mayo;mayonnaise/mayo;mayonesa;maionese;mayonnaise;maionese;mayonaise;majoneza;μαγιονέζα
honig;vorrat;Honig;honey;miel;mel;miel;miele;honing;med;μέλι
marmelade;vorrat;Marmelade/Konfitüre;jam;mermelada;compota;confiture;marmellata;jam;džem;μαρμελάδα
kaffee;vorrat;Kaffee;coffee;café;café;café;caffè;koffie;kava;καφές
tee;vorrat;Tee;tea;té;chá;thé;tè;thee;čaj;τσάι
kakao;vorrat;Kakao/Kakaopulver;cocoa;cacao en polvo;cacau;cacao;cacao;cacao;kakao;κακάο
schokolade;vorrat;Schokolade;chocolate;chocolate;chocolate;chocolat;cioccolato;chocolade;čokolada;σοκολάτα
kekse;vorrat;Kekse/Guetzli;biscuits/cookies;galletas;bolachas;biscuits;biscotti;koekjes;keksi;μπισκότα
chips;vorrat;Chips;crisps/chips;patatas fritas de bolsa;batatas fritas de pacote;chips;patatine;chips;čips;πατατάκια
nuesse;vorrat;Nüsse;nuts;frutos secos;frutos secos;noix;frutta secca;noten;orašasti plodovi;ξηροί καρποί
erdnuesse;vorrat;Erdnüsse;peanuts;cacahuetes;amendoins;cacahuètes;arachidi;pinda's;kikiriki;φιστίκια
bohnen;vorrat;Bohnen/weisse Bohnen;beans;alubias;feijão;haricots;fagioli;bonen;grah;φασόλια
kichererbsen;vorrat;Kichererbsen;chickpeas;garbanzos;grão-de-bico;pois chiches;ceci;kikkererwten;slanutak;ρεβίθια
linsen;vorrat;Linsen;lentils;lentejas;lentilhas;lentilles;lenticchie;linzen;leća;φακές
backpulver;vorrat;Backpulver;baking powder;levadura química;fermento em pó;levure chimique;lievito per dolci;bakpoeder;prašak za pecivo;μπέικιν πάουντερ
hefe;vorrat;Hefe;yeast;levadura de panadería;fermento de padeiro;levure de boulanger;lievito di birra;gist;kvasac;μαγιά
wasser;getraenke;Wasser;water;agua;água;eau;acqua;water;voda;νερό
sprudel;getraenke;Sprudel/Mineralwasser mit Kohlensäure;sparkling water;agua con gas;água com gás;eau gazeuse;acqua frizzante;bruisend water;gazirana voda;ανθρακούχο νερό
stilleswasser;getraenke;stilles Wasser;still water;agua sin gas;água sem gás;eau plate;acqua naturale;plat water;negazirana voda;νερό χωρίς ανθρακικό
orangensaft;getraenke;Orangensaft/O-Saft;orange juice;zumo de naranja;sumo de laranja;jus d'orange;succo d'arancia;sinaasappelsap;sok od naranče;χυμός πορτοκάλι
saft;getraenke;Saft;juice;zumo;sumo;jus;succo;sap;sok;χυμός
cola;getraenke;Cola;cola/coke;refresco de cola;cola;cola;cola;cola;cola;κόλα
bier;getraenke;Bier;beer;cerveza;cerveja;bière;birra;bier;pivo;μπίρα
wein;getraenke;Wein;wine;vino;vinho;vin;vino;wijn;vino;κρασί
rotwein;getraenke;Rotwein;red wine;vino tinto;vinho tinto;vin rouge;vino rosso;rode wijn;crno vino;κόκκινο κρασί
weisswein;getraenke;Weisswein/Weißwein;white wine;vino blanco;vinho branco;vin blanc;vino bianco;witte wijn;bijelo vino;λευκό κρασί
eiswuerfel;getraenke;Eiswürfel;ice/ice cubes;hielo;gelo;glaçons;ghiaccio;ijsblokjes;led;παγάκια
glace;tk;Eis/Glace/Speiseeis;ice cream;helado;gelado;glace;gelato;ijs;sladoled;παγωτό
tkpizza;tk;Tiefkühlpizza/TK-Pizza;frozen pizza;pizza congelada;pizza congelada;pizza surgelée;pizza surgelata;diepvriespizza;smrznuta pizza;κατεψυγμένη πίτσα
pommes;tk;Pommes/Pommes frites;frozen chips/frozen fries;patatas fritas congeladas;batatas fritas congeladas;frites surgelées;patatine fritte surgelate;diepvriesfrietjes;smrznuti pomfrit;κατεψυγμένες πατάτες
wcpapier;haushalt;Toilettenpapier/WC-Papier/Klopapier;toilet paper/toilet roll;papel higiénico;papel higiénico;papier toilette;carta igienica;wc-papier;toaletni papir;χαρτί υγείας
kuechenrolle;haushalt;Küchenrolle/Haushaltspapier;kitchen roll/paper towels;papel de cocina;rolo de cozinha;essuie-tout;carta da cucina;keukenrol;papirnati ubrusi;χαρτί κουζίνας
taschentuecher;hygiene;Taschentücher/Nastücher;tissues;pañuelos de papel;lenços de papel;mouchoirs;fazzoletti;papieren zakdoekjes;papirnate maramice;χαρτομάντιλα
spuelmittel;haushalt;Spülmittel/Abwaschmittel;washing-up liquid/dish soap;lavavajillas a mano;detergente da loiça;liquide vaisselle;detersivo per piatti;afwasmiddel;deterdžent za suđe;υγρό πιάτων
spueltabs;haushalt;Spülmaschinentabs/Geschirrspültabs;dishwasher tablets;pastillas para lavavajillas;pastilhas para máquina da loiça;tablettes lave-vaisselle;pastiglie per lavastoviglie;vaatwastabletten;tablete za perilicu posuđa;ταμπλέτες πλυντηρίου πιάτων
waschmittel;haushalt;Waschmittel;laundry detergent;detergente para la ropa;detergente para a roupa;lessive;detersivo per bucato;wasmiddel;deterdžent za rublje;απορρυπαντικό ρούχων
muellbeutel;haushalt;Müllbeutel/Abfallsäcke;bin bags/trash bags;bolsas de basura;sacos do lixo;sacs poubelle;sacchetti della spazzatura;vuilniszakken;vrećice za smeće;σακούλες σκουπιδιών
schwamm;haushalt;Schwamm/Schwämme;sponge;esponja;esponja;éponge;spugna;spons;spužva;σφουγγάρι
alufolie;haushalt;Alufolie;aluminium foil/tin foil;papel de aluminio;papel de alumínio;papier aluminium;carta d'alluminio;aluminiumfolie;aluminijska folija;αλουμινόχαρτο
zahnpasta;hygiene;Zahnpasta;toothpaste;pasta de dientes;pasta de dentes;dentifrice;dentifricio;tandpasta;pasta za zube;οδοντόκρεμα
zahnbuerste;hygiene;Zahnbürste;toothbrush;cepillo de dientes;escova de dentes;brosse à dents;spazzolino;tandenborstel;četkica za zube;οδοντόβουρτσα
shampoo;hygiene;Shampoo;shampoo;champú;champô;shampooing;shampoo;shampoo;šampon;σαμπουάν
duschgel;hygiene;Duschgel;shower gel;gel de ducha;gel de banho;gel douche;bagnoschiuma;douchegel;gel za tuširanje;αφρόλουτρο
seife;hygiene;Seife;soap;jabón;sabonete;savon;sapone;zeep;sapun;σαπούνι
sonnencreme;hygiene;Sonnencreme/Sonnenschutz;sunscreen/sun cream;protector solar;protetor solar;crème solaire;crema solare;zonnebrandcrème;krema za sunčanje;αντηλιακό
deo;hygiene;Deo/Deodorant;deodorant;desodorante;desodorizante;déodorant;deodorante;deodorant;dezodorans;αποσμητικό
binden;hygiene;Binden/Damenbinden;sanitary pads;compresas;pensos higiénicos;serviettes hygiéniques;assorbenti;maandverband;higijenski ulošci;σερβιέτες
tampons;hygiene;Tampons;tampons;tampones;tampões;tampons;tamponi;tampons;tamponi;ταμπόν
mueckenschutz;hygiene;Mückenschutz/Insektenschutz/Mückenspray;insect repellent/mosquito repellent;repelente de mosquitos;repelente de insetos;anti-moustique;repellente per zanzare;muggenspray;sredstvo protiv komaraca;εντομοαπωθητικό
windeln;baby;Windeln;nappies/diapers;pañales;fraldas;couches;pannolini;luiers;pelene;πάνες
feuchttuecher;baby;Feuchttücher;wet wipes/baby wipes;toallitas húmedas;toalhitas húmidas;lingettes;salviette umidificate;vochtige doekjes;vlažne maramice;μωρομάντηλα
ananas;obst;Ananas;pineapple;piña;ananás/abacaxi;ananas;ananas;ananas;ananas;ανανάς
kiwi;obst;Kiwi/Kiwis;kiwi/kiwis;kiwi/kiwis;kiwi/quivi;kiwi/kiwis;kiwi;kiwi's/kiwi;kivi;ακτινίδια/ακτινίδιο
mango;obst;Mango/Mangos;mango/mangoes;mango/mangos;manga/mangas;mangue/mangues;mango;mango/mango's;mango;μάνγκο
kirschen;obst;Kirschen/Kirsche;cherries;cerezas;cerejas;cerises;ciliegie;kersen;trešnje;κεράσια
aprikosen;obst;Aprikosen/Marillen;apricots;albaricoques;damascos/alperces;abricots;albicocche;abrikozen;marelice;βερίκοκα
feigen;obst;Feigen;figs;higos;figos;figues;fichi;vijgen;smokve;σύκα
himbeeren;obst;Himbeeren;raspberries;frambuesas;framboesas;framboises;lamponi;frambozen;maline;σμέουρα
heidelbeeren;obst;Heidelbeeren/Blaubeeren;blueberries;arándanos;mirtilos;myrtilles;mirtilli;blauwe bessen;borovnice;μύρτιλα
mandarinen;obst;Mandarinen/Clementinen;mandarins/clementines/tangerines;mandarinas/clementinas;tangerinas/clementinas;mandarines/clémentines;mandarini/clementine;mandarijnen;mandarine;μανταρίνια
nektarinen;obst;Nektarinen;nectarines;nectarinas/nectarinos;nectarinas;nectarines/brugnons;pesche noci/nettarine;nectarines;nektarine;νεκταρίνια
pflaumen;obst;Pflaumen/Zwetschgen;plums;ciruelas;ameixas;prunes;prugne/susine;pruimen;šljive;δαμάσκηνα
kirschtomaten;obst;Cherrytomaten/Kirschtomaten;cherry tomatoes;tomates cherry;tomate cherry;tomates cerises;pomodorini/pomodori ciliegini;cherrytomaten;cherry rajčice;ντοματίνια
fruehlingszwiebeln;obst;Frühlingszwiebeln/Lauchzwiebeln;spring onions/scallions;cebolletas;cebolinhas;oignons nouveaux/cébettes;cipollotti;lente-uitjes;mladi luk;φρέσκα κρεμμυδάκια
lauch;obst;Lauch/Porree;leek/leeks;puerro/puerros;alho-francês;poireau/poireaux;porro/porri;prei;poriluk;πράσο
sellerie;obst;Stangensellerie/Sellerie;celery;apio;aipo;céleri;sedano;bleekselderij/selderij;celer;σέλινο
mais;obst;Mais/Zuckermais;sweetcorn/corn;maíz;milho;maïs;mais;maïs;kukuruz;καλαμπόκι
erbsen;obst;Erbsen;peas;guisantes;ervilhas;petits pois;piselli;erwten/doperwten;grašak;αρακάς/μπιζέλια
gruenebohnen;obst;grüne Bohnen/Bohnen grün;green beans;judías verdes;feijão-verde;haricots verts;fagiolini;sperziebonen;mahune;φασολάκια
blumenkohl;obst;Blumenkohl;cauliflower;coliflor;couve-flor;chou-fleur;cavolfiore;bloemkool;cvjetača;κουνουπίδι
kohl;obst;Kohl/Weisskohl/Weißkohl;cabbage;repollo/col;repolho/couve;chou;cavolo;kool/witte kool;kupus;λάχανο
rucola;obst;Rucola/Rauke;rocket/arugula;rúcula;rúcula;roquette;rucola;rucola;rikola;ρόκα
suesskartoffeln;obst;Süsskartoffeln/Süßkartoffeln;sweet potatoes;boniatos/batatas;batata-doce;patates douces;patate dolci;zoete aardappelen;batat;γλυκοπατάτες
kuerbis;obst;Kürbis;pumpkin/squash;calabaza;abóbora;potiron/courge;zucca;pompoen;bundeva;κολοκύθα
randen;obst;Rote Bete/Randen/Rote Rüben;beetroot/beets;remolacha;beterraba;betterave;barbabietola;rode biet/rode bieten;cikla;παντζάρια
radieschen;obst;Radieschen;radishes;rábanos;rabanetes;radis;ravanelli;radijsjes;rotkvice;ραπανάκια
ingwer;obst;Ingwer;ginger;jengibre;gengibre;gingembre;zenzero;gember;đumbir;τζίντζερ
chili;obst;Chili/Chilischote/Peperoncini;chilli/chili pepper;guindilla/chile;malagueta/piri-piri;piment;peperoncino;chilipeper/rode peper;ljuta papričica;καυτερή πιπεριά
koriander;obst;Koriander;coriander/cilantro;cilantro;coentros;coriandre;coriandolo;koriander;korijander;κόλιανδρος
minze;obst;Minze/Pfefferminze;mint;hierbabuena/menta;hortelã;menthe;menta;munt;metvica;δυόσμος
dill;obst;Dill;dill;eneldo;endro;aneth;aneto;dille;kopar;άνηθος
rosmarin;obst;Rosmarin;rosemary;romero;alecrim;romarin;rosmarino;rozemarijn;ružmarin;δεντρολίβανο
schnittlauch;obst;Schnittlauch;chives;cebollino;cebolinho;ciboulette;erba cipollina;bieslook;vlasac;σχοινόπρασο
parmesan;milch;Parmesan;parmesan;parmesano;queijo parmesão/parmesão;parmesan;parmigiano/parmigiano reggiano;Parmezaanse kaas/parmezaan;parmezan;παρμεζάνα
ziegenkaese;milch;Ziegenkäse;goat's cheese/goat cheese;queso de cabra;queijo de cabra;fromage de chèvre/chèvre;formaggio di capra;geitenkaas;kozji sir;κατσικίσιο τυρί
scheibenkaese;milch;Käsescheiben/Scheibenkäse;sliced cheese/cheese slices;queso en lonchas;queijo fatiado;fromage en tranches;formaggio a fette;plakken kaas;narezani sir/sir u listićima;τυρί σε φέτες
ricotta;milch;Ricotta;ricotta;ricotta/requesón;ricota/requeijão;ricotta;ricotta;ricotta;ricotta;ρικότα
kochsahne;milch;Kochsahne/Kochrahm;cooking cream;nata para cocinar;natas para culinária;crème de cuisine/crème légère;panna da cucina;kookroom;vrhnje za kuhanje;κρέμα μαγειρικής
hafermilch;milch;Hafermilch/Haferdrink;oat milk;bebida de avena/leche de avena;bebida de aveia;boisson à l'avoine/lait d'avoine;bevanda all'avena/latte d'avena;havermelk/haverdrink;zobeno mlijeko/napitak od zobi;ρόφημα βρώμης
sojamilch;milch;Sojamilch/Sojadrink;soy milk/soya milk;bebida de soja/leche de soja;bebida de soja;boisson au soja/lait de soja;bevanda di soia/latte di soia;sojamelk/sojadrink;sojino mlijeko;ρόφημα σόγιας/γάλα σόγιας
tofu;milch;Tofu;tofu;tofu;tofu;tofu;tofu;tofu;tofu;τόφου
vollkornbrot;brot;Vollkornbrot;wholemeal bread/whole wheat bread;pan integral;pão integral;pain complet;pane integrale;volkorenbrood;integralni kruh;ψωμί ολικής άλεσης
wraps;brot;Wraps/Tortillas;wraps/tortilla wraps;tortillas de trigo/wraps;tortilhas/wraps;wraps/tortillas;piadine/tortillas;wraps/tortilla's;tortilje;τορτίγιες
pita;brot;Pitabrot/Fladenbrot;pitta bread/pita;pan de pita;pão pita;pain pita;pane pita;pitabrood;pita kruh;πίτα για σουβλάκι
kuchen;brot;Kuchen;cake;bizcocho/pastel;bolo;gâteau;torta/dolce;cake/taart;kolač;κέικ
cracker;brot;Cracker;crackers;galletas saladas/crackers;bolachas de água e sal/crackers;crackers;cracker;crackers;krekeri;κράκερ
semmelbroesel;vorrat;Paniermehl/Semmelbrösel;breadcrumbs;pan rallado;pão ralado;chapelure;pangrattato;paneermeel;krušne mrvice;τριμμένη φρυγανιά
muesliriegel;brot;Müsliriegel;cereal bars/granola bars;barritas de cereales;barras de cereais;barres de céréales;barrette ai cereali;mueslirepen;žitne pločice;μπάρες δημητριακών
haehnchenschenkel;fleisch;Hähnchenschenkel/Pouletschenkel;chicken thighs/chicken legs;muslos de pollo;coxas de frango;cuisses de poulet;cosce di pollo;kippenbouten;pileći bataci;μπούτια κοτόπουλου
putenbrust;fleisch;Putenbrust/Truthahnbrust;turkey breast;pechuga de pavo;peito de peru;blanc de dinde;petto di tacchino;kalkoenfilet;pureća prsa;στήθος γαλοπούλας
steak;fleisch;Steak/Rindersteak;steak/beef steak;filete de ternera/bistec;bife;steak/bifteck;bistecca;biefstuk;odrezak/biftek;μοσχαρίσια μπριζόλα
lamm;fleisch;Lammfleisch/Lamm;lamb;cordero;borrego/cordeiro;agneau;agnello;lamsvlees;janjetina;αρνί
bratwurst;fleisch;Bratwurst/Grillwurst;barbecue sausages/grilling sausages;salchichas frescas;salsichas frescas;saucisses à griller/chipolatas;salsicce;braadworst;kobasice za roštilj;λουκάνικα για ψήσιμο
chorizo;fleisch;Chorizo;chorizo;chorizo;chouriço;chorizo;chorizo;chorizo;chorizo;τσορίθο
aufschnitt;fleisch;Aufschnitt/Wurstaufschnitt;cold cuts/sliced meats;fiambre/embutidos;charcutaria fatiada/charcutaria;charcuterie;affettati;vleeswaren;narezak;αλλαντικά
tintenfisch;fleisch;Tintenfisch/Calamari;squid/calamari;calamares;lulas;calamars/encornets;calamari;inktvis/calamaris;lignje;καλαμάρια
muscheln;fleisch;Miesmuscheln/Muscheln;mussels;mejillones;mexilhões;moules;cozze;mosselen;dagnje;μύδια
sardinen;fleisch;Sardinen;sardines;sardinas;sardinhas;sardines;sardine;sardines/sardientjes;srdele;σαρδέλες
dorade;fleisch;Dorade/Goldbrasse;sea bream;dorada;dourada;dorade;orata;dorade/goudbrasem;orada;τσιπούρα
raeucherlachs;fleisch;Räucherlachs;smoked salmon;salmón ahumado;salmão fumado;saumon fumé;salmone affumicato;gerookte zalm;dimljeni losos;καπνιστός σολομός
couscous;vorrat;Couscous;couscous;cuscús;cuscuz;couscous/semoule de couscous;cous cous/couscous;couscous;kus-kus;κουσκούς
gnocchi;vorrat;Gnocchi;gnocchi;ñoquis;nhoque;gnocchis;gnocchi;gnocchi;njoki;νιόκι
bruehe;vorrat;Brühe/Bouillon/Brühwürfel;stock cubes/stock/bouillon;caldo/pastillas de caldo;caldo/cubos de caldo;bouillon/cubes de bouillon;dado da brodo/brodo;bouillonblokjes/bouillon;kocka za juhu;κύβος ζωμού
sojasauce;vorrat;Sojasauce/Sojasosse;soy sauce;salsa de soja;molho de soja;sauce soja;salsa di soia;sojasaus;umak od soje;σάλτσα σόγιας
pesto;vorrat;Pesto;pesto;pesto;pesto;pesto;pesto;pesto;pesto;πέστο
tomatenmark;vorrat;Tomatenmark;tomato paste/tomato purée;tomate concentrado;concentrado de tomate;concentré de tomate;concentrato di pomodoro;tomatenpuree;koncentrat rajčice;πελτές ντομάτας
oregano;vorrat;Oregano;oregano;orégano;orégãos;origan;origano;oregano;origano;ρίγανη
paprikapulver;vorrat;Paprikapulver;paprika;pimentón;colorau;paprika;paprika;paprikapoeder;mljevena paprika;πάπρικα
zimt;vorrat;Zimt;cinnamon;canela;canela;cannelle;cannella;kaneel;cimet;κανέλα
curry;vorrat;Currypulver/Curry;curry powder;curry en polvo;caril em pó;curry en poudre;curry;kerriepoeder;curry prah;κάρι
balsamico;vorrat;Balsamico/Aceto balsamico;balsamic vinegar;vinagre balsámico/vinagre de Módena;vinagre balsâmico;vinaigre balsamique;aceto balsamico;balsamicoazijn;balzamični ocat;βαλσάμικο
bbqsauce;vorrat;Barbecuesauce/BBQ-Sauce/Grillsauce;barbecue sauce/BBQ sauce;salsa barbacoa;molho barbecue;sauce barbecue;salsa barbecue;barbecuesaus;umak za roštilj;σάλτσα μπάρμπεκιου
nussnougat;vorrat;Nuss-Nougat-Creme/Nutella/Schokoaufstrich;chocolate spread/Nutella;crema de cacao/Nutella;creme de chocolate/Nutella;pâte à tartiner/Nutella;crema spalmabile/Nutella;hazelnootpasta/Nutella;krem od lješnjaka/Nutella;πραλίνα/Nutella
erdnussbutter;vorrat;Erdnussbutter;peanut butter;crema de cacahuete;manteiga de amendoim;beurre de cacahuète;burro di arachidi;pindakaas;maslac od kikirikija;φυστικοβούτυρο
mandeln;vorrat;Mandeln;almonds;almendras;amêndoas;amandes;mandorle;amandelen;bademi;αμύγδαλα
rosinen;vorrat;Rosinen;raisins;pasas;passas;raisins secs;uvetta/uva passa;rozijnen;grožđice;σταφίδες
popcorn;vorrat;Popcorn;popcorn;palomitas;pipocas;pop-corn;popcorn;popcorn;kokice;ποπ κορν
gummibaerchen;vorrat;Gummibärchen/Fruchtgummi;gummy bears/gummies;gominolas/chuches;gomas;bonbons gélifiés/oursons;caramelle gommose/orsetti gommosi;gummibeertjes/winegums;gumeni bomboni;ζελεδάκια
kaugummi;vorrat;Kaugummi;chewing gum;chicle;pastilhas elásticas/chiclete;chewing-gum;gomma da masticare/chewing gum;kauwgom;žvakaće gume;τσίχλες
kaffeekapseln;vorrat;Kaffeekapseln;coffee capsules/coffee pods;cápsulas de café;cápsulas de café;capsules de café;capsule di caffè;koffiecups;kapsule za kavu;κάψουλες καφέ
instantkaffee;vorrat;Instantkaffee/löslicher Kaffee;instant coffee;café soluble;café solúvel;café soluble;caffè solubile;oploskoffie;instant kava/topiva kava;στιγμιαίος καφές
apfelsaft;getraenke;Apfelsaft;apple juice;zumo de manzana;sumo de maçã;jus de pomme;succo di mela;appelsap;sok od jabuke;χυμός μήλου
limonade;getraenke;Limonade/Zitronenlimonade;lemonade;limonada/refresco de limón;limonada;limonade;limonata;limonade;limunada;λεμονάδα
eistee;getraenke;Eistee;iced tea;té frío;chá gelado/ice tea;thé glacé;tè freddo;ijsthee;ledeni čaj;κρύο τσάι
tonic;getraenke;Tonic Water/Tonic;tonic water;tónica/agua tónica;água tónica;tonic/eau tonique;acqua tonica;tonic;tonik;τόνικ
sekt;getraenke;Sekt/Prosecco/Schaumwein;sparkling wine;cava/vino espumoso;espumante;vin mousseux/crémant;spumante/prosecco;mousserende wijn/cava;pjenušac;αφρώδες κρασί
rosewein;getraenke;Roséwein/Rosé;rosé wine/rosé;vino rosado;vinho rosé;vin rosé/rosé;vino rosato;roséwijn/rosé;rose vino/ružica;ροζέ κρασί
alkfreibier;getraenke;alkoholfreies Bier;alcohol-free beer/non-alcoholic beer;cerveza sin alcohol;cerveja sem álcool;bière sans alcool;birra analcolica;alcoholvrij bier;bezalkoholno pivo;μπίρα χωρίς αλκοόλ
tkgemuese;tk;Tiefkühlgemüse/TK-Gemüse;frozen vegetables;verduras congeladas;legumes congelados;légumes surgelés;verdure surgelate;diepvriesgroenten;smrznuto povrće;κατεψυγμένα λαχανικά
fischstaebchen;tk;Fischstäbchen;fish fingers/fish sticks;palitos de pescado;douradinhos;bâtonnets de poisson/panés de poisson;bastoncini di pesce;vissticks;riblji štapići;κροκέτες ψαριού
frischhaltefolie;haushalt;Frischhaltefolie/Klarsichtfolie;cling film/plastic wrap;film transparente/papel film;película aderente;film alimentaire/film étirable;pellicola trasparente;huishoudfolie/vershoudfolie;prozirna folija;μεμβράνη
gefrierbeutel;haushalt;Gefrierbeutel/Zipbeutel;freezer bags/zip bags;bolsas de congelación/bolsas zip;sacos de congelação;sacs de congélation;sacchetti per congelatore/sacchetti gelo;vriezerzakjes;vrećice za zamrzavanje;σακουλάκια καταψύκτη
servietten;haushalt;Servietten;napkins/serviettes;servilletas;guardanapos;serviettes en papier;tovaglioli;servetten;salvete;χαρτοπετσέτες
pappteller;haushalt;Pappteller/Einwegteller;paper plates;platos de papel/platos desechables;pratos de papel/pratos descartáveis;assiettes en carton;piatti di carta/piatti usa e getta;papieren bordjes;papirnati tanjuri;χάρτινα πιάτα
becher;haushalt;Einwegbecher/Plastikbecher;disposable cups/plastic cups;vasos desechables/vasos de plástico;copos descartáveis;gobelets jetables;bicchieri di plastica/bicchieri usa e getta;wegwerpbekers;jednokratne čaše;πλαστικά ποτήρια
grillkohle;haushalt;Grillkohle/Holzkohle;charcoal/barbecue charcoal;carbón vegetal/carbón para barbacoa;carvão vegetal;charbon de bois;carbonella;houtskool;drveni ugljen;κάρβουνα
anzuender;haushalt;Grillanzünder/Anzünder;firelighters/fire starters;pastillas de encendido;acendalhas;allume-feu;accendifuoco;aanmaakblokjes;potpaljivač;προσανάμματα
feuerzeug;haushalt;Feuerzeug;lighter;mechero/encendedor;isqueiro;briquet;accendino;aansteker;upaljač;αναπτήρας
streichhoelzer;haushalt;Streichhölzer/Zündhölzer;matches;cerillas;fósforos;allumettes;fiammiferi;lucifers;šibice;σπίρτα
batterien;haushalt;Batterien;batteries;pilas;pilhas;piles;pile/batterie;batterijen;baterije;μπαταρίες
allzweckreiniger;haushalt;Allzweckreiniger/Putzmittel;all-purpose cleaner;limpiador multiusos;detergente multiusos/limpa tudo;nettoyant multi-usages;detergente multiuso/sgrassatore;allesreiniger;univerzalno sredstvo za čišćenje;καθαριστικό γενικής χρήσης
weichspueler;haushalt;Weichspüler;fabric softener;suavizante;amaciador;adoucissant;ammorbidente;wasverzachter;omekšivač;μαλακτικό ρούχων
kaffeefilter;haushalt;Kaffeefilter;coffee filters;filtros de café;filtros de café;filtres à café;filtri per caffè;koffiefilters;filteri za kavu;φίλτρα καφέ
kuehlakku;haushalt;Kühlakku/Kühlelement;ice pack/freezer block;acumulador de frío/placa de hielo;acumulador de frio;pain de glace/bloc réfrigérant;siberino/ghiaccio sintetico;koelelement;rashladni uložak;παγοκύστη
mueckenstecker;haushalt;Mückenstecker/Insektenstecker;plug-in mosquito repeller;difusor antimosquitos/antimosquitos eléctrico;difusor anti-mosquitos;diffuseur anti-moustiques;diffusore antizanzare/zampirone elettrico;muggenstekker;električni odbijač komaraca;εντομοαπωθητική συσκευή
hundefutter;haushalt;Hundefutter;dog food;comida para perros;comida para cão;nourriture pour chien/croquettes pour chien;cibo per cani;hondenvoer;hrana za pse;σκυλοτροφή
katzenfutter;haushalt;Katzenfutter;cat food;comida para gatos;comida para gato;nourriture pour chat/croquettes pour chat;cibo per gatti;kattenvoer;hrana za mačke;γατοτροφή
aftersun;hygiene;After-Sun/After-Sun-Lotion;after-sun lotion/after sun;aftersun/loción para después del sol;after sun/loção pós-solar;après-soleil;doposole;aftersun;losion poslije sunčanja;after sun
lippenbalsam;hygiene;Lippenbalsam/Labello/Lippenpflege;lip balm;protector labial/bálsamo labial;protetor labial/bálsamo labial;baume à lèvres/stick à lèvres;burrocacao/balsamo labbra;lippenbalsem;balzam za usne;βάλσαμο χειλιών
rasierer;hygiene;Rasierer/Einwegrasierer;razors/disposable razors;maquinillas de afeitar/cuchillas de afeitar;lâminas de barbear/máquinas de barbear;rasoirs jetables;rasoi usa e getta;scheermesjes;brijači/jednokratni brijači;ξυραφάκια
rasierschaum;hygiene;Rasierschaum;shaving foam;espuma de afeitar;espuma de barbear;mousse à raser;schiuma da barba;scheerschuim;pjena za brijanje;αφρός ξυρίσματος
spuelung;hygiene;Haarspülung/Spülung/Conditioner;conditioner/hair conditioner;acondicionador;amaciador para cabelo/condicionador;après-shampooing;balsamo per capelli;conditioner/crèmespoeling;regenerator za kosu;μαλακτική μαλλιών
wattestaebchen;hygiene;Wattestäbchen;cotton buds/cotton swabs;bastoncillos;cotonetes;cotons-tiges;cotton fioc/bastoncini;wattenstaafjes;štapići za uši;μπατονέτες
wattepads;hygiene;Wattepads;cotton pads;discos de algodón/discos desmaquillantes;discos de algodão;disques de coton/cotons;dischetti di cotone/dischetti struccanti;wattenschijfjes;jastučići od vate;δισκάκια ντεμακιγιάζ
pflaster;hygiene;Pflaster;plasters/band-aids;tiritas/apósitos;pensos rápidos;pansements;cerotti;pleisters;flasteri;τσιρότα
slipeinlagen;hygiene;Slipeinlagen;panty liners;protegeslips;pensos diários;protège-slips;salvaslip;inlegkruisjes;dnevni ulošci;σερβιετάκια
bodylotion;hygiene;Bodylotion/Körperlotion;body lotion;crema corporal/loción corporal;creme corporal/loção corporal;lait corporel/lotion pour le corps;crema corpo;bodylotion;losion za tijelo;κρέμα σώματος
zahnseide;hygiene;Zahnseide;dental floss;hilo dental;fio dentário;fil dentaire;filo interdentale;tandzijde/flosdraad;zubni konac;οδοντικό νήμα
handgel;hygiene;Desinfektionsgel/Handdesinfektion;hand sanitizer;gel hidroalcohólico/gel desinfectante;gel desinfetante;gel hydroalcoolique;gel igienizzante/gel disinfettante;handgel/desinfecterende handgel;dezinficijens za ruke/gel za ruke;αντισηπτικό χεριών
kondome;hygiene;Kondome;condoms;preservativos/condones;preservativos;préservatifs;preservativi;condooms;prezervativi;προφυλακτικά
babynahrung;baby;Babybrei/Babynahrung;baby food;potitos/comida para bebé;papas para bebé/boiões;petits pots/aliments pour bébé;omogeneizzati/pappe per bambini;babyvoeding;dječja hrana/kašice;βρεφικές κρέμες
babymilch;baby;Säuglingsmilch/Pre-Milch/Babymilch;infant formula/baby milk;leche de fórmula/leche infantil;leite para bebé/leite de fórmula;lait infantile/lait bébé;latte per neonati/latte artificiale;flesvoeding/zuigelingenmelk;adaptirano mlijeko;βρεφικό γάλα
schwimmwindeln;baby;Schwimmwindeln;swim nappies/swim diapers;pañales de agua/pañales bañador;fraldas de banho/fraldas para água;couches de bain/couches piscine;pannolini da mare/pannolini per piscina;zwemluiers;pelene za kupanje;πάνες θαλάσσης
babysonnencreme;baby;Kindersonnencreme/Baby-Sonnencreme;kids' sun cream/baby sunscreen;protector solar infantil/crema solar para niños;protetor solar infantil/protetor solar criança;crème solaire enfant/protection solaire bébé;crema solare bambini;zonnebrand voor kinderen/kinderzonnebrand;krema za sunčanje za djecu;παιδικό αντηλιακό
`

/** Tipps zu Artikeln (nur in der Ladenansicht). Fehlt die Sprache des Betrachters, gilt Englisch. */
export const HINTS: Record<string, Partial<Record<Lang, string>>> = {
  quark: {
    de: 'Gibt es im Ausland oft nicht. Alternativen: griechischer Joghurt, Skyr, Frischkäse.',
    en: 'Often not available abroad. Alternatives: Greek yogurt, skyr, cream cheese.',
  },
  hmilch: {
    de: 'In Südeuropa ist H-Milch im Regal (nicht in der Kühlung) üblich.',
    en: 'In southern Europe UHT milk is usually on the shelf, not in the fridge.',
  },
  sahne: {
    de: 'Kochsahne und Schlagsahne sind oft getrennt beschriftet.',
    en: 'Cooking cream and whipping cream are often labelled separately.',
  },
  rohschinken: {
    de: 'Spanien: jamón serrano · Italien: prosciutto crudo · Portugal: presunto.',
    en: 'Spain: jamón serrano · Italy: prosciutto crudo · Portugal: presunto.',
  },
}

export interface Entry {
  id: string
  category: Category
  names: Record<Lang, string[]>
}

export const DICTIONARY: Entry[] = RAW.trim()
  .split('\n')
  .map((line) => {
    const [id, category, ...cols] = line.split(';')
    const names = {} as Record<Lang, string[]>
    LANGS.forEach((lang, i) => {
      names[lang] = (cols[i] ?? '').split('/').map((s) => s.trim()).filter(Boolean)
    })
    return { id, category: category as Category, names }
  })

export const BY_ID = new Map(DICTIONARY.map((e) => [e.id, e]))

/** Deutsche Namen der Abteilungen (Oberfläche: siehe categoryLabel in src/i18n.ts) */
export const CATEGORY_LABEL: Record<Category, string> = {
  obst: 'Obst & Gemüse',
  milch: 'Milchprodukte & Eier',
  brot: 'Brot & Frühstück',
  fleisch: 'Fleisch & Fisch',
  vorrat: 'Vorrat',
  getraenke: 'Getränke',
  tk: 'Tiefkühl',
  haushalt: 'Haushalt',
  hygiene: 'Drogerie',
  baby: 'Baby',
}

/** Reihenfolge der Abteilungen im Laden (grob, für alle Länder gleich im MVP). */
export const CATEGORY_ORDER: Category[] = [
  'obst',
  'brot',
  'fleisch',
  'milch',
  'vorrat',
  'getraenke',
  'tk',
  'haushalt',
  'hygiene',
  'baby',
]
