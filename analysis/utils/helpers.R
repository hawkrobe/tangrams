library(Rfast)

########################

# whiten takes a matrix of features and z-scores within feature dimensions
channel_norm <- function(feats) {
  feat_centroid <- Rfast::colmeans(feats, parallel = T)
  feat_sd <- Rfast::colVars(feats, std = T, parallel = T)
  feat_sd <- ifelse(feat_sd == 0, 1e-5, feat_sd)
  return(t(apply(feats, 1, function(x) {(x - feat_centroid)/feat_sd})))
} 

# whitenF does some jiu jitsu to build a new F matrix with the whitened values
# note: the cbind(...) step is super slow (presumably because it has to concatenate
# all these data.frames with 4000 rows each?) 
# may be able to directly index F_out for each group instead of concatenating and then
# setting... 
normF <- function(M_mat, F_mat, how) {
  if (how == 'by_target') {
    grouped_M <- M_mat %>% group_by(target, repetition)
  } else {
    stop(paste0('whitenF not supported for ', how))
  }

  F_out <- matrix(data = NA, nrow = dim(F_mat)[1], ncol = dim(F_mat)[2])
  F.df <- grouped_M %>%
    do(cbind(feature_ind = .$feature_ind, repetition = .$repetition, 
             as.data.frame(channel_norm(F_mat[.$feature_ind,])))) %>%
    ungroup() %>%
    arrange(feature_ind) 
  F_out[F.df$feature_ind,] <- data.matrix(F.df %>% select(starts_with('V')))
  return(F_out)
}

# note: cor expects featurs to be in columns so we transpose
get_sim_matrix = function(df, F_mat, normalize = F, method = 'cor') {
  feats = (if(normalize) channel_norm(F_mat[df$feature_ind,]) 
           else F_mat[df$feature_ind,])

  if(method == 'cor') {
    return(cor(t(feats), method = 'pearson'))
  } else if (method == 'euclidean') {
    return(as.matrix(dist(feats, method = 'euclidean')))
  } else {
    stop(paste0('unknown method', method))
  }
}

average_sim_matrix <- function(cormat) {
  ut <- lower.tri(cormat)
  return(mean(cormat[ut]))
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
    filter(rep1 == 0) %>%
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
    tidyboot_mean(col = sim, nboot) %>%
    mutate(sample_id = id)
}
