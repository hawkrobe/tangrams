# Function takes a countType ['unigrams', 'bigrams', 'trigrams'] and returns a table of most reduced n-gram
getMostReduced = function(countType) {
  filename <- paste0("../outputs/", countType, "Counts.csv")
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
  topWords <- cbind(getMostReduced('unigrams') %>% select(word) %>% head(size), 
                      getMostReduced('bigrams') %>% select(word) %>% head(size),
                      getMostReduced('trigrams') %>% select(word) %>% head(size))
  
  rownames(topWords) <- paste0(paste('#', seq(size), sep = ''))
  colnames(topWords) <- c('unigrams', 'bigrams', 'trigrams')
  topWords.toPrint = xtable(topWords, label = 'tab:words',
                            caption = 'Top 10 unigrams and bigrams with the highest reduction')
  align(topWords.toPrint) <- paste0(c("|r||", rep('l|', 3)), collapse = "")
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
  num = d$m_across - d$m_within
  denom = sqrt(.5 * (d$v_across + d$v_within))
  return(num / denom)  
}

# note: cor expects featurs to be in columns so we transpose
get_sim_matrix = function(df, F_mat, method = 'cosine') {
  feats = F_mat[df$feature_ind,]
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
  #cat('\r', id, '/100')
  make_within_df(M_mat, F_mat, method) %>%   
    filter(rep2 == rep1 + 1) %>%
    group_by(rep1, rep2) %>%
    tidyboot_mean(col = sim, na.rm = T, nboot = nboot) %>%
    unite(repdiff, rep1, rep2, sep = '->') %>%
    mutate(sample_id = id) %>%
    rename(IV = repdiff)
}

compute_within_drift <- function(M_mat, F_mat, id, 
                                 method = 'cor', nboot = 1) {
  #cat('\r', id, '/100')
  make_within_df(M_mat, F_mat, method) %>%   
    filter(rep1 == 1) %>%
    group_by(rep1, rep2) %>%
    tidyboot_mean(col = sim, na.rm = T, nboot = nboot) %>%
    unite(repdiff, rep1, rep2, sep = '->') %>%
    mutate(sample_id = id) %>%
    rename(IV = repdiff)
}

make_across_df <- function(M_mat, F_mat, method) {
  M_mat %>%
    group_by(target, repetition) %>%
    do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = method),
                          as.character(.$gameID)))
}

compute_across_similarity <- function(M_mat, F_mat, id,
                                      method = 'cor', nboot = 1) {
  make_across_df(M_mat, F_mat, 'cor') %>%
    group_by(repetition) %>%
    tidyboot_mean(col = sim, nboot, na.rm = T) %>%
    mutate(sample_id = id) %>%
    rename(IV = repetition)
}

compute_within_vs_across <- function(M_mat, F_mat) {
  withinGames <- M_mat %>%
    group_by(target, gameid) %>%
    do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = 'cosine'),
                          .$repetition)) %>%
    summarize(empirical_stat = mean(sim, na.rm = T)) %>%
    filter(!is.na(empirical_stat)) %>%
    mutate(source = 'within')
  
  acrossGames <- M_mat %>%
    group_by(target) %>%
    unite(combo_id, gameid, repetitionNum) %>%
    do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = 'cosine'),
                          .$combo_id)) %>%
    separate(dim1, into = c('gameid1', 'repnum1'), sep = '_') %>%
    separate(dim2, into = c('gameid2', 'repnum2'), sep = '_') %>%
    filter(gameid1 != gameid2) 
  
  return(acrossGames %>%
           group_by(target, gameid1) %>%
           summarize(empirical_stat = mean(sim, na.rm =T)) %>%
           rename(gameid = gameid1) %>%
           mutate(source = 'across') %>%
           bind_rows(withinGames))
}

scramble_within <- function(M_mat, F_mat) {
  # scrambles repetition
  return(M_mat %>% group_by(target, repetitionNum) %>% 
           mutate(gameID = sample(gameID)) %>% 
           ungroup() %>%
           arrange(gameID, target, repetitionNum))
}

scramble_across <- function(M_mat, F_mat) {
  return(M_mat %>% group_by(target, gameID) %>%
           mutate(repetition = sample(repetition, size = length(repetition))) %>%
           ungroup() %>%
           arrange(gameID, target, repetition))
}

compute_permuted_estimates <- function(M_mat, F_mat, analysis_type, num_permutations) {
  # Note that tidy won't work with lmerTest
  pb <- progress_estimated(num_permutations)
  return(map_dbl(seq_len(num_permutations), ~{
    pb$tick()$print()
    if(analysis_type == 'across') {
      scrambled <- scramble_across(M_mat, F_mat) %>%
        group_by(target,repetition) %>%
        do(flatten_sim_matrix(get_sim_matrix(., F_mat, method = 'cor'), .$gameID)) %>%
        unite(col = 'gamepair', dim1, dim2) %>%
        mutate(rep = repetition) 
    } else {
      scrambled <- scramble_within(M_mat, F_mat) %>%
        make_within_df(F_mat, 'cosine') %>% 
        mutate(rep = rep2)
      if(analysis_type == 'drift') {
        scrambled <- scrambled %>% filter(rep1 == 1)
      } else if(analysis_type == 'within') {
        scrambled <- scrambled %>% filter(rep2 == rep1 + 1)
      } else {
        stop('unknown analysis_type')
      }
    }
    
    model.in <- scrambled %>% 
      mutate(sample_id = 1) %>%
      split(.$sample_id)
    if(analysis_type == 'across') {
      model.out <- model.in %>% map(~ lmer(sim ~ poly(rep,2) + (1 | target), data = .))
    } else {
      model.out <- model.in %>% map(~ lmer(sim ~ poly(rep,2) + (1 | gameID) + (1 | target), data = .))
    }
    model.out %>%
      map(~ (tidy(., effects = 'fixed') %>% filter(term == 'poly(rep, 2)1'))$estimate) %>%
      unlist()
  }))
}

combine_empirical_and_baselines <- function(M_mat, F_mat, analysis_type, num_permutations) {
  if(analysis_type == 'drift') {
    f <- compute_within_drift
  } else if (analysis_type == 'within') {
    f <- compute_within_convergence
  } else if (analysis_type == 'across') {
    f <- compute_across_similarity
  } else {
    stop('unknown analysis type')
  }
  empirical <- f(M_mat, F_mat, 'empirical', method = 'cosine', nboot = 100) %>% 
     select(-mean, -n) %>% mutate(sample_id = 'empirical')
  pb <- progress_estimated(num_permutations)
  baseline <- map_dfr(seq_len(num_permutations), ~{
    pb$tick()$print()
    if(analysis_type == 'across'){
      scrambled <- M_mat %>% scramble_across() 
    } else{
      scrambled <- M_mat %>% scramble_within()
    }
    f(scrambled, F_mat, .x, method = 'cosine') # this passes in the iteration number
  }) 
  
  baseline.out <- baseline %>%
    group_by(IV) %>%
    summarize(`ci_upper`=quantile(empirical_stat, probs=0.975),
              `ci_lower`=quantile(empirical_stat, probs=0.025),
              `empirical_stat`=quantile(empirical_stat, probs=0.5)) %>%
    mutate(sample_id = 'baseline')
  rbind(empirical, baseline.out)
}
