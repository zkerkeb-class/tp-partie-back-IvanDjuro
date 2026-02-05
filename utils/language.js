/**
 * Permet de gérer la partie langue de l'application 
 */
export const VALID_LANGS = ['english', 'french', 'japanese', 'chinese'];
export const DEFAULT_LANG = 'english';

/**
 * Si la langue n'existe pas ça retourne la par default
 * @param {*} lang 
 * @returns langue valide
 */
export const getValidLanguage = (lang) => {
    return VALID_LANGS.includes(lang) ? lang : DEFAULT_LANG;
};

export const transformPokemon = (poke, lang) => {
    const selectedLang = getValidLanguage(lang);
    
    return {
        id: poke.id,
        name: poke.name[selectedLang],
        type: poke.type,
        base: poke.base,
        image: poke.image,
        _id: poke._id
    };
};