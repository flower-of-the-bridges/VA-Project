import numpy as np
import pandas as pd
from matplotlib import pyplot as plt
from sklearn.decomposition import PCA
from sklearn import preprocessing
from numpy import inf
from numpy import random


def generateFile(label, Y, dataFile):
    att = ['Y1', 'Y2']+label
    f = open('../res/pca.csv', 'w')
    fin = open(dataFile)
    print(','.join(att), file=f)
    fin.readline()
    for i in range(len(Y)-1):
        s = str(Y[i][0])+','+str(Y[i][1])+','+fin.readline().strip()
        print(s, file=f)
    f.close()

att = ['id','date','region','new','death','healed','positives','hospitalized','isolated','intensiveCare','index','groceriesPharmacy','parks','residential','retailRecreation','transit','workplaces']
d = pd.io.parsers.read_csv('../res/dataset.csv').to_numpy()
d = np.delete(d, [0,1,2], 1)  # delete columns
#plotting d on a 2D scatterplot
plt.plot(d[:,0],d[:,1],
         'o', markersize=7,
         color='blue',
         alpha=0.5,
         label='original data')
plt.xlabel('X1')
plt.ylabel('X2')
plt.xlim([-10,10000]) 
plt.ylim([0,10000]) 
plt.legend()
plt.show()

# normalize the data with StandardScaler
d_std = np.nan_to_num(preprocessing.StandardScaler().fit_transform(d))
# compute PCA
pca = PCA(n_components=13)
d_pca = pca.fit_transform(d_std)
# d_pca is a numpy array with transformed data and pca is a
# PCA variable  with useful attributes (e.g., explained_variance_)

generateFile(att, d_pca, '../res/dataset.csv')

plt.plot(d_pca[:, 0], d_pca[:, 1], 'o', markersize=3, color='blue',
         alpha=0.5, label='PCA transformed data in the new 2D space')
plt.xlabel('Y1')
plt.ylabel('Y2')
plt.xlim([-10, 20])
plt.ylim([-10, 15])
plt.legend()
plt.title('Transformed data from sklearn.decomposition import PCA')

plt.show()

r = lambda: random.randint(0,255)
s = 30
for i in range(0,21):
    plt.scatter(d_pca[i*21:21+(21*i)-1, 0], d_pca[i*21:21+(21*i)-1, 1],
            color='#%02X%02X%02X' % (r(),r(),r()), s=s, lw=0, label='Cluster '+str(i))

plt.xlabel('Y1')
plt.ylabel('Y2')
plt.legend()
plt.title('Transformed data from sklearn.decomposition import PCA')

plt.show()

d_cov = np.cov(d.T.astype(float))
for i in range(len(d_cov)):
    print('Variance original data axis X'+str(i+1), d_cov[i][i])
print('Covariance matrix')

for i in range(len(d_cov)):
    for j in range(len(d_cov[0])):
        print('%.2f ' % (d_cov[i][j]), end='\t')
        #print(str(d_pca[i][j])[:6]+' ', end='')
    print()
print('-------------------------------------')

d_cov = np.cov(d_std.T)
for i in range(len(d_cov)):
    print('Variance original normalized data axis X'+str(i+1), d_cov[i][i])

print('Covariance matrix')
for i in range(len(d_cov)):
    for j in range(len(d_cov[0])):
        print('%.2f ' % (d_cov[i][j]), end='\t')
        #print(str(d_pca[i][j])[:6]+' ', end='')
    print()
print('-------------------------------------')

d_cov = np.cov(d_pca.T)
for i in range(len(d_cov)):
    print('Variance transformed data axis Y'+str(i+1), d_cov[i][i])

print('Covariance matrix')
for i in range(len(d_cov)):
    for j in range(len(d_cov[0])):
        print('%.2f ' % (d_cov[i][j]), end='\t')
        #print(str(d_pca[i][j])[:6]+' ', end='')
    print()
print('-------------------------------------')

# compute and sort eigenvalues
v = pca.explained_variance_ratio_
print('Cumulated variance of the first two PCA components:',
      (v[0]+v[1]))


# for i in range (len(d_pca)):
# for j in range(len(d_pca[0])):
##        print('%.2f ' % (d_pca[i][j]), end='\t')
# print(str(d_pca[i][j])[:6]+' ', end='')
# print()
