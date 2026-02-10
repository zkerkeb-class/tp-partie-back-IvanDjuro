import { getValidLanguage } from './language.js'; // ← Import ici aussi

/**
 * Créer le format de pagination
 * @param {*} page 
 * @param {*} total 
 * @param {*} limit 
 * @returns le format de pagination
 */
export const buildPagination = (page, total, limit) => {
    const totalPages = Math.ceil(total / limit);
    
    return {
        currentPage: page,
        totalPages,
        totalPokemons: total,
        pokemonsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
};


export const formatResponse = (data, lang, pagination = null) => {
    const response = {
        data,
        language: getValidLanguage(lang) // Utilise la fonction importée
    };

    if (pagination) response.pagination = pagination;

    return response;
};