import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { importTreeFromFile, ImportResult } from '../services/importService';
import { getUserTrees, Tree } from '../services/treeService';
import './ImportTreeModal.css';

interface ImportTreeModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (treeId: string) => void;
}

export const ImportTreeModal: React.FC<ImportTreeModalProps> = ({
  visible,
  onClose,
  onImport,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [targetTreeId, setTargetTreeId] = useState<string | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMedia, setImportMedia] = useState(true);
  const [preservePositions, setPreservePositions] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Load trees when modal opens
  useEffect(() => {
    if (visible) {
      loadTrees();
    }
  }, [visible]);

  const loadTrees = async () => {
    try {
      const userTrees = await getUserTrees();
      setTrees(userTrees);
    } catch (error) {
      console.error('Error loading trees:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const importResult = await importTreeFromFile(file, targetTreeId, {
        importMedia,
        preservePositions,
        mergeMode: targetTreeId ? 'append' : 'append',
        skipDuplicates: false,
      });

      setResult(importResult);

      if (importResult.success && importResult.treeId) {
        // Wait a bit before closing to show success message
        setTimeout(() => {
          onImport(importResult.treeId!);
          handleClose();
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        importedPersons: 0,
        importedRelationships: 0,
        importedContacts: 0,
        importedMedia: 0,
        importedPositions: 0,
        errors: [error.message || 'Erreur lors de l\'import'],
        warnings: [],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTargetTreeId(null);
    setImportMedia(true);
    setPreservePositions(true);
    setResult(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content import-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Importer un arbre</h2>

        {!result ? (
          <>
            <div className="form-group">
              <label className="form-label">
                Fichier JSON <span className="required">*</span>
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="form-input file-input"
                disabled={importing}
              />
              {file && (
                <p className="file-info">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Importer dans</label>
              <select
                className="form-input"
                value={targetTreeId || ''}
                onChange={(e) => setTargetTreeId(e.target.value || null)}
                disabled={importing}
              >
                <option value="">Nouvel arbre</option>
                {trees.map((tree) => (
                  <option key={tree.id} value={tree.id}>
                    {tree.name} ({tree.role === 'owner' ? 'Propriétaire' : 'Partagé'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importMedia}
                  onChange={(e) => setImportMedia(e.target.checked)}
                  disabled={importing}
                />
                <span>Importer les photos</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preservePositions}
                  onChange={(e) => setPreservePositions(e.target.checked)}
                  disabled={importing}
                />
                <span>Préserver les positions</span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                onClick={handleImport}
                className="btn btn-primary"
                disabled={!file || importing}
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </button>
              <button
                onClick={handleClose}
                className="btn btn-secondary"
                disabled={importing}
              >
                {t('common.cancel')}
              </button>
            </div>
          </>
        ) : (
          <div className="import-result">
            {result.success ? (
              <div className="result-success">
                <h3>✅ Import réussi !</h3>
                <ul className="result-stats">
                  <li>{result.importedPersons} personne(s) importée(s)</li>
                  <li>{result.importedRelationships} relation(s) importée(s)</li>
                  <li>{result.importedContacts} contact(s) importé(s)</li>
                  <li>{result.importedMedia} média(x) importé(s)</li>
                  <li>{result.importedPositions} position(s) importée(s)</li>
                </ul>
                {result.warnings.length > 0 && (
                  <div className="result-warnings">
                    <h4>Avertissements :</h4>
                    <ul>
                      {result.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="result-error">
                <h3>❌ Erreur lors de l'import</h3>
                <ul>
                  {result.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
                {result.warnings.length > 0 && (
                  <div className="result-warnings">
                    <h4>Avertissements :</h4>
                    <ul>
                      {result.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button onClick={handleClose} className="btn btn-primary">
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

