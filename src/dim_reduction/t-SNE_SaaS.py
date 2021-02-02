from flask import Flask
from flask import request
from flask import jsonify

app = Flask(__name__)

import logging as log
log.getLogger().setLevel(log.INFO)
import json
import sys
import numpy as np
np.set_printoptions(precision=2, threshold=sys.maxsize)
import pandas as pd
import sklearn.datasets
from sklearn.manifold import TSNE
from sklearn.manifold import MDS
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import matplotlib.patheffects as PathEffects
from sklearn import preprocessing
import seaborn as sns

import constant

### FUNCTIONS DEFINITION
def row_numbers(filepath):
    n = []
    with open(filepath) as f:
        for i, l in enumerate(f):
            n.append(i)
    return n
###

@app.route('/dim-reduction', methods = ['POST'])
def dim_reduction():
    ### DATASET LOADING
    rowNums = row_numbers(constant.DATASET_PATH)
    # log.info('rowNums = ', rowNums)
    selRowNumsDict = request.json
    # log.info('selRowNumsDict = ' + str(selRowNumsDict))
    rowsToSkip = list(set(rowNums) - set(selRowNumsDict["selRowNums"]))
    # log.info('rowsToSkip = ', rowsToSkip)
    d = pd.io.parsers.read_csv(constant.DATASET_PATH, header=None, skiprows=rowsToSkip).to_numpy()
    # log.info('d:\n' + str(d) + '\n')
    d = np.delete(d, [0,1,2], 1)  # deletes not significant columns

    ### STANDARDIZATION
    # Normalizing the data: Standardization (Z-score Normalization)
    d_std = np.nan_to_num(preprocessing.StandardScaler().fit_transform(d))

    ### DIMENSIONALITY REDUCTION
    # Performing dimensionality reduction
    RS = 20150101
    d_tsne = TSNE(random_state=RS).fit_transform(d_std)

    ### CLUSTERING
    # Clustering with K-means
    kmeans = KMeans(n_clusters= 3)
    label = kmeans.fit_predict(d_tsne)

    ### OUTPUT
    labelMatrix = np.transpose(np.matrix(label))
    outputMatrix = np.append(d_tsne, labelMatrix, axis=1)
    # log.info('\n\noutput = ' + str(outputMatrix) + '\n')
    
    return jsonify({"clusters":outputMatrix.tolist()})
