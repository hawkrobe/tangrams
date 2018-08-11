from nltk.tokenize import word_tokenize
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.tree import Tree

LEMMATIZER = WordNetLemmatizer()

def stanford_pos(text):
    """
    Parameters
    ----------
    text : str
       CoreNLP handles all tokenizing, at the sentence and word level.
       
    Returns
    -------
    list of tuples (str, str)
       The first member of each pair is the word, the second its POS tag.          
    """
    try:
        ann = nlp.annotate(
            text, 
            properties={'annotators': 'pos', 
                        'outputFormat': 'json'})
        lemmas = []
        for sentence in ann['sentences']:
            for token in sentence['tokens']:
                lemmas.append((token['word'], token['pos']))
    except Exception as e:
        print(text + ": cannot parse")
        lemmas = []
    return lemmas
    
def stanford_parsetree(text):
    """
    Parameters
    ----------
    text : str
       CoreNLP handles all tokenizing, at the sentence and word level.
       
    Returns
    -------
    list of tuples (str, str)
       The first member of each pair is the word, the second its POS tag.          
    """
    try:
        ann = nlp.annotate(
            text, 
            properties={'annotators': 'parse', 
                        'outputFormat': 'json'})
        lemmas = []
        for sentence in ann['sentences']:
            lemmas.append(sentence['parse'])
    except Exception as e:
        print(text,": cannot parse")
        lemmas = []
    return lemmas
    
def is_comp_sup(word, pos, tags, check_lemmatizer=False):
    """
    Parameters
    ----------
    word, pos : str, str
        The lemma.
    
    tags : iterable of str
        The tags considered positive evidence for comp/sup morphology.
       
       
    check_lemmatizer : bool
        If True, then if the `pos` is in `tags`, we also check that
        `word` is different from the lemmatized version of word
        according to WordNet, treating it as an adjective. This 
        could be used to achieve greater precision, perhaps at the
        expense of recall.
       
    Returns
    -------
    bool       
    """
    if pos not in tags:
        return False
    if check_lemmatizer and LEMMATIZER.lemmatize(word, 'a') == word:
        return False
    return True

def is_noun(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'NN', 'NNS', 'NNP', 'NNPS'}, check_lemmatizer=check_lemmatizer)

def is_prep(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'IN'}, check_lemmatizer=check_lemmatizer)

def is_verb(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'MD', 'VB', 'VBZ', 'VBP', 'VBD', 'VBN', 'VBG'}, check_lemmatizer=check_lemmatizer)

def is_det(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'DT', 'WDT'}, check_lemmatizer=check_lemmatizer)

def is_pronoun(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'PRP', 'PRP$', 'WP', 'WP$'}, check_lemmatizer=check_lemmatizer)

def is_adjective(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'JJ', 'JJR', 'JJS'}, check_lemmatizer=check_lemmatizer)

def is_adverb(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'RB', 'RBR', 'RBS', 'RP', 'WRB'}, check_lemmatizer=check_lemmatizer)

def is_num(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'CD'}, check_lemmatizer=check_lemmatizer)

def is_other(word, pos, check_lemmatizer=False):
    return is_comp_sup(
        word, pos, {'EX', 'FW', 'LS', 'PDT', 'POS', 'SYM', 'TO', 'UH'}, check_lemmatizer=check_lemmatizer)

def get_np_words(tree):
    """Finds NP (nounphrase) leaf nodes of a chunk tree."""
    for subtree in tree.subtrees(filter = lambda t: t.label()=='NP'):
        yield subtree.leaves()
  
def tag_count(treestring, tag) :
    """Counts occurrences of `tag` in given tree"""
    count = 0
    tree = Tree.fromstring(treestring)
    for subtree in tree.subtrees(filter = lambda t: t.label()==tag):
        count += 1
    return count 

def pp_count(treestring) :
    """Counts PPs in tree"""
    return tag_count(treestring, 'PP')

def sbar_count(treestring) :
    """Counts subclauses in tree"""
    return tag_count(treestring, 'SBAR')

def cc_count(treestring) :
    """Counts subclauses in tree"""
    return tag_count(treestring, 'CC')