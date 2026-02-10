import { getValidLanguage } from './language.js'; // ← Import ici

/**
 * Créer les filtres pour la recherche
 * @param {*} query 
 * @param {*} lang 
 * @returns liste de filtre
 */
export const buildFilters = (query, lang) => {
    const filters = {};
    const selectedLang = getValidLanguage(lang); // ← Utilise la fonction importée

    // ========= NOM =========
    if (query.name) {
        filters[`name.${selectedLang}`] = new RegExp(query.name, 'i');
    }

    // ========= TYPE =========
    if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        filters.type = { $in: types };
    }

    // ========= HP =========
    if (query.minHP) filters['base.HP'] = { $gte: parseInt(query.minHP) };
    if (query.maxHP) filters['base.HP'] = { ...filters['base.HP'], $lte: parseInt(query.maxHP) };

    // ========= Attack =========
    if (query.minAttack) filters['base.Attack'] = { $gte: parseInt(query.minAttack) };

    return filters;
};

/**
 * Créer un type de tri
 * @param {*} query 
 * @param {*} lang 
 * @returns liste de tri
 */
export const buildSort = (sortBy, order, lang) => {
    const selectedLang = getValidLanguage(lang);

    // Si c'est desc alors -1 sinon c'est 1
    const sortOrder = order === 'desc' ? -1 : 1;
    const sort = {};

    switch(sortBy) {
        case 'name': sort[`name.${selectedLang}`] = sortOrder; break;
        case 'hp': sort['base.HP'] = sortOrder; break;
        case 'attack': sort['base.Attack'] = sortOrder; break;
        case 'defense': sort['base.Defense'] = sortOrder; break;
        case 'speed': sort['base.Speed'] = sortOrder; break;
        case 'id': sort['id'] = sortOrder; break;
        default: sort.id = 1;
    }

    return sort;
};