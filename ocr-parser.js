// OCR/Text parser for Teletalk applicant data

class OCRParser {
  async extractTextFromFile(file) {
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
    if (isImage) {
      const ocrRes = await this.performImageOCR(file);
      return ocrRes.text || "";
    }

    const rawText = await file.text();

    if (file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm")) {
      return this.extractTextFromHtml(rawText);
    }

    return rawText;
  }

  async performImageOCR(file) {
    return new Promise((resolve) => {
      if (!file) {
        resolve({ success: false, text: "", error: "No image file provided" });
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          try {
            let extractedText = "";

            if (typeof window !== "undefined" && window.Tesseract) {
              try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                // Resize image to standard resolution for optimal OCR
                const origW = img.naturalWidth || img.width || 1200;
                const origH = img.naturalHeight || img.height || 800;
                const targetW = Math.max(1200, Math.min(origW * 2, 2400));
                const scale = targetW / origW;
                canvas.width = targetW;
                canvas.height = Math.round(origH * scale);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                if (typeof window.Tesseract.createWorker === "function") {
                  try {
                    const worker = await window.Tesseract.createWorker("eng");
                    const res = await worker.recognize(canvas);
                    await worker.terminate();
                    if (res && res.data && res.data.text) {
                      extractedText = res.data.text.trim();
                    }
                  } catch (wErr) {
                    console.warn("createWorker error:", wErr);
                  }
                }

                if (!extractedText && typeof window.Tesseract.recognize === "function") {
                  const res = await window.Tesseract.recognize(canvas, "eng", { workerBlobURL: false });
                  if (res && res.data && res.data.text) {
                    extractedText = res.data.text.trim();
                  }
                }
              } catch (tessErr) {
                console.warn("Tesseract OCR worker error, falling back to canvas OCR:", tessErr);
              }
            }

            if (!extractedText.trim()) {
              extractedText = await this.canvasMrzScan(img);
            }

            resolve({
              success: Boolean(extractedText.trim()),
              text: extractedText.trim(),
            });
          } catch (err) {
            console.error("Image OCR processing error:", err);
            resolve({ success: false, text: "", error: err.message });
          }
        };
        img.onerror = () => resolve({ success: false, text: "", error: "Failed to load image" });
        img.src = e.target.result;
      };
      reader.onerror = () => resolve({ success: false, text: "", error: "Failed to read image file" });
      reader.readAsDataURL(file);
    });
  }

  async canvasMrzScan(img) {
    try {
      const targetWidth = 1400;
      const scale = targetWidth / (img.naturalWidth || img.width || 1400);
      const targetHeight = Math.round((img.naturalHeight || img.height || 900) * scale);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const pixels = imageData.data;

      // Try multiple binarization thresholds (local adaptive + global)
      const thresholds = [120, 140, 160];
      for (const thresh of thresholds) {
        const binary = new Uint8Array(targetWidth * targetHeight);

        // Compute local average for adaptive thresholding
        for (let y = 0; y < targetHeight; y++) {
          const rowOffset = y * targetWidth;
          for (let x = 0; x < targetWidth; x++) {
            const idx = (rowOffset + x) * 4;
            const gray = Math.round(pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114);
            binary[rowOffset + x] = gray < thresh ? 1 : 0;
          }
        }

        // Search specifically in bottom 50% of the image where MRZ resides
        const startScanY = Math.floor(targetHeight * 0.45);
        const rowDensity = new Int32Array(targetHeight);

        for (let y = startScanY; y < targetHeight; y++) {
          let count = 0;
          const rowOffset = y * targetWidth;
          // Focus horizontal scan on middle 90% (exclude outer image borders)
          const startX = Math.floor(targetWidth * 0.05);
          const endX = Math.floor(targetWidth * 0.95);
          for (let x = startX; x < endX; x++) {
            count += binary[rowOffset + x];
          }
          rowDensity[y] = count;
        }

        // Find candidate line bands
        const lineBands = [];
        let inLine = false;
        let startY = 0;
        const minLineHeight = Math.round(12 * scale);
        const maxLineHeight = Math.round(60 * scale);

        for (let y = startScanY; y < targetHeight; y++) {
          // MRZ lines have steady text pixel density across the line
          if (rowDensity[y] > targetWidth * 0.08) {
            if (!inLine) {
              inLine = true;
              startY = y;
            }
          } else {
            if (inLine) {
              inLine = false;
              const h = y - startY;
              if (h >= minLineHeight && h <= maxLineHeight) {
                lineBands.push({ y1: startY, y2: y, h });
              }
            }
          }
        }

        // Process line bands
        const extractedLines = [];
        for (const band of lineBands) {
          const lineText = this.recognizeMonospaceMrzLine(binary, targetWidth, band.y1, band.y2);
          if (lineText && lineText.length >= 25) {
            extractedLines.push(lineText);
          }
        }

        // Check if we found 2 valid MRZ lines
        for (let i = 0; i < extractedLines.length - 1; i++) {
          const l1 = this.cleanAndFixMrzLine1(extractedLines[i]);
          const l2 = this.cleanAndFixMrzLine2(extractedLines[i + 1]);
          if (l1 && l2) {
            return `${l1}\n${l2}`;
          }
        }
      }

      return "";
    } catch (e) {
      console.error("Canvas MRZ scanner error:", e);
      return "";
    }
  }

  recognizeMonospaceMrzLine(binary, width, y1, y2) {
    const h = y2 - y1;
    if (h < 8) return "";

    let minX = width;
    let maxX = 0;
    for (let y = y1; y < y2; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        if (binary[rowOffset + x] === 1) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const lineW = maxX - minX;
    if (lineW < width * 0.35) return "";

    const slotW = lineW / 44;
    let result = "";

    for (let col = 0; col < 44; col++) {
      const x1 = Math.floor(minX + col * slotW);
      const x2 = Math.floor(minX + (col + 1) * slotW);
      const char = this.recognizeMrzGlyphSlot(binary, width, x1, x2, y1, y2);
      result += char;
    }

    return result;
  }

  recognizeMrzGlyphSlot(binary, width, x1, x2, y1, y2) {
    const slotW = x2 - x1;
    const slotH = y2 - y1;
    if (slotW <= 0 || slotH <= 0) return "<";

    let count = 0;
    const total = slotW * slotH;
    for (let y = y1; y < y2; y++) {
      const rowOffset = y * width;
      for (let x = x1; x < x2; x++) {
        count += binary[rowOffset + x];
      }
    }

    const density = count / total;
    // Very low density = filler character '<'
    if (density < 0.06) return "<";

    // Build a 5x5 sub-grid for more detailed shape analysis
    const gridRows = 5;
    const gridCols = 5;
    const grid = new Array(gridRows * gridCols).fill(0);
    const subW = slotW / gridCols;
    const subH = slotH / gridRows;

    for (let y = y1; y < y2; y++) {
      const gy = Math.min(gridRows - 1, Math.floor((y - y1) / subH));
      const rowOffset = y * width;
      for (let x = x1; x < x2; x++) {
        if (binary[rowOffset + x] === 1) {
          const gx = Math.min(gridCols - 1, Math.floor((x - x1) / subW));
          grid[gy * gridCols + gx]++;
        }
      }
    }

    // Normalize grid to percentages
    const norm = grid.map((v) => v / (count || 1));

    // Compute region densities for classification
    const topRow = norm[0] + norm[1] + norm[2] + norm[3] + norm[4];
    const midRow = norm[10] + norm[11] + norm[12] + norm[13] + norm[14];
    const botRow = norm[20] + norm[21] + norm[22] + norm[23] + norm[24];
    const leftCol = norm[0] + norm[5] + norm[10] + norm[15] + norm[20];
    const rightCol = norm[4] + norm[9] + norm[14] + norm[19] + norm[24];
    const centerCol = norm[2] + norm[7] + norm[12] + norm[17] + norm[22];
    const topHalf = topRow + norm[5] + norm[6] + norm[7] + norm[8] + norm[9];
    const botHalf = botRow + norm[15] + norm[16] + norm[17] + norm[18] + norm[19];

    // Vertical symmetry ratio
    const vSym = Math.min(topHalf, botHalf) / (Math.max(topHalf, botHalf) || 0.01);
    // Horizontal symmetry ratio
    const hSym = Math.min(leftCol, rightCol) / (Math.max(leftCol, rightCol) || 0.01);

    // Filler '<' detection: low density, concentrated diagonally
    if (density < 0.15 && midRow > topRow && midRow > botRow) return "<";

    // --- Digit classification ---
    // 0: high density, symmetric, hollow center
    if (density > 0.25 && vSym > 0.6 && hSym > 0.5 && norm[12] < 0.04 && leftCol > 0.15 && rightCol > 0.15) return "0";
    // 1: narrow, center-heavy
    if (density > 0.12 && density < 0.35 && centerCol > 0.4 && leftCol < 0.12 && rightCol < 0.15) return "1";
    // 8: very dense, symmetric top-bottom
    if (density > 0.30 && vSym > 0.7 && hSym > 0.5 && topRow > 0.12 && botRow > 0.12 && midRow > 0.10) return "8";
    // 0 alt: dense ring
    if (density > 0.28 && vSym > 0.65 && hSym > 0.6 && norm[12] < 0.06) return "0";

    // --- Letter classification by shape features ---
    // M: dense, both sides heavy, center dip
    if (density > 0.28 && leftCol > 0.15 && rightCol > 0.15 && norm[2] < norm[0] && norm[2] < norm[4] && topRow > 0.14) return "M";
    // W: dense, bottom heavy with center dip
    if (density > 0.28 && leftCol > 0.12 && rightCol > 0.12 && botRow > topRow && norm[22] < norm[20] && norm[22] < norm[24]) return "W";
    // A: top-heavy triangle, bottom legs
    if (density > 0.20 && topRow > botRow * 0.8 && norm[0] < 0.03 && norm[4] < 0.03 && norm[2] > 0.05 && leftCol > 0.08 && rightCol > 0.08) return "A";

    // Use density ranges and region ratios for rough character guessing
    // This is a heuristic approach - not perfect but better than always returning '<'
    const charMap = [
      { ch: "P", test: () => density > 0.22 && topHalf > botHalf * 1.3 && leftCol > rightCol * 1.2 },
      { ch: "B", test: () => density > 0.28 && leftCol > rightCol && vSym > 0.5 && topRow > 0.10 && botRow > 0.10 },
      { ch: "D", test: () => density > 0.25 && leftCol > rightCol * 1.3 && vSym > 0.55 && hSym < 0.7 },
      { ch: "G", test: () => density > 0.22 && topHalf > botHalf * 0.9 && rightCol < leftCol && botRow > 0.10 },
      { ch: "K", test: () => density > 0.18 && leftCol > 0.18 && rightCol > 0.08 && norm[12] < 0.04 },
      { ch: "L", test: () => density > 0.15 && leftCol > rightCol * 2.0 && botRow > topRow * 1.5 },
      { ch: "S", test: () => density > 0.20 && topRow > 0.08 && botRow > 0.08 && Math.abs(topHalf - botHalf) < 0.15 },
      { ch: "H", test: () => density > 0.22 && leftCol > 0.12 && rightCol > 0.12 && midRow > 0.12 && norm[12] > 0.03 },
      { ch: "N", test: () => density > 0.25 && leftCol > 0.14 && rightCol > 0.14 && density < 0.40 },
      { ch: "E", test: () => density > 0.20 && leftCol > rightCol * 1.5 && topRow > 0.08 && midRow > 0.08 && botRow > 0.08 },
      { ch: "F", test: () => density > 0.18 && leftCol > rightCol * 1.5 && topRow > botRow * 1.3 },
      { ch: "T", test: () => density > 0.15 && topRow > 0.15 && centerCol > 0.30 && leftCol < 0.15 },
      { ch: "C", test: () => density > 0.18 && leftCol > rightCol * 1.4 && vSym > 0.4 },
      { ch: "R", test: () => density > 0.22 && topHalf > botHalf && leftCol > rightCol },
      { ch: "X", test: () => density > 0.18 && norm[0] > 0.04 && norm[4] > 0.04 && norm[20] > 0.04 && norm[24] > 0.04 && norm[12] > 0.04 },
    ];

    for (const entry of charMap) {
      if (entry.test()) return entry.ch;
    }

    return "<";
  }

  cleanAndFixMrzLine1(line) {
    if (!line || line.length < 25) return null;
    let cleaned = line.replace(/[«‹\(\)\[\]\{\}«»—\-_|/\\]/g, "<").replace(/[^A-Z0-9<]/g, "");

    // Trim leading '<' fillers if any
    const pIndex = cleaned.search(/[PIV]/);
    if (pIndex < 0 || pIndex > 10) return null;
    cleaned = cleaned.substring(pIndex);

    if (!cleaned.startsWith("P") && !cleaned.startsWith("I") && !cleaned.startsWith("V")) {
      return null;
    }
    // Must contain '<<' separating Surname and Given Name
    if (!cleaned.includes("<<")) {
      return null;
    }

    const fillerCount = (cleaned.match(/</g) || []).length;
    if (fillerCount < 5) return null;

    return cleaned.padEnd(44, "<").substring(0, 44);
  }

  cleanAndFixMrzLine2(line) {
    if (!line || line.length < 25) return null;
    let cleaned = line.replace(/[«‹\(\)\[\]\{\}«»—\-_|/\\]/g, "<").replace(/[^A-Z0-9<]/g, "");

    // Find position of country code or Passport No
    const pNoMatch = cleaned.match(/([A-Z]\d{7,8}|\d{8,9})/);
    if (!pNoMatch) return null;

    // Line 2 must contain valid digits for DOB and Expiry
    const digitCount = (cleaned.match(/\d/g) || []).length;
    if (digitCount < 12) return null;

    return cleaned.padEnd(44, "<").substring(0, 44);
  }

  extractTextFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return (doc.body && doc.body.innerText) || "";
  }

  parseText(text, teleTalkMapper, propertyDefinitions = []) {
    const sourceText = String(text || "").trim();
    if (!sourceText) {
      return {
        success: false,
        fields: [],
        error: "No OCR text found",
      };
    }

    const aliasEntries = this.buildAliasEntries(teleTalkMapper, propertyDefinitions);
    const lines = sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const fields = [];
    const usedFields = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const entry of aliasEntries) {
        if (usedFields.has(entry.fieldName)) {
          continue;
        }

        const extractedValue = this.extractValueFromLine(line, entry.alias);
        if (extractedValue) {
          fields.push({
            name: entry.alias,
            value: extractedValue,
            sourceField: entry.fieldName,
          });
          usedFields.add(entry.fieldName);
          break;
        }

        if (
          this.normalize(line) === this.normalize(entry.alias) &&
          i + 1 < lines.length &&
          !this.looksLikeKnownLabel(lines[i + 1], aliasEntries)
        ) {
          fields.push({
            name: entry.alias,
            value: lines[i + 1].trim(),
            sourceField: entry.fieldName,
          });
          usedFields.add(entry.fieldName);
          i += 1;
          break;
        }
      }
    }

    return {
      success: fields.length > 0,
      fields,
      error:
        fields.length > 0
          ? null
          : "Could not map any Teletalk properties from the OCR text",
    };
  }

  buildAliasEntries(teleTalkMapper, propertyDefinitions) {
    const entries = [];
    const seen = new Set();
    const mapperEntries =
      teleTalkMapper && teleTalkMapper.fieldMappings
        ? Object.entries(teleTalkMapper.fieldMappings)
        : [];

    for (const [fieldName, aliases] of mapperEntries) {
      for (const alias of aliases) {
        const key = `${fieldName}::${this.normalize(alias)}`;
        if (!alias || seen.has(key)) {
          continue;
        }

        seen.add(key);
        entries.push({ fieldName, alias });
      }
    }

    for (const field of propertyDefinitions) {
      const aliases = [field.label, field.name];
      for (const alias of aliases) {
        const key = `${field.name}::${this.normalize(alias)}`;
        if (!alias || seen.has(key)) {
          continue;
        }

        seen.add(key);
        entries.push({ fieldName: field.name, alias });
      }
    }

    return entries.sort((a, b) => b.alias.length - a.alias.length);
  }

  extractValueFromLine(line, alias) {
    const escapedAlias = this.escapeForRegex(alias);
    const patterns = [
      new RegExp(`^${escapedAlias}\\s*[:\\-–]\\s*(.+)$`, "iu"),
      new RegExp(`^${escapedAlias}\\s{2,}(.+)$`, "iu"),
      new RegExp(`^${escapedAlias}\\s+(.+)$`, "iu"),
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }

    return "";
  }

  looksLikeKnownLabel(line, aliasEntries) {
    const normalizedLine = this.normalize(line);
    return aliasEntries.some((entry) => normalizedLine === this.normalize(entry.alias));
  }

  normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  escapeForRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

const ocrParser = new OCRParser();
