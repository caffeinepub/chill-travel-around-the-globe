import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { useActor } from '@/hooks/useActor';
import { toast } from 'sonner';

export default function TimezoneManagement() {
  const { actor } = useActor();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.geojson')) {
        setFile(selectedFile);
        setError(null);
        setUploadSuccess(false);
      } else {
        setError('Please select a valid GeoJSON file (.json or .geojson)');
        setFile(null);
      }
    }
  };

  const validateGeoJSON = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    if (data.type !== 'FeatureCollection') return false;
    if (!Array.isArray(data.features)) return false;
    return true;
  };

  const handleUpload = async () => {
    if (!file || !actor) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const geoJsonData = JSON.parse(text);

      if (!validateGeoJSON(geoJsonData)) {
        throw new Error('Invalid GeoJSON format. Expected a FeatureCollection.');
      }

      // Store in backend
      await actor.setTimezoneGeoJson(text);

      // Store in IndexedDB for offline caching
      const db = await openIndexedDB();
      await saveToIndexedDB(db, text);

      setUploadSuccess(true);
      toast.success('Timezone GeoJSON uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload timezone data');
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleManualExecution = async () => {
    if (!actor) {
      toast.error('Backend actor not available');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      // Step 1: Retrieve from IndexedDB or last upload
      toast.info('Step 1: Retrieving timezone GeoJSON data...');
      const db = await openIndexedDB();
      const storedData = await getFromIndexedDB(db);

      if (!storedData) {
        throw new Error('No timezone data found in IndexedDB. Please upload a file first.');
      }

      // Validate the data
      const geoJsonData = JSON.parse(storedData);
      if (!validateGeoJSON(geoJsonData)) {
        throw new Error('Invalid GeoJSON format in stored data.');
      }

      toast.success('Step 1 complete: Data retrieved from IndexedDB');

      // Step 2: Call backend.setTimezoneGeoJson()
      toast.info('Step 2: Persisting to backend canister...');
      await actor.setTimezoneGeoJson(storedData);
      toast.success('Step 2 complete: Data persisted to canister');

      // Step 3: Verify with backend.getTimezoneGeoJson()
      toast.info('Step 3: Verifying canister storage...');
      const retrievedData = await actor.getTimezoneGeoJson();

      if (!retrievedData || retrievedData.length === 0) {
        throw new Error('Verification failed: No data returned from canister');
      }

      if (!retrievedData.startsWith('{"type":"FeatureCollection"')) {
        throw new Error('Verification failed: Data does not start with expected FeatureCollection format');
      }

      toast.success(`Step 3 complete: Verified ${retrievedData.length} characters stored in canister`);

      // Step 4: Reload frontend
      toast.info('Step 4: Reloading frontend to fetch from backend...');
      
      // Clear the cached data in window to force reload from backend
      if (window.TZ_DATA) {
        delete window.TZ_DATA;
      }

      // Trigger a page reload to reinitialize with backend data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      toast.success('Execution complete! Page will reload to display timezone overlays.');
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('Manual execution error:', err);
      setError(err.message || 'Manual execution failed');
      toast.error('Execution failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExecuting(false);
    }
  };

  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TimezoneDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('timezones')) {
          db.createObjectStore('timezones');
        }
      };
    });
  };

  const saveToIndexedDB = (db: IDBDatabase, data: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['timezones'], 'readwrite');
      const store = transaction.objectStore('timezones');
      const request = store.put(data, 'geoJsonData');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const getFromIndexedDB = (db: IDBDatabase): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['timezones'], 'readonly');
      const store = transaction.objectStore('timezones');
      const request = store.get('geoJsonData');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Timezone GeoJSON Management</CardTitle>
        <CardDescription>
          Upload and manage timezone boundary data for the 3D globe visualization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="timezone-file" className="block text-sm font-medium">
            Select Timezone GeoJSON File
          </label>
          <input
            id="timezone-file"
            type="file"
            accept=".json,.geojson"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        {file && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {uploadSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Timezone data uploaded and stored successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading || !actor}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload to Backend'}
          </Button>

          <Button
            onClick={handleManualExecution}
            disabled={executing || !actor}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {executing ? 'Executing...' : 'Execute Manual Sequence'}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-md">
          <h4 className="text-sm font-semibold mb-2">Manual Execution Sequence:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Retrieve uploaded timezone GeoJSON from IndexedDB storage</li>
            <li>Call backend.setTimezoneGeoJson() to persist in canister</li>
            <li>Verify with backend.getTimezoneGeoJson() that data is stored correctly</li>
            <li>Reload frontend to fetch from backend and display timezone overlays</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            Note: You must upload a file first before executing the manual sequence.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
