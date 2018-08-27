# Workflow for reproducing analysis:

1) First, run preprocessing.Rmd notebook to preprocess and construct dataset from raw files

2) Then run python (sequential/preprocessing.ipynb) to extract language features and generate specific csvs.

3) Finally, use the main R notebook (tangrams.Rmd) to make plots and conduct analyses