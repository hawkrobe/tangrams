# Workflow for reproducing analysis:

1) Run tagTangrams.R to annotate messages with the tangrams they refer to

2) Run all the code blocks in preprocessing.ipynb to generate several csvs (it's a lot easier to use nltk than R libraries)

3) Run the code in tangramResults.Rmd to make plots and do several additional analyses that don't depend on nlp