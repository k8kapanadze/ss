import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { FileData } from '../types';
import { parseQuestionFile, formatBytes } from '../utils';

interface UploadSectionProps {
  files: FileData[];
  onFilesChanged: (files: FileData[]) => void;
}

export default function UploadSection({ files, onFilesChanged }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextProcessing = (text: string, name: string) => {
    try {
      const parsed = parseQuestionFile(text, name);
      if (parsed.length === 0) {
        setErrorMsg(`ფაილში "${name}" კითხვები ვერ მოიძებნა. გთხოვთ შეამოწმოთ ფორმატი: (////, //, ///)`);
        setSuccessMsg(null);
        return;
      }

      // Check if file with same name already exists
      if (files.some(f => f.name === name)) {
        setErrorMsg(`ფაილი სახელით "${name}" უკვე ატვირთულია.`);
        setSuccessMsg(null);
        return;
      }

      const newFileData: FileData = {
        name,
        questions: parsed,
        sizeStr: formatBytes(text.length),
      };

      onFilesChanged([...files, newFileData]);
      setSuccessMsg(`ფაილი წარმატებით ჩაიტვირთა — ნაპოვნია ${parsed.length} კითხვა!`);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(`ფაილის დამუშავებისას მოხდა შეცდომა.`);
      setSuccessMsg(null);
    }
  };

  const handleFiles = (fileList: FileList) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.endsWith('.txt') && !file.name.endsWith('.json')) {
        setErrorMsg('მხოლოდ ტექსტური (.txt) ფაილების ატვირთვაა მხარდაჭერილი.');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        handleTextProcessing(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    onFilesChanged(updated);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <div id="upload-section-container" className="space-y-6">
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {/* Drag and Drop Box with Premium, High-End Design styling */}
        <div
          id="dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
            dragActive
              ? 'border-teal-500 bg-teal-500/5 dark:bg-teal-500/10 shadow-[0_0_25px_rgba(20,184,166,0.15)] scale-[1.01]'
              : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/80 dark:hover:border-teal-500 bg-slate-50/40 dark:bg-[#0A0C10]/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)]'
          }`}
        >
          {/* Subtle gradient background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.json"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="relative flex flex-col items-center gap-4">
            {/* Elegant Icon circle */}
            <div className={`p-4 rounded-2xl transition-all duration-300 transform ${
              dragActive 
                ? 'bg-teal-500 text-white scale-110 shadow-lg' 
                : 'bg-white dark:bg-[#161B22] border border-slate-200/60 dark:border-slate-800 text-teal-605 dark:text-teal-400 group-hover:scale-105 group-hover:border-teal-200 dark:group-hover:border-teal-905 shadow-sm'
            }`}>
              <Upload className={`h-8 w-8 text-teal-500 dark:text-teal-450 transition-transform duration-300 ${dragActive ? 'animate-bounce' : 'group-hover:-translate-y-0.5'}`} />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-sm font-extrabold text-[#0f172a] dark:text-slate-100 tracking-tight">
                საგამოცდო კითხვების ფაილის ატვირთვა
              </h3>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-extrabold hover:underline leading-relaxed">
                აირჩიეთ ფაილი .txt.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Status alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
