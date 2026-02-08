import express from 'express';
import path from "path";
import cors from 'cors';      
import pokemon from './schema/pokemon.js';
import { DEFAULT_LANG, transformPokemon } from './utils/language.js';
import { buildFilters, buildSort } from './utils/filters.js';
import { buildPagination, formatResponse } from './utils/response.js';

import './connect.js';

const app = express();



app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware pour parser le JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* Rend les images accessible au public */
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

/**
 * Envoie la liste des pokemons 
 * pagination possible :
 *   - page = numero de la page
 *   - limit = par combien
 * Langue :
 *   - lang = en quelle langue
 * Filtre (Dans buildFilter):
 *   - name = le nom du pokemon (/!\ Attention a la langue)
 *   - type = type du pokemon
 *   - minhp/maxhp = filtre par hp
 *   - minAttack = filtre par attaque
 */
app.get('/pokemons', async (req, res) => {
    try {
        // ========= PAGINATION =========
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // ========= LANGUE =========
        const lang = req.query.lang || DEFAULT_LANG;

        // ========= FILTRE ET TRIE =========
        const filters = buildFilters(req.query, lang);
        const sort = buildSort(req.query.sortBy, req.query.order, lang);

        // ========= APPLICATION =========
        const total = await pokemon.countDocuments(filters);  // Nombre de pokemon
        const pokemons = await pokemon.find(filters).sort(sort).skip(skip).limit(limit); // recupére les pokemons

        // Applique la bonne langue 
        const transformedPokemons = pokemons.map(poke => transformPokemon(poke, lang));
        // Creer le retour de pagination
        const pagination = buildPagination(page, total, limit);

        // Met tout dans le json
        res.json(formatResponse(transformedPokemons, lang, pagination));
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * GET /pokemons/:id
 * Récupère un pokemon spécifique par son ID
 */
app.get('/pokemons/:id', async (req, res) => {
    try {
        const poke = await pokemon.findOne({ id: req.params.id });
        if (poke) {
            const lang = req.query.lang || DEFAULT_LANG;
            const transformedPokemon = transformPokemon(poke, lang);
            res.json(transformedPokemon);
        } else {
            res.status(404).send('Pokemon not found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * POST /pokemons
 * Crée un nouveau pokemon
 * Body attendu (TOUS LES CHAMPS OBLIGATOIRES):
 * {
 *   "name": {
 *     "english": "MyPokemon",
 *     "japanese": "...",
 *     "chinese": "...",
 *     "french": "..."
 *   },
 *   "type": ["Fire"],
 *   "base": {
 *     "HP": 100,
 *     "Attack": 100,
 *     "Defense": 100,
 *     "SpecialAttack": 100,
 *     "SpecialDefense": 100,
 *     "Speed": 100
 *   }
 * }
 */
app.post('/pokemons', async (req, res) => {
    try {
        // Validation complète - TOUS les champs sont obligatoires
        const errors = [];

        // Vérification du nom (toutes les langues obligatoires)
        if (!req.body.name) {
            errors.push('Le champ "name" est obligatoire');
        } else {
            if (!req.body.name.english) errors.push('Le nom en anglais est obligatoire');
            if (!req.body.name.japanese) errors.push('Le nom en japonais est obligatoire');
            if (!req.body.name.chinese) errors.push('Le nom en chinois est obligatoire');
            if (!req.body.name.french) errors.push('Le nom en français est obligatoire');
        }

        // Vérification du type
        if (!req.body.type || !Array.isArray(req.body.type) || req.body.type.length === 0) {
            errors.push('Au moins un type est obligatoire');
        }

        // Vérification des statistiques de base (toutes obligatoires)
        if (!req.body.base) {
            errors.push('Les statistiques de base sont obligatoires');
        } else {
            if (req.body.base.HP === undefined || req.body.base.HP === null) errors.push('HP est obligatoire');
            if (req.body.base.Attack === undefined || req.body.base.Attack === null) errors.push('Attack est obligatoire');
            if (req.body.base.Defense === undefined || req.body.base.Defense === null) errors.push('Defense est obligatoire');
            if (req.body.base.SpecialAttack === undefined || req.body.base.SpecialAttack === null) errors.push('SpecialAttack est obligatoire');
            if (req.body.base.SpecialDefense === undefined || req.body.base.SpecialDefense === null) errors.push('SpecialDefense est obligatoire');
            if (req.body.base.Speed === undefined || req.body.base.Speed === null) errors.push('Speed est obligatoire');
        }

        // Si des erreurs de validation, retourner 400
        if (errors.length > 0) {
            return res.status(400).json({ 
                error: 'Données invalides',
                details: errors
            });
        }

        // Générer le prochain ID
        const lastPokemon = await pokemon.findOne().sort({ id: -1 });
        const newId = lastPokemon ? lastPokemon.id + 1 : 1;

        // Créer le nouveau pokemon avec toutes les données fournies
        const newPokemon = new pokemon({
            id: newId,
            name: {
                english: req.body.name.english,
                japanese: req.body.name.japanese,
                chinese: req.body.name.chinese,
                french: req.body.name.french
            },
            type: req.body.type,
            base: {
                HP: req.body.base.HP,
                Attack: req.body.base.Attack,
                Defense: req.body.base.Defense,
                SpecialAttack: req.body.base.SpecialAttack,
                SpecialDefense: req.body.base.SpecialDefense,
                Speed: req.body.base.Speed
            },
            image: req.body.image || `http://localhost:3000/assets/pokemons/${newId}.png`,
            cry: req.body.cry || '' // Toujours inclure le champ cry, même s'il est vide
        });

        await newPokemon.save();

        const lang = req.query.lang || DEFAULT_LANG;
        const transformedPokemon = transformPokemon(newPokemon, lang);
        
        res.status(201).json({
            message: 'Pokemon créé avec succès',
            pokemon: transformedPokemon
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erreur lors de la création du pokemon',
            details: error.message 
        });
    }
});

/**
 * PUT /pokemons/:id
 * Met à jour complètement un pokemon
 * PATCH /pokemons/:id  
 * Met à jour partiellement un pokemon
 */
app.put('/pokemons/:id', async (req, res) => {
    try {
        const poke = await pokemon.findOne({ id: req.params.id });
        
        if (!poke) {
            return res.status(404).json({ error: 'Pokemon non trouvé' });
        }

        // Mise à jour des champs fournis
        if (req.body.name) {
            poke.name = {
                english: req.body.name.english || poke.name.english,
                japanese: req.body.name.japanese || poke.name.japanese,
                chinese: req.body.name.chinese || poke.name.chinese,
                french: req.body.name.french || poke.name.french
            };
        }

        if (req.body.type) {
            poke.type = req.body.type;
        }

        if (req.body.base) {
            poke.base = {
                HP: req.body.base.HP !== undefined ? req.body.base.HP : poke.base.HP,
                Attack: req.body.base.Attack !== undefined ? req.body.base.Attack : poke.base.Attack,
                Defense: req.body.base.Defense !== undefined ? req.body.base.Defense : poke.base.Defense,
                SpecialAttack: req.body.base.SpecialAttack !== undefined ? req.body.base.SpecialAttack : poke.base.SpecialAttack,
                SpecialDefense: req.body.base.SpecialDefense !== undefined ? req.body.base.SpecialDefense : poke.base.SpecialDefense,
                Speed: req.body.base.Speed !== undefined ? req.body.base.Speed : poke.base.Speed
            };
        }

        if (req.body.image) {
            poke.image = req.body.image;
        }

        await poke.save();

        const lang = req.query.lang || DEFAULT_LANG;
        const transformedPokemon = transformPokemon(poke, lang);

        res.json({
            message: 'Pokemon mis à jour avec succès',
            pokemon: transformedPokemon
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour du pokemon',
            details: error.message 
        });
    }
});

// PATCH pour mise à jour partielle - ACCEPTE DES MISES À JOUR PARTIELLES DE NOMS
app.patch('/pokemons/:id', async (req, res) => {
    try {
        const poke = await pokemon.findOne({ id: req.params.id });
        
        if (!poke) {
            return res.status(404).json({ error: 'Pokemon non trouvé' });
        }

        // Mise à jour sélective du nom - permet de modifier seulement une langue
        if (req.body.name) {
            Object.keys(req.body.name).forEach(key => {
                if (poke.name[key] !== undefined) {
                    poke.name[key] = req.body.name[key];
                }
            });
        }

        if (req.body.type) {
            poke.type = req.body.type;
        }

        if (req.body.base) {
            Object.keys(req.body.base).forEach(key => {
                if (poke.base[key] !== undefined) {
                    poke.base[key] = req.body.base[key];
                }
            });
        }

        if (req.body.image) {
            poke.image = req.body.image;
        }

        await poke.save();

        const lang = req.query.lang || DEFAULT_LANG;
        const transformedPokemon = transformPokemon(poke, lang);

        res.json({
            message: 'Pokemon mis à jour avec succès',
            pokemon: transformedPokemon
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour du pokemon',
            details: error.message 
        });
    }
});

/**
 * DELETE /pokemons/:id
 * Supprime un pokemon
 */
app.delete('/pokemons/:id', async (req, res) => {
    try {
        const poke = await pokemon.findOne({ id: req.params.id });
        
        if (!poke) {
            return res.status(404).json({ error: 'Pokemon non trouvé' });
        }

        const lang = req.query.lang || DEFAULT_LANG;
        const deletedPokemon = transformPokemon(poke, lang);

        await pokemon.deleteOne({ id: req.params.id });

        res.json({
            message: 'Pokemon supprimé avec succès',
            pokemon: deletedPokemon
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erreur lors de la suppression du pokemon',
            details: error.message 
        });
    }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});