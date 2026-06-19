"""
Resume parser — extracts plain text from PDF and DOCX files in memory.
The file bytes are never written to disk.
"""

from __future__ import annotations

import io


def parse_resume(file_bytes: bytes, filename: str) -> str:
    """
    Extract plain text from a resume file.

    Supports:
      - .pdf  (via PyMuPDF / fitz)
      - .docx (via python-docx)
      - .txt  (plain text fallback)

    Args:
        file_bytes: Raw bytes of the uploaded file.
        filename:   Original filename (used to detect format).

    Returns:
        Extracted plain text content.

    Raises:
        ValueError: If the file format is not supported.
    """
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    elif lower.endswith(".docx"):
        return _extract_docx(file_bytes)
    elif lower.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(
            f"Unsupported file format: {filename}. "
            "Please upload a PDF, DOCX, or TXT file."
        )


def _extract_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    text_parts: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())

    text = "\n".join(text_parts).strip()
    if not text:
        raise ValueError(
            "Could not extract text from the PDF. "
            "The file may be scanned/image-based. "
            "Please upload a text-based PDF or DOCX instead."
        )
    return text


def _extract_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n".join(paragraphs).strip()
    if not text:
        raise ValueError("Could not extract text from the DOCX file.")
    return text
