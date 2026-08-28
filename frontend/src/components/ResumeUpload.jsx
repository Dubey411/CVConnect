import { useRef, useState } from 'react';
import { FileUp, FileText, Sparkles, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { clearResume } from '../store';

export default function ResumeUpload({ resume, busy, onUpload }) {
  const dispatch = useDispatch();
  const input = useRef();
  const [dragging, setDragging] = useState(false);

  const accept = (file) => file && onUpload(file);

  if (resume) {
    return (
      <div className="panel p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#A8412E] text-[#F5EFE4] font-semibold rounded">
            <FileText size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {resume.original?.contact?.name || 'Resume Uploaded'}
            </p>
            <p className="truncate font-mono text-[10px] text-[#5F6170]">
              {resume.original?.contact?.email || 'Parsed resume ready'} · {Math.round((resume.original?.confidence || 0.95) * 100)}% confidence
            </p>
          </div>
          <Sparkles size={16} className="text-aqua shrink-0" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
          <button
            type="button"
            onClick={() => dispatch(clearResume())}
            className="text-[#5F6170] hover:text-coral transition-colors flex items-center gap-1"
          >
            <X size={13} /> Remove
          </button>
          
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current.click()}
            className="text-[#A8412E] hover:text-[#8F3423] transition-colors flex items-center gap-1 font-medium"
          >
            <Plus size={13} /> Upload Another Resume
          </button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={e => accept(e.target.files[0])}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]); }}
      className={`group border border-dashed p-7 text-center transition ${dragging ? 'border-aqua bg-aqua/10' : 'border-line bg-[#F5EFE4]/80 rounded-xl border-[#2B2D42]/16 hover:border-[#A8412E]'}`}
    >
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={e => accept(e.target.files[0])}
      />
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center border border-line bg-ink group-hover:border-aqua">
        <FileUp className="text-aqua" size={21} />
      </div>
      <p className="text-sm font-semibold">Drop your resume here</p>
      <p className="mt-1 text-xs text-[#5F6170]">PDF or DOCX · 10 MB maximum</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current.click()}
        className="button-primary mt-5 disabled:opacity-50"
      >
        {busy ? 'Parsing…' : 'Choose file'}
      </button>
    </motion.div>
  );
}
