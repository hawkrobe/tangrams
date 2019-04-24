library(Rfast)

# Function takes a countType ['unigrams', 'bigrams', 'trigrams'] and returns a table of most reduced n-gram
getMostReduced = function(countType) {
  filename <- paste0("outputs/", countType, "Counts.csv")
  return(read_csv(filename, col_names = T, col_types = 'cici') %>%
           group_by(word, repetitionNum) %>%
           summarize(count = sum(count)) %>%
           rowwise() %>%
           mutate(repetitionNum = paste0("rep", repetitionNum, collapse = "")) %>%
           spread(repetitionNum, count) %>%
           mutate(diffSize = rep1 - rep6,
                  diffPct = (rep1 - rep6)/rep1) %>%
           arrange(desc(diffSize))) 
}

makeNGramTable = function(size) {
  topWords <- t(cbind(getMostReduced('unigrams') %>% select(word) %>% head(size), 
                      getMostReduced('bigrams') %>% select(word) %>% head(size),
                      getMostReduced('trigrams') %>% select(word) %>% head(size)))
  
  colnames(topWords) <- paste0(paste('#', seq(size), sep = ''))
  rownames(topWords) <- c('unigrams', 'bigrams', 'trigrams')
  topWords.toPrint = xtable(topWords, label = 'tab:words',
                            caption = 'Top 10 unigrams and bigrams with the highest reduction')
  align(topWords.toPrint) <- paste0(c("|r||", rep('l|', size)), collapse = "")
  print(topWords.toPrint, floating.environment = "table*", comment=F, table.placement = 't')
}

mytheme <- function(base_size) {
  theme_few(base_size = base_size, base_family = "") %+replace% 
    theme(
      # rect = element_rect(fill = "transparent"), # all rectangles
      # text = element_text(color = "white"), # all lines
      axis.title = element_text(color = "white"),
      axis.text = element_text(color = "white"),
      axis.ticks = element_line(color = 'white'),
      axis.line = element_line(colour = "white"),      
      legend.background = element_rect(fill = "transparent"), # get rid of legend bg
      legend.box.background = element_rect(fill = "transparent"), # get rid of legend panel bg
      plot.background = element_blank(), #element_rect(fill = "transparent"),
      panel.background = element_blank(),
      panel.border = element_blank(),
      aspect.ratio = .5
    ) 
}

dprime = function(df_in) {
  d <- df_in %>% 
    group_by(source) %>%
    summarize(m = mean(empirical_stat), v = var(empirical_stat)) %>%
    gather(quantity, val, m, v) %>%
    unite(source,quantity, source) %>%
    spread(source, val)
  return (d$m_across - d$m_within)/sqrt(.5 * (d$v_across + d$v_within))    
}

# note: cor expects featurs to be in columns so we transpose
get_sim_matrix = function(df, F_mat, normalize = F, method = 'cor') {
  feats = (if(normalize) channel_norm(F_mat[df$feature_ind,]) 
           else F_mat[df$feature_ind,])
  if(method == 'cor') {
    return(cor(t(feats), method = 'pearson'))
  } else if (method == 'euclidean') {
    return(as.matrix(dist(feats, method = 'euclidean')))
  } else if (method == 'cosine') {
    return(as.matrix(lsa::cosine(t(feats))))
  } else {
    stop(paste0('unknown method', method))
  }
}

flatten_sim_matrix <- function(cormat, ids) {
  ut <- upper.tri(cormat)
  data.frame(
    dim1 = ids[row(cormat)[ut]],
    dim2 = ids[col(cormat)[ut]],
    sim  = as.numeric(cormat[ut])
  ) %>%
    mutate(dim1 = as.character(dim1),
           dim2 = as.character(dim2))
}

make_within_df <- function(M_mat, F_mat, method) {
  M_mat %>%
    group_by(gameID, target) %>%
    do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = method),
                          .$repetition)) %>%
    mutate(rep1 = as.numeric(dim1), 
           rep2 = as.numeric(dim2)) 
}

compute_within_convergence <- function(M_mat, F_mat, id, 
                                       method = 'cor', nboot = 1) {
  cat('\r', id, '/100')
  make_within_df(M_mat, F_mat, method) %>%   
    filter(rep2 == rep1 + 1) %>%
    group_by(rep1, rep2) %>%
    tidyboot_mean(col = sim, na.rm = T, nboot = nboot) %>%
    unite(`rep diff`, rep1, rep2, sep = '->') %>%
    mutate(sample_id = id)
}

compute_within_drift <- function(M_mat, F_mat, id, 
                                 method = 'cor', nboot = 1) {
  cat('\r', id, '/100')
  make_within_df(M_mat, F_mat, method) %>%   
    filter(rep1 == 1) %>%
    group_by(rep1, rep2) %>%
    tidyboot_mean(col = sim, na.rm = T, nboot = nboot) %>%
    unite(`rep diff`, rep1, rep2, sep = '->') %>%
    mutate(sample_id = id)
}

make_across_df <- function(M_mat, F_mat, method) {
  M_mat %>%
    group_by(target, repetition) %>%
    do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = method),
                          as.character(.$gameID)))
}

compute_across_similarity <- function(M_mat, F_mat, id,
                                      method = 'euclidean', nboot = 1) {
  cat('\r', id, '/100')
  make_across_df(M_mat, F_mat, method) %>%
    group_by(repetition) %>%
    tidyboot_mean(col = sim, nboot, na.rm = T) %>%
    mutate(sample_id = id)
}
