import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertTriangle, Download, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportRow {
  [key: string]: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
  originalData: ImportRow;
}

interface ColumnMapping {
  [csvColumn: string]: string;
}

const REQUIRED_FIELDS = {
  date: "Date",
  species: "Species", 
  head_count: "Head Count",
  window_start: "Window Start",
  window_end: "Window End"
};

const VALID_SPECIES = ["beef", "lamb", "mutton", "goat"];

export default function ImportData() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'complete'>("upload");
  const [csvData, setCsvData] = useState<ImportRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validRows, setValidRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [plants, setPlants] = useState<{ id: string; plant_name: string }[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("plants").select("id, plant_name").order("plant_name").then(({ data }) => {
      const list = (data as any[]) || [];
      setPlants(list);
      if (list.length > 0) setSelectedPlantId(list[0].id);
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert("CSV must have at least a header row and one data row");
          setLoading(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: ImportRow = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          row._originalRowNumber = (index + 2).toString(); // +2 for header and 0-based index
          return row;
        });

        setCsvHeaders(headers);
        setCsvData(rows);
        setStep("mapping");
      } catch (error) {
        alert("Error parsing CSV file");
        console.error(error);
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: targetField
    }));
  };

  const validateData = () => {
    setLoading(true);
    const errors: ValidationError[] = [];
    const valid: ImportRow[] = [];

    csvData.forEach((row, index) => {
      const rowNumber = parseInt(row._originalRowNumber || '0');
      let hasError = false;

      // Get mapped values
      const mappedRow: any = {};
      Object.entries(mapping).forEach(([csvCol, targetField]) => {
        if (targetField && targetField !== '') {
          mappedRow[targetField] = row[csvCol];
        }
      });

      // Date validation
      if (mappedRow.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(mappedRow.date)) {
          const testDate = new Date(mappedRow.date);
          if (isNaN(testDate.getTime())) {
            errors.push({
              row: rowNumber,
              field: "date",
              value: mappedRow.date,
              error: "Invalid date format. Expected YYYY-MM-DD or valid date string",
              originalData: row
            });
            hasError = true;
          }
        }
      }

      // Species validation
      if (mappedRow.species) {
        const species = mappedRow.species.toLowerCase().trim();
        if (!VALID_SPECIES.includes(species)) {
          errors.push({
            row: rowNumber,
            field: "species",
            value: mappedRow.species,
            error: `Invalid species. Must be one of: ${VALID_SPECIES.join(', ')}`,
            originalData: row
          });
          hasError = true;
        }
      }

      // Head count validation
      if (mappedRow.head_count) {
        const headCount = parseInt(mappedRow.head_count);
        if (isNaN(headCount) || headCount <= 0) {
          errors.push({
            row: rowNumber,
            field: "head_count",
            value: mappedRow.head_count,
            error: "Head count must be a number greater than 0",
            originalData: row
          });
          hasError = true;
        }
      }

      // Window start/end validation
      if (mappedRow.window_start && mappedRow.window_end) {
        const startTime = new Date(mappedRow.window_start);
        const endTime = new Date(mappedRow.window_end);
        
        if (isNaN(startTime.getTime())) {
          errors.push({
            row: rowNumber,
            field: "window_start", 
            value: mappedRow.window_start,
            error: "Invalid window start time format",
            originalData: row
          });
          hasError = true;
        }
        
        if (isNaN(endTime.getTime())) {
          errors.push({
            row: rowNumber,
            field: "window_end",
            value: mappedRow.window_end, 
            error: "Invalid window end time format",
            originalData: row
          });
          hasError = true;
        }

        if (!hasError && startTime >= endTime) {
          errors.push({
            row: rowNumber,
            field: "window_times",
            value: `${mappedRow.window_start} - ${mappedRow.window_end}`,
            error: "Window start time must be before end time",
            originalData: row
          });
          hasError = true;
        }
      }

      if (!hasError) {
        valid.push({ ...row, ...mappedRow });
      }
    });

    setValidationErrors(errors);
    setValidRows(valid);
    setStep("validation");
    setLoading(false);
  };

  const downloadErrorsCsv = () => {
    if (validationErrors.length === 0) return;

    const headers = ["Row", "Field", "Value", "Error", ...csvHeaders];
    const csvContent = [
      headers.join(","),
      ...validationErrors.map(error => [
        error.row,
        error.field,
        `"${error.value}"`,
        `"${error.error}"`,
        ...csvHeaders.map(header => `"${error.originalData[header] || ''}"`)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "errors.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setValidationErrors([]);
    setValidRows([]);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const proceedToImport = async () => {
    if (!selectedPlantId) {
      toast({ title: "Select a plant first", variant: "destructive" });
      return;
    }
    setImporting(true);

    // validRows already have target field keys (date, species, head_count) merged in validateData
    const records = validRows.map(row => ({
      date:         row.date || null,
      species:      (row.species || "").toLowerCase(),
      planned_head: parseInt(row.head_count || "0") || 0,
      plant_id:     selectedPlantId,
    })).filter(r => r.date && r.species && r.planned_head > 0);

    const { error } = await supabase.from("day_plans").insert(records);

    setImporting(false);

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }

    setImportedCount(records.length);
    toast({
      title: `Imported ${records.length} capacity row${records.length !== 1 ? "s" : ""} ✅`,
      description: "Day plans updated — visible in Forward Volume Plan.",
    });
    setStep("complete");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Import Data</h1>
            <p className="text-muted-foreground">Upload and validate CSV data for import</p>
          </div>
          <Button variant="outline" onClick={resetImport}>
            <Upload className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {[
                { id: "upload", label: "Upload", icon: Upload },
                { id: "mapping", label: "Map Fields", icon: FileText },
                { id: "validation", label: "Validate", icon: CheckCircle },
                { id: "complete", label: "Complete", icon: CheckCircle }
              ].map((stepInfo, index) => {
                const Icon = stepInfo.icon;
                const isActive = step === stepInfo.id;
                const isCompleted = ["upload", "mapping", "validation", "complete"].indexOf(step) > index;
                
                return (
                  <div key={stepInfo.id} className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${
                      isCompleted ? "bg-primary text-primary-foreground" :
                      isActive ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                      {stepInfo.label}
                    </span>
                    {index < 3 && (
                      <div className={`w-8 h-px ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Drop your CSV file here</h3>
                    <p className="text-muted-foreground">or click to browse</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mt-4"
                    disabled={loading}
                  />
                  {loading && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing file...</span>
                    </div>
                  )}
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    CSV should contain columns for date, species, head count, window start, and window end times.
                    Supported species: beef, lamb, mutton, goat.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Map CSV Columns to Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Map your CSV columns to the required fields. Preview shows first 3 rows.
                </p>
                
                <div className="grid gap-4">
                  {Object.entries(REQUIRED_FIELDS).map(([fieldKey, fieldLabel]) => (
                    <div key={fieldKey} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <Label className="font-medium">{fieldLabel}:</Label>
                      <Select
                        value={Object.entries(mapping).find(([, target]) => target === fieldKey)?.[0] || ""}
                        onValueChange={(csvColumn) => handleMappingChange(csvColumn, fieldKey)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select CSV column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- None --</SelectItem>
                          {csvHeaders.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        {csvData.slice(0, 3).map((row, i) => (
                          <div key={i}>
                            {Object.entries(mapping).find(([, target]) => target === fieldKey)?.[0] 
                              ? row[Object.entries(mapping).find(([, target]) => target === fieldKey)![0]] 
                              : "..."}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetImport}>
                    Cancel
                  </Button>
                  <Button onClick={validateData} disabled={Object.keys(mapping).length === 0 || loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Validate Data"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Validation Results */}
        {step === "validation" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{csvData.length}</div>
                      <div className="text-sm text-muted-foreground">Total Rows</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div>
                      <div className="text-2xl font-bold text-success">{validRows.length}</div>
                      <div className="text-sm text-muted-foreground">Valid Rows</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="text-2xl font-bold text-destructive">{validationErrors.length}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Validation Errors
                    </CardTitle>
                    <Button variant="outline" onClick={downloadErrorsCsv} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Download className="h-4 w-4 mr-2" />
                      Download errors.csv
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="flex items-start justify-between p-3 border border-destructive rounded-lg bg-destructive/5">
                        <div className="flex-1">
                          <div className="font-medium text-destructive">
                            Row {error.row} - {error.field}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Value: "{error.value}"
                          </div>
                          <div className="text-sm text-destructive mt-1">
                            {error.error}
                          </div>
                        </div>
                        <Badge variant="destructive">{error.field}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plant selector + Action Buttons */}
            {validRows.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="shrink-0 font-medium text-sm">Import to plant</Label>
                      {plants.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No plants found in database</span>
                      ) : (
                        <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
                          <SelectTrigger className="w-64">
                            <SelectValue placeholder="Select plant…" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {plants.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        {validationErrors.length > 0
                          ? `${validRows.length} valid rows ready — ${validationErrors.length} skipped due to errors.`
                          : "All rows passed validation. Ready to import."}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={resetImport} disabled={importing}>
                          Start Over
                        </Button>
                        <Button
                          onClick={proceedToImport}
                          disabled={importing || !selectedPlantId}
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing…
                            </>
                          ) : (
                            `Import ${validRows.length} row${validRows.length !== 1 ? "s" : ""}`
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {validRows.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      No valid rows to import. Fix errors in your CSV and re-upload.
                    </div>
                    <Button variant="outline" onClick={resetImport}>
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4 max-w-sm mx-auto">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                <div>
                  <h3 className="text-xl font-bold text-foreground">Import complete</h3>
                  <p className="text-muted-foreground mt-1">
                    <span className="font-semibold text-foreground">{importedCount}</span> day plan row{importedCount !== 1 ? "s" : ""} imported to{" "}
                    <span className="font-semibold text-foreground">
                      {plants.find(p => p.id === selectedPlantId)?.plant_name || "plant"}
                    </span>.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Capacity data is now visible in the Forward Volume Plan.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button onClick={resetImport} variant="outline">
                    Import another file
                  </Button>
                  <Button onClick={() => window.location.href = "/forward-plan"}>
                    View Forward Plan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium">CSV import.</span> Upload a booking CSV to map columns, validate rows, and import into the booking system. Required fields: date, species, head_count, window_start, window_end.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}