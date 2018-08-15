# Workflow for reproducing analysis:

1) We first run a preprocessing pipeline in python (sequential/preprocessing.ipynb) to extract language features and generate csvs.

2) We then use the R notebook (tangrams.Rmd) to make plots and conduct several additional analyses that don't depend on nlp