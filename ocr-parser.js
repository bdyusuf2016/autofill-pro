// OCR/Text parser for Teletalk applicant data

class OCRParser {
  async extractTextFromFile(file) {
    const rawText = await file.text();

    if (file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm")) {
      return this.extractTextFromHtml(rawText);
    }

    return rawText;
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
