"use client";

import { useState, useCallback } from "react";
import { HAMILTON_ISLAND_MAPPING } from "@/lib/data-import";

type ImportStatus = "idle" | "parsing" | "previewing" | "importing" | "done" | "error";

interface ImportStats {
  total_rows: number;
  successful: number;
  failed: number;
  skipped: number;
}

export default function ImportPage() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [message, setMessage] = useState("");

  // Parse CSV text into rows
  const parseCSV = useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    // Simple CSV parser (handles quoted fields)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

    return { headers, rows };
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setFile(selected);
      setStatus("parsing");
      setMessage("");
      setErrors([]);

      try {
        if (selected.name.endsWith(".csv")) {
          const text = await selected.text();
          const { headers, rows } = parseCSV(text);
          setColumns(headers);
          setPreview(rows.slice(0, 10));
          setStatus("previewing");
          setMessage(
            `Parsed ${rows.length} rows with ${headers.length} columns.`
          );
        } else if (
          selected.name.endsWith(".xlsx") ||
          selected.name.endsWith(".xls")
        ) {
          setMessage(
            "Excel files: paste your data as CSV for now. Full .xlsx support coming in the next update."
          );
          setStatus("idle");
        } else {
          setMessage("Please upload a .csv file.");
          setStatus("idle");
        }
      } catch (err) {
        setMessage(`Parse error: ${err instanceof Error ? err.message : "Unknown"}`);
        setStatus("error");
      }
    },
    [parseCSV]
  );

  const handleImport = useCallback(async () => {
    if (!file || preview.length === 0) return;

    setStatus("importing");
    setMessage("Importing incidents...");

    try {
      // Read full file
      const text = await file.text();
      const { rows } = parseCSV(text);

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          columnMapping: HAMILTON_ISLAND_MAPPING,
          fileName: file.name,
          fileType: file.name.split(".").pop() || "csv",
          autoClassify: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(`Import failed: ${result.error}`);
        setStatus("error");
        return;
      }

      setStats(result.stats);
      setErrors(result.errors || []);
      setStatus("done");
      setMessage(
        `Import complete: ${result.stats.successful} incidents imported.`
      );
    } catch (err) {
      setMessage(
        `Import error: ${err instanceof Error ? err.message : "Unknown"}`
      );
      setStatus("error");
    }
  }, [file, preview, parseCSV]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Import Data</h1>
        <p className="text-night-400 mt-1">
          Upload your incident records to populate the dashboard. Supports CSV
          files with your hotel&apos;s standard export format.
        </p>
      </div>

      {/* Upload zone */}
      <div className="glass rounded-xl p-8">
        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer space-y-3 block"
          >
            <div className="text-4xl">📄</div>
            <p className="text-white font-medium">
              {file ? file.name : "Click to upload CSV"}
            </p>
            <p className="text-night-500 text-sm">
              Drag and drop or click to browse. Max 10,000 rows per import.
            </p>
          </label>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            status === "error"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : status === "done"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-brand-500/10 text-brand-400 border border-brand-500/20"
          }`}
        >
          {message}
        </div>
      )}

      {/* Column preview */}
      {(status === "previewing" || status === "importing") && columns.length > 0 && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Preview</h2>
            <span className="text-sm text-night-400">
              Showing first {preview.length} rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {columns.slice(0, 8).map((col) => (
                    <th
                      key={col}
                      className="text-left py-2 px-3 text-night-400 font-medium whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  {columns.length > 8 && (
                    <th className="text-left py-2 px-3 text-night-500">
                      +{columns.length - 8} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {columns.slice(0, 8).map((col) => (
                      <td
                        key={col}
                        className="py-2 px-3 text-night-200 whitespace-nowrap max-w-[200px] truncate"
                      >
                        {row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={status === "importing"}
            className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {status === "importing" ? "Importing..." : "Import All Rows"}
          </button>
        </div>
      )}

      {/* Results */}
      {status === "done" && stats && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium text-white">Import Results</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-white">
                {stats.total_rows}
              </p>
              <p className="text-sm text-night-400">Total Rows</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-400">
                {stats.successful}
              </p>
              <p className="text-sm text-night-400">Imported</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-red-400">
                {stats.failed}
              </p>
              <p className="text-sm text-night-400">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-night-400">
                {stats.skipped}
              </p>
              <p className="text-sm text-night-400">Skipped</p>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-night-300 mb-2">
                Errors ({errors.length})
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column mapping help */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-3">
          Expected Columns
        </h2>
        <p className="text-sm text-night-400 mb-4">
          Your CSV should include these columns (order doesn&apos;t matter):
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(HAMILTON_ISLAND_MAPPING).map(([key, col]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-brand-400 font-mono text-xs">{col}</span>
              <span className="text-night-500">→ {key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
