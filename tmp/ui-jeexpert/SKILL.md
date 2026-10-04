---
name: ui-jeexpert
description: Concevoir ou modifier les interfaces JEEXPERT et JXP ERP selon les chartes de marque et d’interface fournies. Utiliser pour les écrans, composants, navigation, formulaires, tableaux et états de cette marque, ou lorsque UI JEEXPERT est explicitement demandé.
---

# UI JEEXPERT

Créer des interfaces JEEXPERT claires, fiables et orientées vers l’accompagnement des étudiants. Pour JXP ERP, privilégier la lisibilité des dossiers, paiements, documents et actions de suivi.

## Références et périmètre

- Lire [les règles de marque](references/brand.md) pour les logos, couleurs, typographie et messages.
- Lire [les règles ERP](references/erp.md) pour un écran ou composant applicatif.
- Les PDF d’origine sont conservés dans `references/JEEXPERT_Brand_Guidelines.pdf` (8 pages) et `references/JXP_ERP_Charte_Interface.pdf` (9 pages). Les consulter visuellement pour reproduire une composition précise.
- La charte ERP est une **proposition d’octobre 2026**. Ses dimensions sont des bases de conception, ses données sont fictives et ses points de rupture sont adaptables au contenu.
- Appliquer les préférences explicites de l’utilisateur avant les chartes. Modifier uniquement le périmètre demandé ; ne pas transformer une modification locale en refonte générale.

## Décisions visuelles essentielles

- Bleu profond `#173B65` pour navigation et actions principales ; blanc pour les surfaces ; azur `#80C4EA` pour accents et contours, pas comme couleur de texte essentiel sur blanc.
- Poppins : titres SemiBold, boutons Medium, corps Regular. Le logo est un dessin original : employer les fichiers fournis, jamais un mot retapé en Poppins.
- Grille de 4 px, espaces 4/8/12/16/24/32/48 px ; rayons 8 px pour contrôles, 12 px pour cartes et modales.
- Une action principale par zone. Afficher libellés, unités, états de chargement et erreurs. Les statuts doivent être compréhensibles sans la couleur.
- Réutiliser les composants et variables existants. Adapter leur correspondance aux tokens de la charte dans le périmètre demandé ; éviter des valeurs concurrentes dispersées.

## Assets disponibles

Les fichiers sont dans `assets/` et peuvent être copiés dans le projet cible :

- `01_logo_blue.png` : wordmark bleu.
- `02_logo_white.png` : wordmark blanc présenté sur bleu.
- `03_icon_J.png` : J blanc avec accent azur sur bleu.
- `04_logo_slogan.png` : wordmark avec slogan.
- `11_app.png` : mockup d’application ; illustration, pas un fichier d’icône prêt à publier.

Vérifier la transparence et les marges réelles avant intégration. Ne pas supposer qu’un PNG est transparent, vectoriel ou déjà adapté à un favicon. Ne pas étirer, recolorer, tourner, ombrer ou redessiner les logos pour une intégration ordinaire.

## Intégration dans le dashboard JEEXPERT

Quand le projet courant est le dashboard React/Vite/Tailwind connu :

- Navigation et titres : `src/lib/navigation.js` ; sidebar et header : `src/components/layout/`.
- Tokens : `src/index.css` et `tailwind.config.js`. Leur palette actuelle peut différer de la nouvelle charte : ne pas prétendre que la migration est déjà faite.
- Assets déjà disponibles sous `public/images/jeexpert/`. Employer les URL `/images/jeexpert/<fichier>` lorsqu’ils sont présents.
- Le menu est en anglais et la rubrique étudiants s’appelle **Students**. Les exemples français des PDF n’imposent pas une traduction de l’app. Préserver la langue existante ailleurs sauf demande explicite.
- Préserver les contrôles d’accès et les traitements de données lors des changements visuels. Les nouveaux écrans de démonstration n’autorisent pas la création de comptes ou la modification d’Airtable.

Dans un autre projet, découvrir ses composants et points d’entrée plutôt que supposer ces chemins.

## Vérification de l’interface

Vérifier les états concernés : normal, survol, focus, désactivé, chargement, erreur et vide. Tester les noms longs, montants et listes denses, puis les dispositions desktop et mobile. Contrôler les contrastes réels et la navigation clavier, y compris focus et fermeture des modales. Exécuter le build ou les contrôles appropriés au projet ; n’annoncer une vérification visuelle que si elle a été effectuée.
