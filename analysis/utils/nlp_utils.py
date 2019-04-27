#from symspellpy.symspellpy import SymSpell, Verbosity 
from collections import defaultdict
from IPython.display import clear_output
import os 
import json
import numpy as np
import pandas as pd

def get_feats(d_in, docs_emb, nlp) :
    d = d_in.drop(d_in.columns.difference(['gameid', 'intendedName', 'repetitionNum', 'text', 'correct']), axis=1)
    meta = pd.DataFrame(columns = ['gameid',  'intendedName','repetitionNum', 'correct', 'is_nan'])
    raw_avg_feats = np.array([]).reshape(0, 300)
    weighted_feats = np.array([]).reshape(0, 300)

    for i, row in d.iterrows() :
        null_embedding = np.full((1,300), np.nan)

        # sometimes we have a missing row and we want to put in NANs so it's handled properly when taking means
        if pd.isna(row['text']) :
            raw_avg_embedding = null_embedding
            weighted_embedding = null_embedding
            is_nan = True
        else :
            weighted_embedding = docs_emb[i,]
            local_embedding = np.array([]).reshape(0, 300)
            for token in row['text'] :
                if token.pos_ in ['NOUN', 'VERB', 'ADJ', 'ADV'] and token.has_vector :
                    if token.lemma in nlp.vocab :
                        local_embedding = np.vstack((local_embedding, nlp.vocab[token.lemma].vector))
                    else :
                        local_embedding = np.vstack((local_embedding, token.vector))

            is_nan = local_embedding.size == 0
            if is_nan :
                raw_avg_embedding = null_embedding
            else :
                raw_avg_embedding = np.nanmean(local_embedding, axis = 0)
        new_row = list(row[:4]) + [is_nan]
        new_df = pd.DataFrame([new_row], columns = ['gameid',  'intendedName', 'repetitionNum', 'correct', 'is_nan'])
        meta = meta.append(new_df, ignore_index=True)
        raw_avg_feats = np.vstack((raw_avg_feats, raw_avg_embedding))
        weighted_feats = np.vstack((weighted_feats, weighted_embedding))
    return meta, raw_avg_feats, weighted_feats

def write_json(d, filename) :
    with open(filename, 'w') as f:
        json.dump(d, f)
        
def read_json(filename) :
    with open(filename) as f:
        return json.load(f)
    
def building_spell_correction_dictionary(game_data, uber_vocabulary, special_symbols):
    ''' Will search for all words of game_data that are not in the uber_vocabulary neither are special symbols. It will prompt the user with an automated spell-checked proposal and allow him to give an alternative. Also, if an old_dictionary is provided, mispelled words that exist on it will not be prompted to the user.
    Note: A) For the purposes of the language-3d-context project, if the user is not certain about the speell-correction that must be applied they must provide the token: `<UKN>`. 
    It is important to not leave a word that is NOT in the uber_vocabulary without converting it into a word that is in the dictionary, or to <UKN>.    
    B) It is ok to map a misspelled token to multiple ones: 'youthinK -> you think'.
    
    TODO-J: Force correction to be in uber-dictionary (If many words -> use split() and verify each one is the dictionary).
    '''
    # initial capacity, max_edit_distance_dictionary, prefix_length
    sym_spell = SymSpell(83000, 2, 7)
    dictionary_path = os.path.join("./frequency_dictionary_en_82_765.txt")

    term_index = 0  # column of the term in the dictionary text file
    count_index = 1  # column of the term frequency in the dictionary text file
    assert(sym_spell.load_dictionary(dictionary_path, term_index, count_index))

    old_dictionary = read_json(os.path.join("./spell_correction.json")) 

    missed_words, missed_words_with_context = words_not_in_language(game_data, uber_vocabulary, special_symbols)
    if old_dictionary is not None:   # Use the old dictionary.
        missed_words_temp = missed_words.copy()
        for m in missed_words:
            if m in old_dictionary:
                del missed_words_with_context[m]
                missed_words_temp.remove(m)
        missed_words = missed_words_temp
    
    print('Words that neeed spell-check.', len(missed_words))
    
    corrector = old_dictionary.copy()
    for m in missed_words:    
        print(m, missed_words_with_context[m])
        max_edit_distance_lookup = 10
        _s = sym_spell.lookup(m, max_edit_distance_lookup)
        s = _s[0].term if _s else '<no suggestion>'
        print(s, s in uber_vocabulary)
        
        ans = input('Do you like the proposed correction(y/n)?\n')
        
        while ans not in ['n', 'y']:
            ans = input('Do you like the proposed correction(y/n)?\n')
        
        if ans == 'n':
            while True:
                ans = input('Give your alternative.\n')                
                print(ans, 'in uber vocab?:', ans in uber_vocabulary)
                
                ok = input('ok (y/n)?\n')
                clear_output()
                if ok == 'y':
                    corrector[m] = ans
                    write_json(corrector, './spell_correction.json')
                    break
        else:
            corrector[m] = s
            write_json(corrector, './spell_correction.json')


def words_not_in_language(game_data, language, special_tokens):
    '''
    Args:
        language: dict/set keys of which are the words that form the language model.
        special_tokens: set with words marking special meaning e.g. <DIA>, <UKN>.
    Returns:
        missed_words: missing words.
        missed_words_with_context: the entire sentece which had the missing word.
    '''    
    missed_words = set()
    missed_words_with_context = defaultdict(list)
    text = game_data['text']
    for sentence in text:
        which = []
        for word in sentence:      
            if word.lower_ not in language and word not in special_tokens:                
                missed_words.add(word.lower_)
                which.append(word.lower_)

        for w in which:
            missed_words_with_context[w].append(sentence)
    return missed_words, missed_words_with_context