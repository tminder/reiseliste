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
