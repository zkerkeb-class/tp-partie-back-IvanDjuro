
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
  origin: 'http://localhost:5173'
}));

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
app.get('/', async (req, res) => {
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

app.get('/:id', async (req, res) => {
    try {
        const poke = await pokemon.findOne({ id: req.params.id });
        if (poke) {
            res.json(poke);
        } else {
            res.status(404).send('Pokemon not found');
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});