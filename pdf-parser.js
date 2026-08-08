// PDF Parser - Extract fields from fillable PDF forms without remote libraries

class PDFParser {
  async parsePDF(file) {
    try {
      console.log("Starting PDF parse:", file.name);

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const content = this.decodePdfBytes(bytes);
      const objects = this.extractObjects(content);
      const fields = this.extractFields(objects);

      console.log("Extracted fields:", fields);

      return {
        success: true,
        fileName: file.name,
        fields,
        pageCount: this.estimatePageCount(content),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("PDF parsing error:", error);
      return {
        success: false,
        error: error.message,
        fileName: file && file.name ? file.name : "unknown.pdf",
      };
    }
  }

  decodePdfBytes(bytes) {
    return new TextDecoder("latin1").decode(bytes);
  }

  extractObjects(content) {
    const objectRegex = /(\d+\s+\d+)\s+obj([\s\S]*?)endobj/g;
    const objects = new Map();
    let match;

    while ((match = objectRegex.exec(content)) !== null) {
      objects.set(match[1].trim(), match[2]);
    }

    return objects;
  }

  extractFields(objects) {
    const fields = [];
    const seen = new Set();

    for (const [objectId, objectContent] of objects.entries()) {
      if (!this.looksLikeFormField(objectContent)) {
        continue;
      }

      const fieldName =
        this.getValueFromObject(objects, objectContent, "T") ||
        this.getValueFromObject(objects, objectContent, "TU");
      const value =
        this.getValueFromObject(objects, objectContent, "V") ||
        this.getValueFromObject(objects, objectContent, "DV");

      if (!fieldName || !value) {
        continue;
      }

      const normalizedName = fieldName.trim();
      const normalizedValue = value.trim();
      if (!normalizedName || !normalizedValue) {
        continue;
      }

      const dedupeKey = `${normalizedName}::${normalizedValue}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      fields.push({
        name: normalizedName,
        value: normalizedValue,
        type: this.getFieldType(objectContent),
        page: this.getApproximatePageNumber(objectId, objectContent),
      });
    }

    if (fields.length > 0) {
      return fields;
    }

    return this.extractFieldsFromWholeDocument(objects);
  }

  looksLikeFormField(objectContent) {
    return (
      /\/Subtype\s*\/Widget\b/.test(objectContent) ||
      /\/FT\s*\/(?:Tx|Btn|Ch|Sig)\b/.test(objectContent) ||
      /\/T\s*(?:\(|<)/.test(objectContent)
    );
  }

  getFieldType(objectContent) {
    const match = objectContent.match(/\/FT\s*\/([A-Za-z]+)/);
    const type = match ? match[1] : "Tx";

    switch (type) {
      case "Btn":
        return "button";
      case "Ch":
        return "select";
      case "Sig":
        return "signature";
      default:
        return "text";
    }
  }

  getApproximatePageNumber(objectId, objectContent) {
    const source = `${objectId} ${objectContent}`;
    const match = source.match(/\/StructParent\s+(\d+)/);
    return match ? Number(match[1]) + 1 : 1;
  }

  getValueFromObject(objects, objectContent, key, visited = new Set()) {
    const directValue = this.extractPdfValue(objectContent, key);
    if (directValue) {
      return directValue;
    }

    const parentRef = this.extractReference(objectContent, "Parent");
    if (!parentRef || visited.has(parentRef)) {
      return "";
    }

    visited.add(parentRef);
    const parentObject = objects.get(parentRef);
    if (!parentObject) {
      return "";
    }

    return this.getValueFromObject(objects, parentObject, key, visited);
  }

  extractReference(objectContent, key) {
    const pattern = new RegExp(`/${key}\\s+(\\d+\\s+\\d+)\\s+R`);
    const match = objectContent.match(pattern);
    return match ? match[1].trim() : "";
  }

  extractPdfValue(objectContent, key) {
    const literalMatch = objectContent.match(
      new RegExp(`/${key}\\s*\\(((?:\\\\.|[^\\\\)])*)\\)`)
    );
    if (literalMatch) {
      return this.decodePdfLiteralString(literalMatch[1]);
    }

    const hexMatch = objectContent.match(new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]+)>`));
    if (hexMatch) {
      return this.decodePdfHexString(hexMatch[1]);
    }

    const nameMatch = objectContent.match(
      new RegExp(`/${key}\\s*/([^/\\s<>()[\\]]+)`)
    );
    if (nameMatch) {
      return this.decodePdfName(nameMatch[1]);
    }

    return "";
  }

  decodePdfLiteralString(value) {
    const decoded = value
      .replace(/\\([()\\])/g, "$1")
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\b/g, "\b")
      .replace(/\\f/g, "\f")
      .replace(/\\([0-7]{1,3})/g, (_, octal) =>
        String.fromCharCode(parseInt(octal, 8))
      );

    return decoded.replace(/\s+/g, " ").trim();
  }

  decodePdfHexString(hexValue) {
    const cleaned = hexValue.replace(/\s+/g, "");
    if (!cleaned) {
      return "";
    }

    const normalized = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`;
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < normalized.length; i += 2) {
      bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
    }

    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be").decode(bytes.slice(2)).trim();
    }

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le").decode(bytes.slice(2)).trim();
    }

    return new TextDecoder("latin1").decode(bytes).trim();
  }

  decodePdfName(name) {
    return name
      .replace(/#([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/_/g, " ")
      .trim();
  }

  extractFieldsFromWholeDocument(objects) {
    const fields = [];
    const seen = new Set();
    const allContent = Array.from(objects.values()).join("\n");
    const pairRegex =
      /\/T\s*(?:\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>)\s*[\s\S]{0,400}?\/V\s*(?:\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>|\/([^/\s<>()[\]]+))/g;
    let match;

    while ((match = pairRegex.exec(allContent)) !== null) {
      const name = match[1]
        ? this.decodePdfLiteralString(match[1])
        : this.decodePdfHexString(match[2]);
      const value = match[3]
        ? this.decodePdfLiteralString(match[3])
        : match[4]
          ? this.decodePdfHexString(match[4])
          : this.decodePdfName(match[5] || "");

      if (!name || !value) {
        continue;
      }

      const dedupeKey = `${name}::${value}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      fields.push({
        name: name.trim(),
        value: value.trim(),
        type: "text",
        page: 1,
      });
    }

    return fields;
  }

  estimatePageCount(content) {
    const matches = content.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 1;
  }

  isValidPDF(file) {
    if (!file) return false;
    return (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  getFileSizeMB(file) {
    return (file.size / (1024 * 1024)).toFixed(2);
  }
}

const pdfParser = new PDFParser();

