import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Lightbulb, X, File } from 'lucide-react'
import { clsx } from 'clsx'
import type { SourceType } from '../../types/quiz'

interface SourceInputProps {
  sourceType: SourceType
  onSourceTypeChange: (t: SourceType) => void
  sourceContent: string
  onSourceContentChange: (v: string) => void
  file: File | null
  onFileChange: (f: File | null) => void
}

const TABS: { value: SourceType; label: string; icon: typeof Upload }[] = [
  { value: 'pdf', label: 'Upload PDF', icon: Upload },
  { value: 'text', label: 'Paste Text', icon: FileText },
  { value: 'topic', label: 'Topic', icon: Lightbulb },
]

export function SourceInput({
  sourceType, onSourceTypeChange,
  sourceContent, onSourceContentChange,
  file, onFileChange,
}: SourceInputProps) {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) onFileChange(acceptedFiles[0])
  }, [onFileChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: sourceType !== 'pdf',
  })

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSourceTypeChange(value)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors',
              sourceType === value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* PDF drop zone */}
      {sourceType === 'pdf' && (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400',
          )}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="h-8 w-8 text-blue-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFileChange(null) }}
                className="ml-4 text-gray-400 hover:text-red-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-gray-700 font-medium">Drop your PDF here, or click to browse</p>
              <p className="text-sm text-gray-500 mt-1">PDF only · Max 20MB</p>
            </div>
          )}
        </div>
      )}

      {/* Paste text */}
      {sourceType === 'text' && (
        <textarea
          className="w-full h-48 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Paste your study material, notes, article, or any text content here..."
          value={sourceContent}
          onChange={(e) => onSourceContentChange(e.target.value)}
        />
      )}

      {/* Topic input */}
      {sourceType === 'topic' && (
        <div className="space-y-2">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='e.g. "Python data structures", "World War II causes", "AWS IAM policies"'
            value={sourceContent}
            onChange={(e) => onSourceContentChange(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Claude will generate questions based on its knowledge of this topic.
          </p>
        </div>
      )}
    </div>
  )
}
