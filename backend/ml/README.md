# Training with datasets from B2

The active feature, 2D medium, and 3D medium training scripts now synchronize their
dataset from B2 before loading training images. Their threshold calibration scripts
use the same cache. Scanning existing artworks still uses `ml/models`; starting
the backend or ML scanner does not download datasets or run training.

Run commands from `backend` with Node.js, the existing Python ML dependencies, and
the B2 settings already configured in `backend/.env`.

```powershell
# Download or update all three dataset groups without starting training.
npm run ml:sync-datasets

# Update only one group.
npm run ml:sync-datasets -- --dataset features

# Training also automatically synchronizes the relevant group first.
python ml/train_feature_scanner.py
python ml/train_medium_2d_scanner.py
python ml/train_medium_3d_scanner.py
```

Files are downloaded into `backend/.cache/ml-datasets` and then read locally for
training speed. Synchronization checks the remote B2 listing and file contents,
reuses matching cache files, and downloads missing or changed files. When available,
matching files from the original `ml/datasets` can seed the cache without a download.
The original datasets are preserved. Running the sync command alone does not change
trained models; training still saves model checkpoints into `backend/ml/models`.
Synchronization does not delete files. If a cache contains unexpected files absent
from B2, it stops instead of training with extra data. Choose a fresh cache using
`ML_DATASET_DIR`/`--destination`, or move the unexpected files out of the cache.

The active calibration commands are:

```powershell
python ml/calibrate_feature_thresholds.py
python ml/calibrate_medium_2d_threshold.py
python ml/calibrate_medium_3d_threshold.py
```

To choose another cache location for both synchronization and training:

```powershell
$env:ML_DATASET_DIR = "D:\ArtMatch datasets"
npm run ml:sync-datasets
python ml/train_feature_scanner.py
```

`ML_DATASET_DIR` identifies the parent containing `features`, `mediums_2d`, and
`mediums_3d`. Relative paths resolve from `backend`, including when a training script
is launched from another working directory. The standalone sync command also accepts
`--destination "D:\ArtMatch datasets"`; use `ML_DATASET_DIR` if training should use
that same location. `NODE_BINARY` can specify the Node.js executable when it is not
on `PATH`.

The default `ML_DATASET_SOURCE=b2` stops training if synchronization cannot complete.
For an explicit offline run with the original datasets, use:

```powershell
$env:ML_DATASET_SOURCE = "local"
Remove-Item Env:ML_DATASET_DIR -ErrorAction SilentlyContinue
python ml/train_feature_scanner.py
```

Local mode uses `backend/ml/datasets`, or `ML_DATASET_DIR` when set. To train offline
from a previously synchronized cache, set `ML_DATASET_DIR` to that cache and
`ML_DATASET_SOURCE` to `local`. To resume B2 checks, set the source back to `b2`.
Missing train/validation folders or feature annotation CSVs stop training in either
mode. No new Python packages are needed for synchronization.

Offline helper checks (these do not download data or train models):

```powershell
python -B -m unittest discover -s ml -p test_dataset_sync.py
```
