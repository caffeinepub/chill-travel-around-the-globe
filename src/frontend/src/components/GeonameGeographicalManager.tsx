import React, { useState } from 'react';
import { Globe, Upload, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useImportCities, useGetCitiesPaginated, useSearchCities, useAddCity, useUpdateCity, useDeleteCity } from '@/hooks/useQueries';
import { GeonameCity } from '@/backend';

interface CityFormData {
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  population: number;
  featureCode: string;
  classification: string;
}

export default function GeonameGeographicalManager() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<GeonameCity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [cityForm, setCityForm] = useState<CityFormData>({
    name: '',
    country: '',
    region: '',
    latitude: 0,
    longitude: 0,
    population: 0,
    featureCode: '',
    classification: ''
  });

  const pageSize = 20;
  const importCities = useImportCities();
  
  // Use different hooks based on whether we're searching or browsing
  const isSearching = searchTerm.trim().length > 0;
  const { data: browseCities = [], refetch: refetchBrowse } = useGetCitiesPaginated(currentPage, pageSize);
  const { data: searchCities = [], refetch: refetchSearch } = useSearchCities(searchTerm, currentPage, pageSize);
  
  // Use search results if searching, otherwise use browse results
  const cities = isSearching ? searchCities : browseCities;
  const refetchCities = isSearching ? refetchSearch : refetchBrowse;
  
  const addCity = useAddCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();

  const calculateClassification = (featureCode: string): string => {
    switch (featureCode) {
      case 'PPLC':
        return 'Capital';
      case 'G':
        return 'Global City';
      case 'M':
        return 'Major City';
      case 'R':
        return 'Regional City';
      case 'S':
        return 'Sub-regional City';
      case 'T':
        return 'Town';
      default:
        return 'other';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const parsedCities: GeonameCity[] = [];

      for (const line of lines) {
        // Skip empty lines and header lines
        if (!line.trim() || line.startsWith('#') || line.startsWith('geonameid')) {
          continue;
        }

        const fields = line.split('\t');
        if (fields.length < 19) continue;

        // Parse fields according to geonames format
        const name = fields[1]?.trim();
        const latitude = parseFloat(fields[4]);
        const longitude = parseFloat(fields[5]);
        const featureCode = fields[7]?.trim();
        const country = fields[8]?.trim();
        const region = fields[10]?.trim();
        const population = parseInt(fields[14], 10);

        // Validate data
        if (!name || isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180 ||
            isNaN(population) || population < 0) {
          continue;
        }

        // Calculate classification based on feature code
        const classification = calculateClassification(featureCode || '');

        parsedCities.push({
          name,
          country: country || '',
          region: region || '',
          latitude,
          longitude,
          population: BigInt(population),
          featureCode: featureCode || '',
          classification
        });
      }

      if (parsedCities.length === 0) {
        toast.error('No valid city data found in file');
        return;
      }

      // Import in large batches
      const batchSize = 1000;
      for (let i = 0; i < parsedCities.length; i += batchSize) {
        const batch = parsedCities.slice(i, i + batchSize);
        await importCities.mutateAsync(batch);
      }

      toast.success(`Successfully imported ${parsedCities.length} cities`);
      setIsUploadDialogOpen(false);
      refetchCities();
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cityForm.name.trim() || !cityForm.country.trim()) {
      toast.error('Name and country are required');
      return;
    }

    try {
      const cityData: GeonameCity = {
        name: cityForm.name.trim(),
        country: cityForm.country.trim(),
        region: cityForm.region.trim(),
        latitude: cityForm.latitude,
        longitude: cityForm.longitude,
        population: BigInt(cityForm.population),
        featureCode: cityForm.featureCode.trim(),
        classification: cityForm.classification.trim()
      };

      if (editingCity) {
        const success = await updateCity.mutateAsync({
          name: editingCity.name,
          city: cityData
        });
        if (success) {
          toast.success('City updated successfully');
        } else {
          toast.error('Failed to update city');
          return;
        }
      } else {
        await addCity.mutateAsync(cityData);
        toast.success('City added successfully');
      }

      setCityForm({
        name: '',
        country: '',
        region: '',
        latitude: 0,
        longitude: 0,
        population: 0,
        featureCode: '',
        classification: ''
      });
      setEditingCity(null);
      setIsCityDialogOpen(false);
      refetchCities();
    } catch (error) {
      console.error('Error saving city:', error);
      toast.error('Failed to save city');
    }
  };

  const handleEditCity = (city: GeonameCity) => {
    setEditingCity(city);
    setCityForm({
      name: city.name,
      country: city.country,
      region: city.region,
      latitude: city.latitude,
      longitude: city.longitude,
      population: Number(city.population),
      featureCode: city.featureCode,
      classification: city.classification
    });
    setIsCityDialogOpen(true);
  };

  const handleDeleteCity = async (name: string) => {
    if (!confirm('Are you sure you want to delete this city?')) {
      return;
    }

    try {
      const success = await deleteCity.mutateAsync(name);
      if (success) {
        toast.success('City deleted successfully');
        refetchCities();
      } else {
        toast.error('Failed to delete city');
      }
    } catch (error) {
      console.error('Error deleting city:', error);
      toast.error('Failed to delete city');
    }
  };

  const handleSearch = () => {
    setCurrentPage(0);
    refetchCities();
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Geoname Geographical Database
          </h3>
          <p className="text-sm text-muted-foreground">
            Import and manage city data from geonames files
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-[3200]">
              <DialogHeader>
                <DialogTitle>Import Geoname Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Upload a ZIP or TXT file containing geoname city data. The file will be processed in the browser.
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".zip,.txt"
                    onChange={handleFileUpload}
                    disabled={importCities.isPending}
                  />
                </div>
                {importCities.isPending && (
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add City
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-[3200] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCity ? 'Edit City' : 'Add City'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCitySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={cityForm.name}
                    onChange={(e) => setCityForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={cityForm.country}
                    onChange={(e) => setCityForm(prev => ({ ...prev, country: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={cityForm.region}
                    onChange={(e) => setCityForm(prev => ({ ...prev, region: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="0.000001"
                      value={cityForm.latitude}
                      onChange={(e) => setCityForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="0.000001"
                      value={cityForm.longitude}
                      onChange={(e) => setCityForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="population">Population</Label>
                  <Input
                    id="population"
                    type="number"
                    value={cityForm.population}
                    onChange={(e) => setCityForm(prev => ({ ...prev, population: parseInt(e.target.value, 10) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="featureCode">Feature Code</Label>
                  <Input
                    id="featureCode"
                    value={cityForm.featureCode}
                    onChange={(e) => setCityForm(prev => ({ ...prev, featureCode: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PPLC=Capital, G=Global City, M=Major City, R=Regional City, S=Sub-regional City, T=Town
                  </p>
                </div>
                <div>
                  <Label htmlFor="classification">Classification</Label>
                  <Input
                    id="classification"
                    value={cityForm.classification}
                    onChange={(e) => setCityForm(prev => ({ ...prev, classification: e.target.value }))}
                    placeholder="e.g., Capital, Global City, Major City, Town"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can type any classification. Common values: Capital, Global City, Major City, Regional City, Sub-regional City, Town, other
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCityDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCity.isPending || updateCity.isPending}>
                    {addCity.isPending || updateCity.isPending ? 'Saving...' : editingCity ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {isSearching ? 'Search Cities' : 'Browse All Cities'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by name, country, or region... (leave empty to browse all)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0); // Reset to first page when search term changes
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              {isSearching ? 'Search' : 'Browse'}
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Population</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {isSearching 
                        ? 'No cities found matching your search. Try different keywords.'
                        : 'No cities found. Import data or add cities manually.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  cities.map((city) => (
                    <TableRow key={city.name}>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell>{city.country}</TableCell>
                      <TableCell>{city.region}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          {city.classification}
                        </span>
                      </TableCell>
                      <TableCell>{city.latitude.toFixed(4)}</TableCell>
                      <TableCell>{city.longitude.toFixed(4)}</TableCell>
                      <TableCell>{Number(city.population).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCity(city)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCity(city.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} {isSearching ? '(Search Results)' : '(All Cities)'}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextPage}
                disabled={cities.length < pageSize}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
