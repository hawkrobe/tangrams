# Quick access

We have compiled html pages rendering our results directly from our analysis code for ease of access:

* [Section 3](https://htmlpreview.github.io/?https://github.com/hawkrobe/tangrams/blob/master/analysis/rnotebooks/structure.html)
* [Section 4](https://htmlpreview.github.io/?https://github.com/hawkrobe/tangrams/blob/master/analysis/rnotebooks/content.html)

# Organization

Because Python's NLP tools (particularly SpaCy) are stronger than R's at the time of writing, we used a mix of the two langauges.

* *jupyternotebooks* contains three Python notebooks that extract syntactic features, semantic features, and distinctiveness features from the corpus and write out csvs with the resulting features.

* *rnotebooks* contains a preprocessing notebook generating the corpus from individual raw text files, and two analysis notebook corresponding to Section 3 and Section 4 of the paper. These notebooks are organized roughly in the order that results appear in the text.

* *utils* contains convenient helpers for both R and python

* *outputs* is where we write the intermediate features and read them back in from.

# Workflow for reproducing analysis:

1) First, open and run `rnotebooks/preprocessing.Rmd` notebook to preprocess and construct dataset from raw files (stored in `/data/`

2) Then run the python notebooks (`jupyternotebooks/content_analyses.ipynb`, `jupyternotebooks/structure_analyses.ipynb`, and `jupyternotebooks/PMI_analyses.ipynb`) to extract language features and generate specific csv's. Note that these may require you to install the python packages that are imported at the top of the file: to install SpaCy and the SpaCy models, follow the guide [here](https://spacy.io/usage).

3) Finally, use the main R notebooks (`rnotebooks/structure.Rmd` and `rnotebooks/content.Rmd`) to make plots and reproduce the analyses reported in the paper.
