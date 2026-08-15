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

    // Check if hex string is UTF-16 BE without BOM (e.g. 00 43 00 61...)
    if (bytes.length >= 4 && bytes.length % 2 === 0 && bytes[0] === 0x00 && bytes[2] === 0x00) {
      try {
        const decoded = new TextDecoder("utf-16be").decode(bytes).trim();
        if (decoded && /^[\x20-\x7E\s]+$/.test(decoded)) {
          return decoded;
        }
      } catch (e) {}
    }

    return new TextDecoder("latin1").decode(bytes).trim();
  }

  async extractTextFromPDF(file) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const content = this.decodePdfBytes(bytes);

      const textLines = [];

      // Extract text from stream objects
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      while ((match = streamRegex.exec(content)) !== null) {
        const streamData = match[1];
        const extracted = this.extractTextFromStream(streamData);
        if (extracted) {
          textLines.push(extracted);
        }
      }

      // Also extract plain literal/hex text elements outside streams (e.g. uncompressed Tj/TJ)
      const tjRegex = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
      while ((match = tjRegex.exec(content)) !== null) {
        const decoded = this.decodePdfLiteralString(match[1]);
        if (decoded && !this.isPdfSyntaxNoise(decoded)) {
          textLines.push(decoded);
        }
      }

      const hexTjRegex = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
      while ((match = hexTjRegex.exec(content)) !== null) {
        const decoded = this.decodePdfHexString(match[1]);
        if (decoded && !this.isPdfSyntaxNoise(decoded)) {
          textLines.push(decoded);
        }
      }

      return textLines.join("\n").replace(/\r/g, "");
    } catch (err) {
      console.error("Error extracting text from PDF stream:", err);
      return "";
    }
  }

  extractTextFromStream(streamStr) {
    const lines = [];
    const textOpRegex = /(?:\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>)\s*(?:Tj|'|")/g;
    let match;
    while ((match = textOpRegex.exec(streamStr)) !== null) {
      const str = match[1] ? this.decodePdfLiteralString(match[1]) : this.decodePdfHexString(match[2]);
      if (str && !this.isPdfSyntaxNoise(str)) {
        lines.push(str);
      }
    }

    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(streamStr)) !== null) {
      const arrayContent = match[1];
      const itemRegex = /\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g;
      let itemMatch;
      let segment = "";
      while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
        const str = itemMatch[1] ? this.decodePdfLiteralString(itemMatch[1]) : this.decodePdfHexString(itemMatch[2]);
        segment += str;
      }
      if (segment && !this.isPdfSyntaxNoise(segment)) {
        lines.push(segment);
      }
    }

    return lines.join("\n");
  }

  isPdfSyntaxNoise(text) {
    if (!text || text.length < 2) return true;
    const lower = text.toLowerCase().trim();
    if (lower.startsWith("/author") || lower.startsWith("/creator") || lower.startsWith("/producer") || lower.startsWith("/title")) return true;
    if (lower === "obj" || lower === "endobj" || lower === "stream" || lower === "endstream") return true;
    if (/^\/F\d+$/.test(text) || /^\/DeviceRGB$/.test(text) || /^\/Font$/.test(text)) return true;
    return false;
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

  async extractImagesFromPDF(file) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const images = [];

      // Search for JPEG images (SOI: FF D8 FF, EOI: FF D9)
      let i = 0;
      while (i < bytes.length - 3) {
        if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
          const startIndex = i;
          let endIndex = -1;
          for (let j = startIndex + 3; j < bytes.length - 1; j++) {
            if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
              endIndex = j + 2;
              break;
            }
          }

          if (endIndex > startIndex && (endIndex - startIndex) > 10000) {
            const jpegBytes = bytes.subarray(startIndex, endIndex);
            const blob = new Blob([jpegBytes], { type: "image/jpeg" });
            const imageFile = new File([blob], `extracted_passport_${images.length + 1}.jpg`, {
              type: "image/jpeg",
            });
            images.push(imageFile);
            i = endIndex;
            continue;
          }
        }
        i++;
      }

      return images;
    } catch (err) {
      console.error("Error extracting images from PDF:", err);
      return [];
    }
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


